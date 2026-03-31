import { useEffect } from "react";
import { pickText } from "../../lib/i18n";
import { useKanbanStore } from "../../stores/kanbanStore";
import { useSettingsStore } from "../../stores/settingsStore";

export function KanbanModule() {
  const { columns, cards, selectedCardId, load, moveCard, selectCard } = useKanbanStore();
  const language = useSettingsStore((state) => state.settings.language);

  useEffect(() => {
    void load(language);
  }, [language, load]);

  const selectedCard = cards.find((card) => card.id === selectedCardId) ?? null;

  return (
    <div className="kanban-shell">
      <div className="section-header">
        <div>
          <div className="section-title">
            {pickText(language, { "zh-CN": "项目看板", "en-US": "Project Board" })}
          </div>
          <div className="section-meta">
            {pickText(language, {
              "zh-CN": "支持跨列同步、冲突提示和离线补发",
              "en-US": "Supports cross-column sync, conflict feedback, and offline replay"
            })}
          </div>
        </div>
      </div>
      <div className="kanban-board">
        {columns.map((column) => (
          <div key={column.id} className="kanban-column">
            <div className="kanban-column-header" style={{ borderColor: column.color }}>
              <span>{column.title}</span>
              <span>{cards.filter((card) => card.columnId === column.id).length}</span>
            </div>
            <div className="kanban-cards">
              {cards
                .filter((card) => card.columnId === column.id)
                .map((card) => (
                  <button
                    key={card.id}
                    className={`kanban-card ${selectedCardId === card.id ? "kanban-card-active" : ""}`}
                    onClick={() => selectCard(card.id)}
                  >
                    <div className="kanban-card-top">
                      <span className="badge" style={{ backgroundColor: card.labels[0]?.color }}>
                        {card.labels[0]?.name}
                      </span>
                      <span>{card.syncStatus === "syncing" ? "🔄" : "✓"}</span>
                    </div>
                    <div className="kanban-card-title">{card.title}</div>
                    <div className="kanban-card-desc">{card.description}</div>
                    <div className="kanban-card-actions">
                      {columns
                        .filter((item) => item.id !== column.id)
                        .map((target) => (
                          <span
                            key={target.id}
                            className="link-chip"
                            onClick={(event) => {
                              event.stopPropagation();
                              void moveCard(card.id, target.id);
                            }}
                          >
                            {pickText(language, {
                              "zh-CN": `移到${target.title}`,
                              "en-US": `Move to ${target.title}`
                            })}
                          </span>
                        ))}
                    </div>
                  </button>
                ))}
            </div>
          </div>
        ))}
      </div>

      <div className="detail-panel">
        {selectedCard ? (
          <>
            <div className="section-title">{selectedCard.title}</div>
            <div className="detail-grid">
              <div>
                <div className="label">{pickText(language, { "zh-CN": "描述", "en-US": "Description" })}</div>
                <p>{selectedCard.description}</p>
              </div>
              <div>
                <div className="label">{pickText(language, { "zh-CN": "截止日期", "en-US": "Due Date" })}</div>
                <p>{selectedCard.dueDate ?? pickText(language, { "zh-CN": "未设置", "en-US": "Not set" })}</p>
              </div>
              <div>
                <div className="label">{pickText(language, { "zh-CN": "负责人", "en-US": "Assignee" })}</div>
                <p>{selectedCard.assignee ?? pickText(language, { "zh-CN": "未分配", "en-US": "Unassigned" })}</p>
              </div>
              <div>
                <div className="label">{pickText(language, { "zh-CN": "评论数", "en-US": "Comments" })}</div>
                <p>{selectedCard.comments}</p>
              </div>
            </div>
          </>
        ) : (
          <div className="empty-state small">
            {pickText(language, {
              "zh-CN": "选择一张卡片查看详情",
              "en-US": "Select a card to view details"
            })}
          </div>
        )}
      </div>
    </div>
  );
}
