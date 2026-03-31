import { useEffect, useMemo } from "react";
import { pickText } from "../../lib/i18n";
import { useSettingsStore } from "../../stores/settingsStore";
import { useStudioStore } from "../../stores/studioStore";

export function StudioModule() {
  const { agents, load } = useStudioStore();
  const language = useSettingsStore((state) => state.settings.language);

  const sceneMap = useMemo(
    () => ({
      idle: pickText(language, { "zh-CN": "🛋 休息区", "en-US": "🛋 Lounge" }),
      writing: pickText(language, { "zh-CN": "💻 写作工位", "en-US": "💻 Writing Desk" }),
      researching: pickText(language, { "zh-CN": "🔍 检索工位", "en-US": "🔍 Research Desk" }),
      executing: pickText(language, { "zh-CN": "⚙️ 执行工位", "en-US": "⚙️ Execution Desk" }),
      syncing: pickText(language, { "zh-CN": "🔄 同步工位", "en-US": "🔄 Sync Desk" }),
      error: pickText(language, { "zh-CN": "🐛 Bug 区", "en-US": "🐛 Bug Zone" })
    }),
    [language]
  );

  useEffect(() => {
    void load(language);
  }, [language, load]);

  return (
    <div className="studio-shell">
      <div className="studio-hero">
        <div>
          <div className="section-title">
            {pickText(language, { "zh-CN": "Studio 工作室", "en-US": "Studio Workspace" })}
          </div>
          <div className="section-meta">
            {pickText(language, {
              "zh-CN": "像素风状态总览，映射 OpenClaw Agent 的实时工作状态",
              "en-US": "Pixel-style overview mapped to live OpenClaw agent activity"
            })}
          </div>
        </div>
        <div className="badge badge-success">
          {pickText(language, {
            "zh-CN": "Flask iframe 接入预留",
            "en-US": "Flask iframe integration ready"
          })}
        </div>
      </div>

      <div className="studio-room">
        {agents.map((agent) => (
          <article key={agent.id} className={`studio-card studio-${agent.status}`}>
            <div className="studio-card-top">
              <div>
                <div className="list-title">{agent.name}</div>
                <div className="list-meta">{sceneMap[agent.status]}</div>
              </div>
              <span className="badge">{agent.locale}</span>
            </div>
            <div className="studio-avatar">{sceneMap[agent.status].split(" ")[0]}</div>
            <p className="studio-task">{agent.taskDescription}</p>
            <div className="list-meta">
              {pickText(language, {
                "zh-CN": `更新时间 ${agent.lastUpdated}`,
                "en-US": `Updated ${agent.lastUpdated}`
              })}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
