import { useEffect, useMemo, useState } from "react";
import { pickText } from "../../lib/i18n";
import { useKanbanStore } from "../../stores/kanbanStore";
import { useSettingsStore } from "../../stores/settingsStore";

export function KanbanModule() {
  const {
    columns,
    cards,
    selectedCardId,
    load,
    createCard,
    moveCard,
    updateCard,
    deleteCard,
    resolveConflict,
    selectCard
  } = useKanbanStore();
  const language = useSettingsStore((state) => state.settings.language);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [newCardDescription, setNewCardDescription] = useState("");
  const [newCardColumnId, setNewCardColumnId] = useState("");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftDueDate, setDraftDueDate] = useState("");

  useEffect(() => {
    void load(language);
  }, [language, load]);

  useEffect(() => {
    if (!newCardColumnId && columns[0]?.id) {
      setNewCardColumnId(columns[0].id);
    }
  }, [columns, newCardColumnId]);

  const selectedCard = cards.find((card) => card.id === selectedCardId) ?? null;

  useEffect(() => {
    setDraftTitle(selectedCard?.title ?? "");
    setDraftDescription(selectedCard?.description ?? "");
    setDraftDueDate(selectedCard?.dueDate ?? "");
  }, [selectedCard?.description, selectedCard?.dueDate, selectedCard?.id, selectedCard?.title]);

  const columnCardCounts = useMemo(
    () => Object.fromEntries(columns.map((column) => [column.id, cards.filter((card) => card.columnId === column.id).length])),
    [cards, columns]
  );

  return (
    <div className="kanban-shell">
      <div className="section-header">
        <div>
          <div className="section-title">
            {pickText(language, { "zh-CN": "项目看板", "en-US": "Project Board" })}
          </div>
          <div className="section-meta">
            {pickText(language, {
              "zh-CN": "实时展示 Gateway 返回的列与卡片，并支持跨列同步、冲突处理和基础编辑。",
              "en-US": "Shows live board data from the Gateway with cross-column sync, conflict handling, and editing."
            })}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <span>{pickText(language, { "zh-CN": "快速新建卡片", "en-US": "Quick Create Card" })}</span>
        </div>
        <div className="detail-grid">
          <input
            className="text-input"
            value={newCardTitle}
            onChange={(event) => setNewCardTitle(event.target.value)}
            placeholder={pickText(language, { "zh-CN": "卡片标题", "en-US": "Card title" })}
          />
          <select
            className="text-input"
            value={newCardColumnId}
            onChange={(event) => setNewCardColumnId(event.target.value)}
          >
            {columns.map((column) => (
              <option key={column.id} value={column.id}>
                {column.title}
              </option>
            ))}
          </select>
          <textarea
            className="composer-input detail-span-2"
            value={newCardDescription}
            onChange={(event) => setNewCardDescription(event.target.value)}
            placeholder={pickText(language, { "zh-CN": "卡片描述", "en-US": "Card description" })}
          />
        </div>
        <div className="composer-actions">
          <div />
          <button
            className="primary-button"
            onClick={() => {
              if (!newCardTitle.trim() || !newCardColumnId) return;
              void createCard(newCardColumnId, newCardTitle.trim(), newCardDescription.trim());
              setNewCardTitle("");
              setNewCardDescription("");
            }}
          >
            {pickText(language, { "zh-CN": "创建卡片", "en-US": "Create Card" })}
          </button>
        </div>
      </div>

      <div className="kanban-board">
        {columns.map((column) => (
          <div key={column.id} className="kanban-column">
            <div className="kanban-column-header" style={{ borderColor: column.color }}>
              <span>{column.title}</span>
              <span>{columnCardCounts[column.id]}</span>
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
                        {card.labels[0]?.name ?? pickText(language, { "zh-CN": "未分类", "en-US": "General" })}
                      </span>
                      <span className={`badge badge-${card.syncStatus}`}>
                        {card.syncStatus === "syncing"
                          ? pickText(language, { "zh-CN": "同步中", "en-US": "Syncing" })
                          : card.syncStatus === "error"
                            ? pickText(language, { "zh-CN": "冲突", "en-US": "Conflict" })
                            : pickText(language, { "zh-CN": "已同步", "en-US": "Synced" })}
                      </span>
                    </div>

                    <div className="kanban-card-title">{card.title}</div>
                    <div className="kanban-card-desc">{card.description || "-"}</div>

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
                              "zh-CN": `移动到 ${target.title}`,
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
            <div className="section-header">
              <div className="section-title">{selectedCard.title}</div>
              <button className="ghost-button danger" onClick={() => void deleteCard(selectedCard.id)}>
                {pickText(language, { "zh-CN": "删除卡片", "en-US": "Delete Card" })}
              </button>
            </div>
            <div className="detail-grid">
              <div>
                <div className="label">{pickText(language, { "zh-CN": "标题", "en-US": "Title" })}</div>
                <input
                  className="text-input"
                  value={draftTitle}
                  onChange={(event) => setDraftTitle(event.target.value)}
                />
              </div>
              <div>
                <div className="label">{pickText(language, { "zh-CN": "截止日期", "en-US": "Due Date" })}</div>
                <input
                  className="text-input"
                  type="date"
                  value={draftDueDate}
                  onChange={(event) => setDraftDueDate(event.target.value)}
                />
              </div>
              <div>
                <div className="label">{pickText(language, { "zh-CN": "负责人", "en-US": "Assignee" })}</div>
                <p>{selectedCard.assignee ?? pickText(language, { "zh-CN": "未分配", "en-US": "Unassigned" })}</p>
              </div>
              <div>
                <div className="label">{pickText(language, { "zh-CN": "评论数", "en-US": "Comments" })}</div>
                <p>{selectedCard.comments}</p>
              </div>
              <div className="detail-span-2">
                <div className="label">{pickText(language, { "zh-CN": "描述", "en-US": "Description" })}</div>
                <textarea
                  className="composer-input"
                  value={draftDescription}
                  onChange={(event) => setDraftDescription(event.target.value)}
                />
              </div>
            </div>
            <div className="composer-actions">
              <div className="mention-tags">
                {selectedCard.syncStatus === "error" && (
                  <>
                    <button className="ghost-button" onClick={() => void resolveConflict(selectedCard.id, "server")}>
                      {pickText(language, { "zh-CN": "采用服务端版本", "en-US": "Use Server Version" })}
                    </button>
                    <button
                      className="ghost-button"
                      onClick={() =>
                        void resolveConflict(selectedCard.id, "merge", {
                          title: draftTitle,
                          description: draftDescription
                        })
                      }
                    >
                      {pickText(language, { "zh-CN": "合并当前草稿", "en-US": "Merge Current Draft" })}
                    </button>
                  </>
                )}
              </div>
              <button
                className="primary-button"
                onClick={() =>
                  void updateCard(selectedCard.id, {
                    title: draftTitle,
                    description: draftDescription,
                    dueDate: draftDueDate || undefined
                  })
                }
              >
                {pickText(language, { "zh-CN": "保存修改", "en-US": "Save Changes" })}
              </button>
            </div>
          </>
        ) : (
          <div className="empty-state small">
            {pickText(language, {
              "zh-CN": "选择一张卡片查看和编辑详情。",
              "en-US": "Select a card to inspect and edit its details."
            })}
          </div>
        )}
      </div>
    </div>
  );
}
