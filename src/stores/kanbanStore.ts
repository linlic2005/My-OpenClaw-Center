import { create } from "zustand";
import { kanbanService } from "../services/KanbanService";
import type { AppLanguage } from "../lib/i18n";
import type { KanbanCard, KanbanColumn } from "../types";

interface KanbanStore {
  columns: KanbanColumn[];
  cards: KanbanCard[];
  selectedCardId: string | null;
  load: (language?: AppLanguage) => Promise<void>;
  moveCard: (cardId: string, targetColumnId: string) => Promise<void>;
  selectCard: (cardId: string | null) => void;
}

export const useKanbanStore = create<KanbanStore>((set) => ({
  columns: [],
  cards: [],
  selectedCardId: null,
  async load(language) {
    if (language) kanbanService.setLanguage(language);
    const board = await kanbanService.getBoard();
    set(board);
  },
  async moveCard(cardId, targetColumnId) {
    set((state) => ({
      cards: state.cards.map((card) =>
        card.id === cardId ? { ...card, columnId: targetColumnId, syncStatus: "syncing" } : card
      )
    }));
    await kanbanService.moveCard(cardId, targetColumnId);
    const board = await kanbanService.getBoard();
    set(board);
  },
  selectCard(cardId) {
    set({ selectedCardId: cardId });
  }
}));
