import { openAuthWindow } from './modules/auth.js';
import { applyTheme, applyResponsiveLayout } from './modules/utils.js';
import { setupSettings } from './modules/settings.js';

const translations = {
  fr: {
    title: "Prochains épisodes",
    refresh: "Rafraîchir",
    logout: "Déconnexion",
    theme: "Thème",
    settings: "Paramètres",
    statusLoading: "Chargement en cours...",
    statusUpdating: "Mise à jour...",
    statusError: "Erreur de chargement.",
    statusUpdatedAt: (time) => "Mis à jour : " + time,
    upToDate: "À jour",
    late: (n) => `${n} épisode${n > 1 ? "s" : ""} de retard`,
    settingsTitle: "Paramètres",
    labelLanguage: "Langue / Language :",
    labelTheme: "Thème par défaut :",
    labelRefresh: "Fréquence de rafraîchissement :",
    labelTop: "Toujours au-dessus"
  },
  en: {
    title: "Upcoming Episodes",
    refresh: "Refresh",
    logout: "Logout",
    theme: "Theme",
    settings: "Settings",
    statusLoading: "Loading...",
    statusUpdating: "Updating...",
    statusError: "Error while loading.",
    statusUpdatedAt: (time) => "Updated at: " + time,
    upToDate: "Up to date",
    late: (n) => `${n} episode${n > 1 ? "s" : ""} behind`,
    settingsTitle: "Settings",
    labelLanguage: "Language:",
    labelTheme: "Default theme:",
    labelRefresh: "Refresh rate:",
    labelTop: "Always on top"
  }
};

let lang = localStorage.getItem("lang") || "fr";
let currentTheme = parseInt(localStorage.getItem("selected_theme")) || 0;
let refreshInterval;

function applyTranslations() {
  const t = translations[lang];
  document.getElementById("title").textContent = t.title;
  document.getElementById("refreshBtn").textContent = t.refresh;
  document.getElementById("logoutBtn").textContent = t.logout;
  document.getElementById("themeBtn").textContent = t.theme;
  document.getElementById("settingsBtn").textContent = t.settings;
  document.getElementById("labelLanguage").textContent = t.labelLanguage;
  document.getElementById("labelTheme").textContent = t.labelTheme;
  document.getElementById("labelRefresh").textContent = t.labelRefresh;
  document.getElementById("labelTop").lastChild.textContent = " " + t.labelTop;
  document.querySelector("#settingsPanel .panel-header span").textContent = t.settingsTitle;
}

async function fetchData() {
  const t = translations[lang];
  const statusEl = document.getElementById("status");
  const listEl = document.getElementById("animeList");
  statusEl.textContent = t.statusUpdating;

  try {
    const token = localStorage.getItem("anilist_token");
    if (!token) return await openAuthWindow();

    const viewerData = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify({ query: `query { Viewer { id } }` })
    }).then(r => r.json());

    const userId = viewerData.data.Viewer.id;

    const listData = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify({
        query: `query ($userId: Int) {
          MediaListCollection(userId: $userId, type: ANIME, status: CURRENT) {
            lists {
              entries {
                progress
                media {
                  title { romaji }
                  siteUrl
                  status
                  nextAiringEpisode { airingAt episode }
                  coverImage { medium }
                }
              }
            }
          }
        }`,
        variables: { userId }
      })
    }).then(r => r.json());

    let entries = listData.data.MediaListCollection.lists.flatMap(l => l.entries);
    entries = entries.filter(e => e.media?.nextAiringEpisode && e.media.status === "RELEASING");
    entries.sort((a, b) => a.media.nextAiringEpisode.airingAt - b.media.nextAiringEpisode.airingAt);

    listEl.innerHTML = "";

    if (entries.length === 0) {
      listEl.innerHTML = "<p>Aucun épisode prévu.</p>";
    } else {
      entries.forEach(entry => {
        const div = document.createElement("div");
        div.className = "anime-entry";

        const img = document.createElement("img");
        img.src = entry.media.coverImage.medium;
        div.appendChild(img);

        const info = document.createElement("div");
        info.className = "anime-info";

        const a = document.createElement("a");
        a.href = entry.media.siteUrl;
        a.textContent = entry.media.title.romaji;
        a.addEventListener("click", e => {
          e.preventDefault();
          window.electron.ipcInvoke("open-link", a.href);
        });
        info.appendChild(a);

        const span = document.createElement("span");
        span.className = "episode-info";
        const dateStr = new Date(entry.media.nextAiringEpisode.airingAt * 1000).toLocaleString(
          lang === "fr" ? "fr-FR" : "en-US",
          { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }
        );
        span.textContent = `Ep. ${entry.media.nextAiringEpisode.episode} – ${dateStr}`;
        info.appendChild(span);

        const aired = entry.media.nextAiringEpisode.episode - 1;
        const seen = entry.progress ?? 0;
        const diff = aired - seen;
        const status = document.createElement("span");
        status.className = diff <= 0 ? "status-up-to-date" : "status-late";
        status.textContent = diff <= 0 ? t.upToDate : t.late(diff);
        info.appendChild(status);

        div.appendChild(info);
        listEl.appendChild(div);
      });
    }

    statusEl.textContent = t.statusUpdatedAt(new Date().toLocaleTimeString(lang === "fr" ? "fr-FR" : "en-US"));
  } catch (error) {
    console.error(error);
    listEl.innerHTML = `<p><em>${translations[lang].statusError}</em></p>`;
    document.getElementById("status").textContent = error.message;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  applyTheme(currentTheme);
  applyResponsiveLayout();
  applyTranslations();
  setupSettings(lang, translations, fetchData);

  refreshInterval = setInterval(fetchData, parseInt(localStorage.getItem("refresh_rate") || 3600000));
  window.refreshInterval = refreshInterval;

  document.getElementById("menuToggleBtn").addEventListener("click", () => {
    const controls = document.querySelector(".controls-secondary");
    controls.style.display = controls.style.display === "none" ? "flex" : "none";
  });

  document.getElementById("settingsBtn").addEventListener("click", () => {
    document.getElementById("settingsPanel").style.display = "block";
  });

  document.getElementById("closeSettingsBtn").addEventListener("click", () => {
    document.getElementById("settingsPanel").style.display = "none";
  });

  document.getElementById("themeBtn").addEventListener("click", () => {
    currentTheme = (currentTheme + 1) % 4;
    applyTheme(currentTheme);
  });

  document.getElementById("refreshBtn").addEventListener("click", fetchData);

  document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("anilist_token");
    location.reload();
  });

  document.getElementById("closeBtn").addEventListener("click", () => {
    window.electron.ipcInvoke("close-app");
  });

  document.getElementById("toggleTopBtn").addEventListener("click", () => {
    const isTop = document.body.dataset.top === "true";
    window.electron.ipcInvoke("set-always-on-top", !isTop);
    document.body.dataset.top = (!isTop).toString();
  });

  document.getElementById("minimizeBtn").addEventListener("click", () => {
    window.electron.ipcInvoke("minimize-app");
  });

  fetchData();
});

window.addEventListener("resize", applyResponsiveLayout);
window.addEventListener('DOMContentLoaded', applyResponsiveLayout);
