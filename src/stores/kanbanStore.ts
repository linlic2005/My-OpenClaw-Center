import { create } from "zustand";
import { kanbanService } from "../services/KanbanService";
import type { AppLanguage } from "../lib/i18n";
import type { KanbanCard, KanbanColumn } from "../types";

interface KanbanStore {
  columns: KanbanColumn[];
  cards: KanbanCard[];
  selectedCardId: string | null;
  initialized: boolean;
  load: (language?: AppLanguage) => Promise<void>;
  createCard: (columnId: string, title: string, description?: string) => Promise<void>;
  moveCard: (cardId: string, targetColumnId: string) => Promise<void>;
  updateCard: (
    cardId: string,
    updates: Partial<Pick<KanbanCard, "title" | "description" | "dueDate">>
  ) => Promise<void>;
  deleteCard: (cardId: string) => Promise<void>;
  resolveConflict: (
    cardId: string,
    resolution: "client" | "server" | "merge",
    mergedState?: Partial<Pick<KanbanCard, "title" | "description">>
  ) => Promise<void>;
  selectCard: (cardId: string | null) => void;
}

let kanbanUnsubscribe: (() => void) | null = null;

export const useKanbanStore = create<KanbanStore>((set, get) => ({
  columns: [],
  cards: [],
  selectedCardId: null,
  initialized: false,
  async load(language) {
    if (language) kanbanService.setLanguage(language);
    if (!get().initialized) {
      kanbanUnsubscribe?.();
      kanbanUnsubscribe = kanbanService.subscribe((snapshot) => {
        set((state) => ({
          columns: snapshot.columns,
          cards: snapshot.cards,
          selectedCardId:
            state.selectedCardId && snapshot.cards.some((card) => card.id === state.selectedCardId)
              ? state.selectedCardId
              : snapshot.cards[0]?.id ?? null
        }));
      });
      set({ initialized: true });
    }

    await kanbanService.getBoard();
  },
  async createCard(columnId, title, description) {
    await kanbanService.createCard(columnId, title, description);
  },
  async moveCard(cardId, targetColumnId) {
    await kanbanService.moveCard(cardId, targetColumnId);
  },
  async updateCard(cardId, updates) {
    await kanbanService.updateCard(cardId, updates);
  },
  async deleteCard(cardId) {
    await kanbanService.deleteCard(cardId);
    set((state) => ({
      selectedCardId: state.selectedCardId === cardId ? null : state.selectedCardId
    }));
  },
  async resolveConflict(cardId, resolution, mergedState) {
    await kanbanService.resolveConflict(cardId, resolution, mergedState);
  },
  selectCard(cardId) {
    set({ selectedCardId: cardId });
  }
}));
