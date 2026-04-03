import { useEffect, useMemo, useState } from "react";
import { pickText } from "../../lib/i18n";
import { studioService } from "../../services/StudioService";
import { useSettingsStore } from "../../stores/settingsStore";
import { useStudioStore } from "../../stores/studioStore";
import { OfficeScene } from "./OfficeScene";

type StudioEmbedStatus = "checking" | "ready" | "fallback";

function WorkspaceFallback() {
  const { agents, load } = useStudioStore();
  const { language, studioUrl } = useSettingsStore((state) => ({
    language: state.settings.language,
    studioUrl: state.settings.studioUrl
  }));

  useEffect(() => {
    void load(language, studioUrl);
  }, [language, load, studioUrl]);

  return (
    <div className="studio-shell studio-shell-office">
      <OfficeScene
        agents={agents}
        language={language}
        title={pickText(language, { "zh-CN": "Star Office 工作室", "en-US": "Star Office Workspace" })}
        subtitle={pickText(language, {
          "zh-CN": "当前显示本地工作室场景视图。若 Flask Studio 可用，会自动切换为 iframe 实时页面。",
          "en-US": "Showing the local workspace scene. It switches to the live iframe when Flask Studio is available."
        })}
        badge={pickText(language, {
          "zh-CN": "场景模式",
          "en-US": "Scene mode"
        })}
      />
    </div>
  );
}

export function StudioModule() {
  const { language, theme, studioEnabled, studioUrl } = useSettingsStore((state) => ({
    language: state.settings.language,
    theme: state.settings.theme,
    studioEnabled: state.settings.studioEnabled,
    studioUrl: state.settings.studioUrl
  }));
  const [embedStatus, setEmbedStatus] = useState<StudioEmbedStatus>("checking");

  useEffect(() => {
    if (!studioEnabled) {
      setEmbedStatus("fallback");
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    setEmbedStatus("checking");
    studioService.setBaseUrl(studioUrl);

    fetch(`${studioUrl}/health`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Studio service unavailable");
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
  }, [studioEnabled, studioUrl]);

  const iframeSrc = useMemo(() => {
    const query = new URLSearchParams({
      lang: language,
      theme
    });
    return `${studioUrl}/?${query.toString()}`;
  }, [language, studioUrl, theme]);

  if (!studioEnabled) {
    return <WorkspaceFallback />;
  }

  if (embedStatus === "checking") {
    return (
      <div className="studio-shell">
        <div className="panel studio-embed-shell">
          <div className="section-title">
            {pickText(language, { "zh-CN": "正在连接 Studio 服务", "en-US": "Connecting to Studio" })}
          </div>
          <div className="section-meta">
            {pickText(language, {
              "zh-CN": "正在检查远端工作室服务是否可用。",
              "en-US": "Checking whether the remote workspace service is available."
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
              <div className="section-title">
                {pickText(language, { "zh-CN": "Studio 实时工作室", "en-US": "Studio Live Workspace" })}
              </div>
              <div className="section-meta">
                {pickText(language, {
                  "zh-CN": "已接入远端 Flask Studio，下方展示实时工作室页面。",
                  "en-US": "The remote Flask Studio is active. The live workspace is embedded below."
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
