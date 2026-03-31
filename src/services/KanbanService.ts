import type { AppLanguage } from "../lib/i18n";
import { gatewayService, GatewayRequestError } from "./GatewayService";
import type { KanbanCard, KanbanColumn, KanbanLabel } from "../types";

interface BoardSnapshot {
  columns: KanbanColumn[];
  cards: KanbanCard[];
}

type BoardListener = (snapshot: BoardSnapshot) => void;

function normalizeLabels(raw: unknown): KanbanLabel[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((label, index) => {
    const record = typeof label === "object" && label !== null ? (label as Record<string, unknown>) : {};
    return {
      id: String(record.id ?? `label_${index}`),
      name: String(record.name ?? "Label"),
      color: String(record.color ?? "#64748b")
    };
  });
}

function normalizeDueDate(value: unknown): string | undefined {
  if (typeof value === "number") {
    return new Date(value).toISOString().slice(0, 10);
  }
  if (typeof value === "string" && value.trim()) return value;
  return undefined;
}

function normalizeCard(raw: unknown): KanbanCard {
  const record = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  return {
    id: String(record.id ?? `card_${Math.random().toString(36).slice(2, 8)}`),
    columnId: String(record.columnId ?? "todo"),
    title: String(record.title ?? "Untitled"),
    description: String(record.description ?? ""),
    order: Number(record.order ?? 0),
    dueDate: normalizeDueDate(record.dueDate),
    assignee: typeof record.assignee === "string" ? record.assignee : undefined,
    labels: normalizeLabels(record.labels),
    comments: Number(record.comments ?? 0),
    syncStatus: "idle",
    version: Number(record.version ?? 0),
    createdAt: Number(record.createdAt ?? 0),
    updatedAt: Number(record.updatedAt ?? 0)
  };
}

function normalizeColumn(raw: unknown): KanbanColumn {
  const record = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  return {
    id: String(record.id ?? `column_${Math.random().toString(36).slice(2, 8)}`),
    title: String(record.title ?? "Column"),
    color: String(record.color ?? "#64748b"),
    order: Number(record.order ?? 0)
  };
}

class KanbanService {
  private language: AppLanguage = "zh-CN";
  private columns: KanbanColumn[] = [];
  private cards: KanbanCard[] = [];
  private listeners = new Set<BoardListener>();

  constructor() {
    this.bindGatewayEvents();
  }

  subscribe(listener: BoardListener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => this.listeners.delete(listener);
  }

  setLanguage(language: AppLanguage): void {
    this.language = language;
  }

  getSnapshot(): BoardSnapshot {
    return {
      columns: [...this.columns].sort((a, b) => a.order - b.order),
      cards: [...this.cards].sort((a, b) => a.order - b.order)
    };
  }

  async getBoard(): Promise<BoardSnapshot> {
    const payload = await gatewayService.send<{
      columns?: unknown[];
      cards?: unknown[];
    }>("kanban.get_board", {});

    this.columns = Array.isArray(payload.columns) ? payload.columns.map(normalizeColumn) : [];
    this.cards = Array.isArray(payload.cards) ? payload.cards.map(normalizeCard) : [];
    this.emit();
    return this.getSnapshot();
  }

  async moveCard(cardId: string, targetColumnId: string): Promise<void> {
    const card = this.cards.find((item) => item.id === cardId);
    if (!card) return;

    const fromColumnId = card.columnId;
    const toIndex = this.cards.filter((item) => item.columnId === targetColumnId).length;

    this.cards = this.cards.map((item) =>
      item.id === cardId
        ? { ...item, columnId: targetColumnId, order: toIndex, syncStatus: "syncing" }
        : item
    );
    this.emit();

    try {
      const payload = await gatewayService.send<Record<string, unknown>>("kanban.move_card", {
        cardId,
        fromColumnId,
        toColumnId: targetColumnId,
        toIndex,
        version: card.version ?? Date.now()
      });

      this.cards = this.cards.map((item) =>
        item.id === cardId
          ? {
              ...item,
              syncStatus: "idle",
              version: Number(payload.newVersion ?? item.version ?? Date.now())
            }
          : item
      );
      this.emit();
    } catch (error) {
      if (error instanceof GatewayRequestError && error.code === 409) {
        const payload =
          typeof error.payload === "object" && error.payload !== null
            ? (error.payload as Record<string, unknown>)
            : {};
        const serverState =
          typeof payload.serverState === "object" && payload.serverState !== null
            ? normalizeCard(payload.serverState)
            : null;

        this.cards = this.cards.map((item) =>
          item.id === cardId
            ? serverState
              ? { ...serverState, syncStatus: "error" }
              : { ...item, columnId: fromColumnId, syncStatus: "error" }
            : item
        );
        this.emit();
        return;
      }

      this.cards = this.cards.map((item) =>
        item.id === cardId ? { ...item, columnId: fromColumnId, syncStatus: "error" } : item
      );
      this.emit();
    }
  }

  private bindGatewayEvents(): void {
    gatewayService.on<{ card?: unknown }>("kanban.card_created", ({ payload }) => {
      if (!payload.card) return;
      const card = normalizeCard(payload.card);
      this.cards = [...this.cards.filter((item) => item.id !== card.id), { ...card, syncStatus: "idle" }];
      this.emit();
    });

    gatewayService.on<{
      cardId?: unknown;
      toColumnId?: unknown;
      toIndex?: unknown;
      version?: unknown;
    }>("kanban.card_moved", ({ payload }) => {
      const cardId = String(payload.cardId ?? "");
      if (!cardId) return;
      this.cards = this.cards.map((item) =>
        item.id === cardId
          ? {
              ...item,
              columnId: String(payload.toColumnId ?? item.columnId),
              order: Number(payload.toIndex ?? item.order),
              version: Number(payload.version ?? item.version ?? 0),
              syncStatus: "idle"
            }
          : item
      );
      this.emit();
    });

    gatewayService.on<{ cardId?: unknown; serverState?: unknown }>("kanban.conflict", ({ payload }) => {
      const cardId = String(payload.cardId ?? "");
      if (!cardId) return;

      const serverState =
        typeof payload.serverState === "object" && payload.serverState !== null
          ? normalizeCard(payload.serverState)
          : null;

      this.cards = this.cards.map((item) =>
        item.id === cardId
          ? serverState
            ? { ...serverState, syncStatus: "error" }
            : { ...item, syncStatus: "error" }
          : item
      );
      this.emit();
    });
  }

  private emit(): void {
    const snapshot = this.getSnapshot();
    this.listeners.forEach((listener) => listener(snapshot));
  }
}

export const kanbanService = new KanbanService();
