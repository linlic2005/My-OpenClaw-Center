import { useEffect, useMemo } from "react";
import { pickText } from "../../lib/i18n";
import { useSettingsStore } from "../../stores/settingsStore";
import { useStudioStore } from "../../stores/studioStore";

const zoneMap = {
  idle: "lounge",
  writing: "writing",
  researching: "research",
  executing: "execute",
  syncing: "sync",
  error: "bug"
} as const;

const zoneOrder = ["lounge", "writing", "research", "execute", "sync", "bug"] as const;

type ZoneKey = (typeof zoneOrder)[number];

export function StudioModule() {
  const { agents, load } = useStudioStore();
  const language = useSettingsStore((state) => state.settings.language);

  useEffect(() => {
    void load(language);
  }, [language, load]);

  const sceneMap = useMemo(
    () => ({
      idle: pickText(language, { "zh-CN": "休息区", "en-US": "Lounge" }),
      writing: pickText(language, { "zh-CN": "写作工位", "en-US": "Writing Desk" }),
      researching: pickText(language, { "zh-CN": "检索工位", "en-US": "Research Desk" }),
      executing: pickText(language, { "zh-CN": "执行工位", "en-US": "Execution Desk" }),
      syncing: pickText(language, { "zh-CN": "同步工位", "en-US": "Sync Desk" }),
      error: pickText(language, { "zh-CN": "Bug 区", "en-US": "Bug Zone" })
    }),
    [language]
  );

  const zoneTitle = useMemo(
    () =>
      ({
        lounge: pickText(language, { "zh-CN": "休息区", "en-US": "Lounge" }),
        writing: pickText(language, { "zh-CN": "写作位", "en-US": "Writing" }),
        research: pickText(language, { "zh-CN": "检索位", "en-US": "Research" }),
        execute: pickText(language, { "zh-CN": "执行位", "en-US": "Execute" }),
        sync: pickText(language, { "zh-CN": "同步站", "en-US": "Sync" }),
        bug: pickText(language, { "zh-CN": "Bug 区", "en-US": "Bug Zone" })
      }) satisfies Record<ZoneKey, string>,
    [language]
  );

  const zoneHint = useMemo(
    () =>
      ({
        lounge: pickText(language, {
          "zh-CN": "待命或刚完成任务的 Agent 会回到沙发区。",
          "en-US": "Idle or finished agents return to the sofa corner."
        }),
        writing: pickText(language, {
          "zh-CN": "写文档、写代码时停留在这里。",
          "en-US": "Writing tasks settle into this desk."
        }),
        research: pickText(language, {
          "zh-CN": "调研和搜索时会占用检索屏幕。",
          "en-US": "Research and search tasks use this terminal."
        }),
        execute: pickText(language, {
          "zh-CN": "命令执行与操作任务集中在主工位。",
          "en-US": "Command-heavy work stays on the main rig."
        }),
        sync: pickText(language, {
          "zh-CN": "同步与推送动作会跑到数据站。",
          "en-US": "Sync and push work moves to the data dock."
        }),
        bug: pickText(language, {
          "zh-CN": "异常排查会亮起红色警报。",
          "en-US": "Red alert lights up when something breaks."
        })
      }) satisfies Record<ZoneKey, string>,
    [language]
  );

  const agentsByZone = useMemo(() => {
    return zoneOrder.reduce<Record<ZoneKey, typeof agents>>((acc, zone) => {
      acc[zone] = agents.filter((agent) => zoneMap[agent.status] === zone);
      return acc;
    }, {} as Record<ZoneKey, typeof agents>);
  }, [agents]);

  const memoItems = useMemo(
    () =>
      agents.map((agent) =>
        pickText(language, {
          "zh-CN": `${agent.name}：${agent.taskDescription}`,
          "en-US": `${agent.name}: ${agent.taskDescription}`
        })
      ),
    [agents, language]
  );

  return (
    <div className="studio-shell studio-shell-office">
      <div className="studio-hero studio-hero-office">
        <div>
          <div className="section-title">
            {pickText(language, { "zh-CN": "工作室", "en-US": "Workspace" })}
          </div>
          <div className="section-meta">
            {pickText(language, {
              "zh-CN": "像素办公室会根据 Agent 状态切换工位，让工作流一眼可见。",
              "en-US": "This pixel office shifts agents between desks so the whole workflow is visible at a glance."
            })}
          </div>
        </div>
        <div className="studio-hero-actions">
          <div className="badge badge-success">
            {pickText(language, {
              "zh-CN": "Star-Office 风格演绎",
              "en-US": "Star-Office inspired"
            })}
          </div>
          <div className="badge">
            {pickText(language, {
              "zh-CN": `${agents.length} 个 Agent 在线`,
              "en-US": `${agents.length} agents online`
            })}
          </div>
        </div>
      </div>

      <div className="office-stage">
        <div className="office-windowband">
          <span className="office-windowband-title">
            {pickText(language, {
              "zh-CN": "OPENCLAW PIXEL OFFICE",
              "en-US": "OPENCLAW PIXEL OFFICE"
            })}
          </span>
          <div className="office-windowband-lights">
            <span />
            <span />
            <span />
          </div>
        </div>

        <div className="office-layout">
          <section className="office-room">
            <div className="office-room-grid" />
            <div className="office-furniture sofa" />
            <div className="office-furniture plant" />
            <div className="office-furniture write-desk" />
            <div className="office-furniture research-desk" />
            <div className="office-furniture execute-desk" />
            <div className="office-furniture sync-dock" />
            <div className="office-furniture bug-terminal" />
            <div className="office-furniture shelf" />

            {zoneOrder.map((zone) => (
              <div key={zone} className={`office-zone office-zone-${zone}`}>
                <div className="office-zone-label">{zoneTitle[zone]}</div>
                <div className="office-zone-agents">
                  {agentsByZone[zone].length === 0 ? (
                    <div className="office-empty-slot">
                      {pickText(language, { "zh-CN": "空位", "en-US": "Empty" })}
                    </div>
                  ) : (
                    agentsByZone[zone].map((agent, index) => (
                      <article
                        key={agent.id}
                        className={`office-agent office-agent-${zone}`}
                        style={{ ["--agent-offset" as string]: `${index * 14}px` }}
                      >
                        <div className="office-agent-bubble">{agent.taskDescription}</div>
                        <div className="office-agent-sprite" aria-hidden="true">
                          <span className="pixel-head" />
                          <span className="pixel-body" />
                          <span className="pixel-shadow" />
                        </div>
                        <div className="office-agent-meta">
                          <div className="office-agent-name">{agent.name}</div>
                          <div className="office-agent-status">{sceneMap[agent.status]}</div>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </div>
            ))}
          </section>

          <aside className="office-sidebar">
            <section className="office-panel office-panel-note">
              <div className="office-panel-title">
                {pickText(language, { "zh-CN": "今日便签", "en-US": "Today's Notes" })}
              </div>
              <div className="office-note-stack">
                {memoItems.map((item, index) => (
                  <div key={`${item}-${index}`} className="office-note-card">
                    <span className="office-note-pin" />
                    <p>{item}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="office-panel">
              <div className="office-panel-title">
                {pickText(language, { "zh-CN": "区域说明", "en-US": "Zone Guide" })}
              </div>
              <div className="office-legend">
                {zoneOrder.map((zone) => (
                  <div key={zone} className="office-legend-item">
                    <div className={`office-legend-chip office-legend-chip-${zone}`} />
                    <div>
                      <div className="office-legend-title">{zoneTitle[zone]}</div>
                      <div className="office-legend-copy">{zoneHint[zone]}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
