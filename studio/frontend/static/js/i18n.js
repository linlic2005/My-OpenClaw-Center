(() => {
  const dictionaries = {
    "zh-CN": {
      title: "工作室",
      subtitle: "通过像素工作室查看 Agent 的实时状态。",
      agents_online: "在线 Agent",
      last_sync: "最后同步",
      zone_idle: "休息区",
      zone_writing: "写作位",
      zone_researching: "检索位",
      zone_executing: "执行位",
      zone_syncing: "同步站",
      zone_error: "异常区",
      guide_title: "区域说明",
      notes_title: "当前便签",
      guide_idle: "空闲或已完成的 Agent 会回到休息区待命。",
      guide_writing: "文案整理和结构输出集中在写作位。",
      guide_researching: "资料检索与分析任务停留在检索位。",
      guide_executing: "命令执行、调试和构建工作会占用主操作位。",
      guide_syncing: "同步、推送和汇总状态流向同步站。",
      guide_error: "错误和冲突会在异常区高亮显示。",
      empty_zone: "暂无 Agent",
      status_idle: "空闲",
      status_writing: "写作中",
      status_researching: "检索中",
      status_executing: "执行中",
      status_syncing: "同步中",
      status_error: "异常",
    },
    "en-US": {
      title: "Workspace",
      subtitle: "Track live agent activity through the pixel workspace.",
      agents_online: "Agents Online",
      last_sync: "Last Sync",
      zone_idle: "Lounge",
      zone_writing: "Writing Desk",
      zone_researching: "Research Desk",
      zone_executing: "Execution Desk",
      zone_syncing: "Sync Dock",
      zone_error: "Bug Zone",
      guide_title: "Zone Guide",
      notes_title: "Current Notes",
      guide_idle: "Idle or completed agents return to the lounge.",
      guide_writing: "Writing and composition tasks settle at the writing desk.",
      guide_researching: "Search and analysis work stays on the research station.",
      guide_executing: "Command execution and builds use the main rig.",
      guide_syncing: "Sync and push activity flows through the dock.",
      guide_error: "Errors and conflicts light up the bug zone.",
      empty_zone: "No agents",
      status_idle: "Idle",
      status_writing: "Writing",
      status_researching: "Researching",
      status_executing: "Executing",
      status_syncing: "Syncing",
      status_error: "Error",
    },
  };

  const fallback = "zh-CN";

  window.StudioI18n = {
    getLanguage() {
      const stored = window.localStorage.getItem("studio-lang");
      const boot = window.__STUDIO_BOOT__?.lang;
      return dictionaries[stored] ? stored : dictionaries[boot] ? boot : fallback;
    },
    setLanguage(lang) {
      if (!dictionaries[lang]) return;
      window.localStorage.setItem("studio-lang", lang);
      document.documentElement.lang = lang;
      document.body.dataset.lang = lang;
      document.querySelectorAll("[data-i18n]").forEach((node) => {
        const key = node.dataset.i18n;
        if (key) {
          node.textContent = dictionaries[lang][key] || dictionaries[fallback][key] || key;
        }
      });
    },
    t(key) {
      const lang = window.StudioI18n.getLanguage();
      return dictionaries[lang][key] || dictionaries[fallback][key] || key;
    },
  };
})();
