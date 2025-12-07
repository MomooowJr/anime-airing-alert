import { openAuthWindow } from "./modules/auth.js";
import { applyTheme, applyResponsiveLayout } from "./modules/utils.js";
import { setupSettings } from "./modules/settings.js";

const translations = {
  fr: {
    title: "Prochains \u00e9pisodes",
    refresh: "Rafra\u00eechir",
    logout: "D\u00e9connexion",
    theme: "Th\u00e8me",
    settings: "Param\u00e8tres",
    statusLoading: "Chargement en cours...",
    statusUpdating: "Mise \u00e0 jour...",
    statusError: "Erreur de chargement.",
    statusUpdatedAt: (time) => "Mis \u00e0 jour : " + time,
    upToDate: "\u00c0 jour",
    late: (n) => `${n} \u00e9pisode${n > 1 ? "s" : ""} de retard`,
    settingsTitle: "Param\u00e8tres",
    labelLanguage: "Langue / Language :",
    labelTheme: "Th\u00e8me par d\u00e9faut :",
    labelRefresh: "Fr\u00e9quence de rafra\u00eechissement :",
    labelTop: "Toujours au-dessus",
    labelSortBy: "Trier par :",
    labelSortOrder: "Ordre :",
    sortName: "Nom",
    sortNext: "Prochain \u00e9pisode",
    sortUpdated: "Derni\u00e8re mise \u00e0 jour",
    orderAsc: "Croissant",
    orderDesc: "D\u00e9croissant",
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
    labelTop: "Always on top",
    labelSortBy: "Sort by:",
    labelSortOrder: "Order:",
    sortName: "Name",
    sortNext: "Next episode",
    sortUpdated: "Last updated",
    orderAsc: "Ascending",
    orderDesc: "Descending",
  },
};

let lang = localStorage.getItem("lang") || "fr";
let currentTheme = parseInt(localStorage.getItem("selected_theme")) || 0;
let refreshInterval;

let truncateTitles = localStorage.getItem("truncate_title") === "true";
let sortBy = localStorage.getItem("sort_by") || "next";
let sortOrder = localStorage.getItem("sort_order") || "asc";

async function updateProgress(mediaId, currentProgress, delta) {
  const token = localStorage.getItem("anilist_token");
  if (!token) return await openAuthWindow();

  const newProgress = Math.max(0, currentProgress + delta);
  if (newProgress === currentProgress) return;

  const statusEl = document.getElementById("status");
  const prevStatus = statusEl.textContent;
  statusEl.textContent = translations[lang].statusUpdating;

  try {
    await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify({
        query: `mutation ($mediaId: Int, $progress: Int) {
          SaveMediaListEntry(mediaId: $mediaId, progress: $progress) {
            id
            progress
          }
        }`,
        variables: { mediaId, progress: newProgress },
      }),
    });
    await fetchData();
  } catch (error) {
    console.error("Update progress error:", error);
    statusEl.textContent = translations[lang].statusError;
    setTimeout(() => (statusEl.textContent = prevStatus), 2000);
  }
}

function applyTranslations() {
  const t = translations[lang];
  document.getElementById("title").textContent = t.title;
  document.getElementById("refreshBtn").title = t.refresh;
  document.getElementById("settingsBtn").title = t.settings;
  document.getElementById("logoutBtn").textContent = t.logout;
  document.getElementById("labelLanguage").textContent = t.labelLanguage;
  document.getElementById("labelTheme").textContent = t.labelTheme;
  document.getElementById("labelRefresh").textContent = t.labelRefresh;
  document.getElementById("labelTop").textContent = t.labelTop;
  document.querySelector("#settingsPanel .panel-header span").textContent =
    t.settingsTitle;
  document.getElementById("labelSortBy").textContent = t.labelSortBy;
  document.getElementById("labelSortOrder").textContent = t.labelSortOrder;
  document.querySelector("#sortBy option[value='name']").textContent = t.sortName;
  document.querySelector("#sortBy option[value='next']").textContent = t.sortNext;
  document.querySelector("#sortBy option[value='updated']").textContent =
    t.sortUpdated;
  document.querySelector("#sortOrder option[value='asc']").textContent = t.orderAsc;
  document.querySelector("#sortOrder option[value='desc']").textContent =
    t.orderDesc;
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
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify({ query: `query { Viewer { id } }` }),
    }).then((r) => r.json());

    const userId = viewerData.data.Viewer.id;

    const listData = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify({
        query: `query ($userId: Int) {
          MediaListCollection(userId: $userId, type: ANIME, status: CURRENT) {
            lists {
              entries {
                mediaId
                progress
                updatedAt
                media {
                  id
                  title { romaji }
                  siteUrl
                  status
                  episodes
                  nextAiringEpisode { airingAt episode }
                  coverImage { medium }
                }
              }
            }
          }
        }`,
        variables: { userId },
      }),
    }).then((r) => r.json());

    let entries = listData.data.MediaListCollection.lists.flatMap(
      (l) => l.entries
    );
    entries = entries.filter(
      (e) => e.media?.nextAiringEpisode && e.media.status === "RELEASING"
    );
    const dir = sortOrder === "asc" ? 1 : -1;
    entries.sort((a, b) => {
      if (sortBy === "name") {
        return (
          dir *
          a.media.title.romaji.localeCompare(b.media.title.romaji, undefined, {
            sensitivity: "base",
          })
        );
      }
      if (sortBy === "updated") {
        return dir * ((a.updatedAt || 0) - (b.updatedAt || 0));
      }
      // default: next airing date
      return (
        dir *
        (a.media.nextAiringEpisode.airingAt - b.media.nextAiringEpisode.airingAt)
      );
    });

    listEl.innerHTML = "";

    if (entries.length === 0) {
      listEl.innerHTML = "<p>Aucun \u00e9pisode pr\u00e9vu.</p>";
    } else {
      entries.forEach((entry) => {
        const div = document.createElement("div");
        div.className = "anime-entry";

        const img = document.createElement("img");
        img.src = entry.media.coverImage.medium;
        div.appendChild(img);

        const info = document.createElement("div");
        info.className = "anime-info";

        const a = document.createElement("a");
        a.href = entry.media.siteUrl;

        const fullTitle = entry.media.title.romaji;
        a.textContent =
          truncateTitles && fullTitle.length > 30
            ? fullTitle.slice(0, 30) + "..."
            : fullTitle;

        a.addEventListener("click", (e) => {
          e.preventDefault();
          window.electron.ipcInvoke("open-link", a.href);
        });
        info.appendChild(a);

        const span = document.createElement("span");
        span.className = "episode-info";
        const dateStr = new Date(
          entry.media.nextAiringEpisode.airingAt * 1000
        ).toLocaleString(lang === "fr" ? "fr-FR" : "en-US", {
          weekday: "short",
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });
        span.textContent = `Ep. ${entry.media.nextAiringEpisode.episode} - ${dateStr}`;
        info.appendChild(span);

        const aired = entry.media.nextAiringEpisode.episode - 1;
        const seen = entry.progress ?? 0;
        const diff = aired - seen;
        const status = document.createElement("span");
        status.className = diff <= 0 ? "status-up-to-date" : "status-late";
        status.textContent = diff <= 0 ? t.upToDate : t.late(diff);
        info.appendChild(status);

        const counts = document.createElement("span");
        counts.className = diff <= 0 ? "status-up-to-date" : "status-late";
        const totalEps = entry.media.episodes;
        counts.textContent = totalEps ? `${seen} / ${totalEps}` : `${seen}`;
        counts.style.marginTop = "2px";
        info.appendChild(counts);

        const actions = document.createElement("div");
        actions.className = "episode-actions";
        const decBtn = document.createElement("button");
        decBtn.textContent = "-";
        const incBtn = document.createElement("button");
        incBtn.textContent = "+";

        const toggleDisabled = (val) => {
          decBtn.disabled = val;
          incBtn.disabled = val;
        };

        decBtn.addEventListener("click", async () => {
          toggleDisabled(true);
          await updateProgress(entry.mediaId || entry.media.id, seen, -1);
          toggleDisabled(false);
        });
        incBtn.addEventListener("click", async () => {
          toggleDisabled(true);
          await updateProgress(entry.mediaId || entry.media.id, seen, 1);
          toggleDisabled(false);
        });

        actions.appendChild(decBtn);
        actions.appendChild(incBtn);
        info.appendChild(actions);

        div.appendChild(info);
        listEl.appendChild(div);
      });
    }

    statusEl.textContent = t.statusUpdatedAt(
      new Date().toLocaleTimeString(lang === "fr" ? "fr-FR" : "en-US")
    );
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

  // Header actions visibility (show on hover with small grace period)
  let hideActionsTimeout;
  const header = document.querySelector("header");
  const actions = document.querySelector(".header-actions");
  const showActions = () => {
    clearTimeout(hideActionsTimeout);
    document.body.classList.add("show-actions");
  };
  const hideActions = () => {
    clearTimeout(hideActionsTimeout);
    hideActionsTimeout = setTimeout(
      () => document.body.classList.remove("show-actions"),
      600
    );
  };
  header.addEventListener("mouseenter", showActions);
  header.addEventListener("mouseleave", hideActions);
  actions.addEventListener("mouseenter", showActions);
  actions.addEventListener("mouseleave", hideActions);

  // Pre-remplir les selecteurs de tri
  document.getElementById("sortBy").value = sortBy;
  document.getElementById("sortOrder").value = sortOrder;

  // Charger etat du checkbox
  document.getElementById("truncateTitle").checked = truncateTitles;

  // Sur changement utilisateur
  document.getElementById("truncateTitle").addEventListener("change", (e) => {
    truncateTitles = e.target.checked;
    localStorage.setItem("truncate_title", truncateTitles);
    fetchData();
  });

  refreshInterval = setInterval(
    fetchData,
    parseInt(localStorage.getItem("refresh_rate") || 3600000)
  );
  window.refreshInterval = refreshInterval;

  document.getElementById("settingsBtn").addEventListener("click", () => {
    document.getElementById("settingsPanel").style.display = "flex";
  });

  document.getElementById("closeSettingsBtn").addEventListener("click", () => {
    document.getElementById("settingsPanel").style.display = "none";
  });

  document.getElementById("sortBy").addEventListener("change", (e) => {
    sortBy = e.target.value;
    localStorage.setItem("sort_by", sortBy);
    fetchData();
  });
  document.getElementById("sortOrder").addEventListener("change", (e) => {
    sortOrder = e.target.value;
    localStorage.setItem("sort_order", sortOrder);
    fetchData();
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

  document.getElementById("settingsPanel").addEventListener("click", (e) => {
    if (e.target.id === "settingsPanel") {
      document.getElementById("settingsPanel").style.display = "none";
    }
  });

  document.getElementById("minimizeBtn").addEventListener("click", () => {
    window.electron.ipcInvoke("minimize-app");
  });

  fetchData();
});

window.addEventListener("resize", applyResponsiveLayout);
window.addEventListener("DOMContentLoaded", applyResponsiveLayout);
