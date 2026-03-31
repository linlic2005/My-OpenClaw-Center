import { useEffect, useMemo, useState } from "react";
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
type StudioEmbedStatus = "checking" | "ready" | "fallback";

const STUDIO_URL = import.meta.env.VITE_STUDIO_URL ?? "http://localhost:19000";

function WorkspaceFallback() {
  const { agents, load } = useStudioStore();
  const language = useSettingsStore((state) => state.settings.language);

  useEffect(() => {
    void load(language);
  }, [language, load]);

  const sceneMap = useMemo(
    () => ({
      idle: pickText(language, { "zh-CN": "休息区", "en-US": "Lounge" }),
      writing: pickText(language, { "zh-CN": "写作位", "en-US": "Writing Desk" }),
      researching: pickText(language, { "zh-CN": "检索位", "en-US": "Research Desk" }),
      executing: pickText(language, { "zh-CN": "执行位", "en-US": "Execution Desk" }),
      syncing: pickText(language, { "zh-CN": "同步站", "en-US": "Sync Desk" }),
      error: pickText(language, { "zh-CN": "异常区", "en-US": "Bug Zone" })
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
        bug: pickText(language, { "zh-CN": "异常区", "en-US": "Bug Zone" })
      }) satisfies Record<ZoneKey, string>,
    [language]
  );

  const zoneHint = useMemo(
    () =>
      ({
        lounge: pickText(language, {
          "zh-CN": "空闲或已完成的 Agent 会回到休息区待命。",
          "en-US": "Idle or completed agents return here to wait for the next task."
        }),
        writing: pickText(language, {
          "zh-CN": "文案整理、方案撰写和结构输出集中在这里。",
          "en-US": "Writing-heavy tasks settle into this desk."
        }),
        research: pickText(language, {
          "zh-CN": "检索、比对和资料梳理会停留在检索位。",
          "en-US": "Search and analysis work stays on the research station."
        }),
        execute: pickText(language, {
          "zh-CN": "命令执行、调试和构建会占用主操作位。",
          "en-US": "Command execution and build work use the main rig."
        }),
        sync: pickText(language, {
          "zh-CN": "同步、推送和状态汇总会汇入同步站。",
          "en-US": "Sync, push, and aggregation work flows through the dock."
        }),
        bug: pickText(language, {
          "zh-CN": "遇到冲突或错误时会切换到异常区高亮展示。",
          "en-US": "Errors and conflicts light up the bug zone."
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
              "zh-CN": "当前显示本地 fallback 视图。Flask 子服务可用后会自动切换到 iframe 工作室。",
              "en-US": "This is the local fallback view. It switches to the Flask iframe automatically once the service is available."
            })}
          </div>
        </div>
        <div className="studio-hero-actions">
          <div className="badge badge-success">
            {pickText(language, {
              "zh-CN": "像素办公室 fallback",
              "en-US": "Pixel fallback"
            })}
          </div>
          <div className="badge">
            {pickText(language, {
              "zh-CN": `${agents.length} 个 Agent`,
              "en-US": `${agents.length} agents`
            })}
          </div>
        </div>
      </div>

      <div className="office-stage">
        <div className="office-windowband">
          <span className="office-windowband-title">OPENCLAW PIXEL OFFICE</span>
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
                {pickText(language, { "zh-CN": "当前便签", "en-US": "Today's Notes" })}
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

export function StudioModule() {
  const language = useSettingsStore((state) => state.settings.language);
  const theme = useSettingsStore((state) => state.settings.theme);
  const studioEnabled = useSettingsStore((state) => state.settings.studioEnabled);
  const [embedStatus, setEmbedStatus] = useState<StudioEmbedStatus>("checking");

  useEffect(() => {
    if (!studioEnabled) {
      setEmbedStatus("fallback");
      return;
    }

    let cancelled = false;
    setEmbedStatus("checking");

    const controller = new AbortController();

    fetch(`${STUDIO_URL}/health`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Studio service is unavailable");
        }
        if (!cancelled) {
          setEmbedStatus("ready");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEmbedStatus("fallback");
        }
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [language, studioEnabled, theme]);

  const iframeSrc = useMemo(() => {
    const query = new URLSearchParams({
      lang: language,
      theme
    });
    return `${STUDIO_URL}/?${query.toString()}`;
  }, [language, theme]);

  if (!studioEnabled) {
    return <WorkspaceFallback />;
  }

  if (embedStatus === "checking") {
    return (
      <div className="studio-shell">
        <div className="panel studio-embed-shell">
          <div className="section-title">
            {pickText(language, { "zh-CN": "正在连接工作室子服务", "en-US": "Connecting to Studio service" })}
          </div>
          <div className="section-meta">
            {pickText(language, {
              "zh-CN": "正在检查本地 Flask 服务是否可用。",
              "en-US": "Checking whether the local Flask service is available."
            })}
          </div>
          <div className="progress-track large">
            <div className="progress-bar" style={{ width: "58%" }} />
          </div>
        </div>
      </div>
    );
  }

  if (embedStatus === "ready") {
    return (
      <div className="studio-shell studio-embed-shell">
        <div className="panel">
          <div className="section-header">
            <div>
              <div className="section-title">{pickText(language, { "zh-CN": "工作室", "en-US": "Workspace" })}</div>
              <div className="section-meta">
                {pickText(language, {
                  "zh-CN": "已接入 Flask 子服务，下面展示实时像素工作室视图。",
                  "en-US": "The Flask subservice is active. The live pixel workspace is embedded below."
                })}
              </div>
            </div>
            <div className="badge badge-success">
              {pickText(language, { "zh-CN": "iframe 已连接", "en-US": "iframe connected" })}
            </div>
          </div>
        </div>

        <div className="panel studio-embed-card">
          <iframe
            title="OpenClaw Studio"
            src={iframeSrc}
            className="studio-embed-frame"
            loading="lazy"
          />
        </div>
      </div>
    );
  }

  return <WorkspaceFallback />;
}
