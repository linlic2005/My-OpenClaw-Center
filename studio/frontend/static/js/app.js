(() => {
  const zones = {
    idle: document.getElementById("zone-idle"),
    writing: document.getElementById("zone-writing"),
    researching: document.getElementById("zone-researching"),
    executing: document.getElementById("zone-executing"),
    syncing: document.getElementById("zone-syncing"),
    error: document.getElementById("zone-error"),
  };

  const guideRoot = document.getElementById("guide-list");
  const noteRoot = document.getElementById("note-list");
  const countRoot = document.getElementById("agent-count");
  const syncRoot = document.getElementById("last-sync");
  const langSelect = document.getElementById("lang-select");

  const guides = [
    ["zone_idle", "guide_idle"],
    ["zone_writing", "guide_writing"],
    ["zone_researching", "guide_researching"],
    ["zone_executing", "guide_executing"],
    ["zone_syncing", "guide_syncing"],
    ["zone_error", "guide_error"],
  ];

  function renderGuides() {
    guideRoot.innerHTML = "";
    guides.forEach(([title, copy]) => {
      const card = document.createElement("div");
      card.className = "guide-item";
      card.innerHTML = `<strong>${window.StudioI18n.t(title)}</strong><div class="guide-copy">${window.StudioI18n.t(copy)}</div>`;
      guideRoot.appendChild(card);
    });
  }

  function renderAgentCard(agent) {
    const card = document.createElement("article");
    card.className = "agent-card";
    card.innerHTML = `
      <div class="agent-name">${agent.name}</div>
      <div class="agent-meta">${agent.locale} · ${agent.lastUpdated}</div>
      <div class="agent-task">${agent.taskDescription}</div>
      <div class="agent-status">${window.StudioI18n.t(`status_${agent.status}`)}</div>
    `;
    return card;
  }

  function renderZones(agents) {
    Object.values(zones).forEach((root) => {
      root.innerHTML = "";
    });

    Object.entries(zones).forEach(([status, root]) => {
      const matches = agents.filter((agent) => agent.status === status);
      if (!matches.length) {
        const empty = document.createElement("div");
        empty.className = "agent-meta";
        empty.textContent = window.StudioI18n.t("empty_zone");
        root.appendChild(empty);
        return;
      }

      matches.forEach((agent) => root.appendChild(renderAgentCard(agent)));
    });
  }

  function renderNotes(agents) {
    noteRoot.innerHTML = "";
    agents.forEach((agent) => {
      const card = document.createElement("article");
      card.className = "note-card";
      card.innerHTML = `
        <strong>${agent.name}</strong>
        <div>${agent.taskDescription}</div>
        <div class="note-time">${agent.lastUpdated}</div>
      `;
      noteRoot.appendChild(card);
    });
  }

  async function fetchStatuses() {
    const response = await fetch("/api/status/all", { headers: { Accept: "application/json" } });
    if (!response.ok) {
      throw new Error(`status ${response.status}`);
    }
    const payload = await response.json();
    return Array.isArray(payload.agents) ? payload.agents : [];
  }

  async function refresh() {
    try {
      const agents = await fetchStatuses();
      renderZones(agents);
      renderNotes(agents);
      countRoot.textContent = String(agents.length);
      syncRoot.textContent = new Date().toLocaleTimeString(window.StudioI18n.getLanguage());
    } catch (error) {
      countRoot.textContent = "0";
      syncRoot.textContent = "offline";
      console.error(error);
    }
  }

  window.addEventListener("DOMContentLoaded", () => {
    const lang = window.StudioI18n.getLanguage();
    langSelect.value = lang;
    window.StudioI18n.setLanguage(lang);
    renderGuides();
    refresh();
    window.setInterval(refresh, 5000);

    langSelect.addEventListener("change", (event) => {
      window.StudioI18n.setLanguage(event.target.value);
      renderGuides();
      refresh();
    });
  });
})();
