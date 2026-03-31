import { getMockCards, getMockColumns } from "../data/mock";
import type { AppLanguage } from "../lib/i18n";
import { sleep } from "../lib/utils";
import { gatewayService } from "./GatewayService";
import type { KanbanCard, KanbanColumn } from "../types";

class KanbanService {
  private language: AppLanguage = "zh-CN";
  private columns: KanbanColumn[] = [];
  private cards: KanbanCard[] = [];

  constructor() {
    this.reset();
  }

  setLanguage(language: AppLanguage): void {
    if (this.language === language) return;
    this.language = language;
    this.reset();
  }

  private reset(): void {
    this.columns = getMockColumns(this.language);
    this.cards = getMockCards(this.language);
  }

  async getBoard(): Promise<{ columns: KanbanColumn[]; cards: KanbanCard[] }> {
    await sleep(220);
    return { columns: [...this.columns], cards: [...this.cards] };
  }

  async moveCard(cardId: string, targetColumnId: string): Promise<void> {
    this.cards = this.cards.map((card) =>
      card.id === cardId ? { ...card, columnId: targetColumnId, syncStatus: "syncing" } : card
    );
    await gatewayService.send("kanban.move_card", { cardId, targetColumnId });
    await sleep(240);
    this.cards = this.cards.map((card) =>
      card.id === cardId ? { ...card, syncStatus: "idle" } : card
    );
  }
}

export const kanbanService = new KanbanService();
