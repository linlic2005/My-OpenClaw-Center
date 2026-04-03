import { useMemo } from "react";
import { pickText } from "../../lib/i18n";
import type { StudioAgentStatus } from "../../types";

const zoneMap = {
  idle: "lounge",
  writing: "writing",
  researching: "research",
  executing: "execute",
  syncing: "sync",
  offline: "lounge",
  error: "bug"
} as const;

const zoneOrder = ["lounge", "writing", "research", "execute", "sync", "bug"] as const;

type OfficeZone = (typeof zoneOrder)[number];

interface OfficeSceneProps {
  agents: StudioAgentStatus[];
  language: "zh-CN" | "en-US";
  mode?: "full" | "compact";
  title?: string;
  subtitle?: string;
  badge?: string;
}

export function OfficeScene({
  agents,
  language,
  mode = "full",
  title,
  subtitle,
  badge
}: OfficeSceneProps) {
  const zoneTitle = useMemo(
    () =>
      ({
        lounge: pickText(language, { "zh-CN": "休息区", "en-US": "Lounge" }),
        writing: pickText(language, { "zh-CN": "写作区", "en-US": "Writing" }),
        research: pickText(language, { "zh-CN": "研究区", "en-US": "Research" }),
        execute: pickText(language, { "zh-CN": "执行区", "en-US": "Execute" }),
        sync: pickText(language, { "zh-CN": "同步区", "en-US": "Sync" }),
        bug: pickText(language, { "zh-CN": "异常区", "en-US": "Bug Zone" })
      }) satisfies Record<OfficeZone, string>,
    [language]
  );

  const zoneHint = useMemo(
    () =>
      ({
        lounge: pickText(language, {
          "zh-CN": "空闲、离线或刚完成任务的 Agent 会回到这里。",
          "en-US": "Idle, offline, or completed agents return here."
        }),
        writing: pickText(language, {
          "zh-CN": "文案整理、回答生成和结构化输出在这里完成。",
          "en-US": "Drafting and structured output happen here."
        }),
        research: pickText(language, {
          "zh-CN": "检索、比对和分析类工作停留在研究位。",
          "en-US": "Search and analysis stay on the research desk."
        }),
        execute: pickText(language, {
          "zh-CN": "命令执行、构建和工具链操作在这里最活跃。",
          "en-US": "Execution, builds, and tools run here."
        }),
        sync: pickText(language, {
          "zh-CN": "同步、汇总和状态回传通过这里流转。",
          "en-US": "Sync and status aggregation flow through this zone."
        }),
        bug: pickText(language, {
          "zh-CN": "错误、冲突和需要人工介入的任务会在这里高亮。",
          "en-US": "Errors and conflicts light up this zone."
        })
      }) satisfies Record<OfficeZone, string>,
    [language]
  );

  const sceneMap = useMemo(
    () => ({
      idle: pickText(language, { "zh-CN": "待命", "en-US": "Idle" }),
      writing: pickText(language, { "zh-CN": "写作中", "en-US": "Writing" }),
      researching: pickText(language, { "zh-CN": "研究中", "en-US": "Researching" }),
      executing: pickText(language, { "zh-CN": "执行中", "en-US": "Executing" }),
      syncing: pickText(language, { "zh-CN": "同步中", "en-US": "Syncing" }),
      offline: pickText(language, { "zh-CN": "离线", "en-US": "Offline" }),
      error: pickText(language, { "zh-CN": "异常", "en-US": "Error" })
    }),
    [language]
  );

  const agentsByZone = useMemo(() => {
    return zoneOrder.reduce<Record<OfficeZone, StudioAgentStatus[]>>((acc, zone) => {
      acc[zone] = agents.filter((agent) => zoneMap[agent.status] === zone);
      return acc;
    }, {} as Record<OfficeZone, StudioAgentStatus[]>);
  }, [agents]);

  const noteItems = useMemo(() => {
    if (!agents.length) {
      return [
        pickText(language, {
          "zh-CN": "工作室尚未返回实时任务，等待下一次状态同步。",
          "en-US": "The studio has not returned live tasks yet."
        })
      ];
    }

    return agents.slice(0, 4).map((agent) => `${agent.name}: ${agent.taskDescription}`);
  }, [agents, language]);

  return (
    <div className={`office-scene office-scene-${mode}`}>
      {(title || subtitle || badge) && (
        <div className="studio-hero studio-hero-office">
          <div>
            {title ? <div className="section-title">{title}</div> : null}
            {subtitle ? <div className="section-meta">{subtitle}</div> : null}
          </div>
          {badge ? <div className="badge badge-success">{badge}</div> : null}
        </div>
      )}

      <div className={`office-stage ${mode === "compact" ? "office-stage-compact" : ""}`}>
        <div className="office-windowband">
          <span className="office-windowband-title">OPENCLAW STAR OFFICE</span>
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
                {pickText(language, { "zh-CN": "当日便签", "en-US": "Mission Notes" })}
              </div>
              <div className="office-note-stack">
                {noteItems.map((item, index) => (
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
