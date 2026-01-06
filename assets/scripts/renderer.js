import { openAuthWindow } from "./modules/auth.js";
import { applyTheme } from "./modules/utils.js";

// --- CONFIG & STATE ---
let lang = localStorage.getItem("lang") || "fr";
let currentTheme = parseInt(localStorage.getItem("selected_theme")) || 0;
let viewMode = localStorage.getItem("view_mode") || "list";
let refreshInterval;
let animeState = {}; // Stocke l'état local { [mediaId]: { progress, total, title... } }
let fetchDebounceTimer;
let isFetching = false;

// Textes
const translations = {
  fr: {
    statusUpdating: "Sync...",
    statusError: "Erreur",
    late: (n) => `+${n}`,
    upToDate: "À jour",
    settingsTitle: "Paramètres",
    logout: "Déconnexion",
    labelTheme: "Thème",
    labelLanguage: "Langue",
    labelRefresh: "Fréquence",
    labelSortBy: "Trier par",
    labelSortOrder: "Ordre",
    labelTop: "Toujours au-dessus",
    labelTruncate: "Titres complets",
    labelShowEp: "Afficher Épisode",
    labelShowProgress: "Barre de progression",
    labelImageSize: "Taille Images",
    optSmall: "Petit",
    optMedium: "Moyen",
    optLarge: "Grand",
    refreshing: "Rafraîchissement...",
    lastUpdate: "Dernière màj : ",
    // Options des listes déroulantes
    opt30m: "30 minutes",
    opt1h: "1 heure",
    opt2h: "2 heures",
    optSortNext: "Prochain épisode",
    optSortUpdated: "Mise à jour",
    optSortName: "Nom",
    optOrderAsc: "Croissant",
    optOrderDesc: "Décroissant"
  },
  en: {
    statusUpdating: "Sync...",
    statusError: "Error",
    late: (n) => `+${n}`,
    upToDate: "Up to date",
    settingsTitle: "Settings",
    logout: "Logout",
    labelTheme: "Theme",
    labelLanguage: "Language",
    labelRefresh: "Interval",
    labelSortBy: "Sort by",
    labelSortOrder: "Order",
    labelTop: "Always on top",
    labelTruncate: "Full Titles",
    labelShowEp: "Show Episode",
    labelShowProgress: "Progress Bar",
    labelImageSize: "Image Size",
    optSmall: "Small",
    optMedium: "Medium",
    optLarge: "Large",
    refreshing: "Refreshing...",
    lastUpdate: "Last update: ",
    // Options dei menus
    opt30m: "30 minutes",
    opt1h: "1 hour",
    opt2h: "2 hours",
    optSortNext: "Next episode",
    optSortUpdated: "Updated",
    optSortName: "Name",
    optOrderAsc: "Ascending",
    optOrderDesc: "Descending"
  }
};

// --- LOGIQUE D'AFFICHAGE ---
function switchView(mode) {
    viewMode = mode;
    localStorage.setItem("view_mode", mode);
    const main = document.getElementById("mainContent");
    const listBtn = document.getElementById("viewListBtn");
    const gridBtn = document.getElementById("viewGridBtn");
    
    main.classList.remove("view-list", "view-grid");
    main.classList.add(`view-${mode}`);
    
    if(mode === 'list') {
        listBtn.classList.add("active");
        gridBtn.classList.remove("active");
    } else {
        listBtn.classList.remove("active");
        gridBtn.classList.add("active");
    }
}

async function updateProgress(mediaId, delta) {
  const token = localStorage.getItem("anilist_token");
  if (!token) return await openAuthWindow();

  const state = animeState[mediaId];
  if (!state) return;

  const currentProgress = state.progress;
  const newProgress = Math.max(0, currentProgress + delta);
  if (newProgress === currentProgress) return;

  // Optimistic Update
  animeState[mediaId].progress = newProgress;
  updateCardUI(mediaId);

  // Background sync - no UI blocking text
  // const statusEl = document.getElementById("status");
  // statusEl.textContent = translations[lang].statusUpdating;
  // statusEl.style.opacity = 1;

  try {
    await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify({
        query: `mutation ($mediaId: Int, $progress: Int) { SaveMediaListEntry(mediaId: $mediaId, progress: $progress) { id progress } }`,
        variables: { mediaId, progress: newProgress },
      }),
    });
    
    // Debounce refresh
    clearTimeout(fetchDebounceTimer);
    fetchDebounceTimer = setTimeout(() => fetchData(false), 2000);

  } catch (error) {
    console.error(error);
    // statusEl.textContent = translations[lang].statusError;
    // Rollback on error
    animeState[mediaId].progress = currentProgress;
    updateCardUI(mediaId);
  }
  
  // setTimeout(() => { statusEl.style.opacity = 0; }, 2000);
}

function updateCardUI(mediaId) {
    const state = animeState[mediaId];
    const card = document.getElementById(`anime-${mediaId}`);
    if (!card || !state) return;

    const displayTotal = state.total || state.released;
    const diff = state.released - state.progress;
    const progressPercent = Math.min(100, (state.progress / (displayTotal || 1)) * 100);
    const t = translations[lang];

    // Update Progress Bar
    const bar = card.querySelector(".progress-bar");
    bar.style.width = `${progressPercent}%`;
    card.querySelector(".progress-bar-container").title = `Progression: ${state.progress}/${state.total || state.released}`;

    // Update Episode Text & Badge
    const footer = card.querySelector(".card-footer");
    const epText = footer.querySelector(".current-ep-num");
    if (epText) epText.textContent = `${state.progress}/${displayTotal || '?'}`;

    const badge = footer.querySelector(".badge");
    if (badge) {
        badge.className = `badge ${diff > 0 ? 'late' : 'ok'}`;
        badge.textContent = diff > 0 ? t.late(diff) : t.upToDate;
    }
}


async function fetchData(isManual = false) {
  const t = translations[lang];
  const listEl = document.getElementById("animeList");
  const loginSection = document.getElementById("loginSection");
  const emptyState = document.getElementById("emptyState");
  const token = localStorage.getItem("anilist_token");
  const statusEl = document.getElementById("status");
  const loadingLine = document.getElementById("loadingLine");
  const lastUpdatedEl = document.getElementById("lastUpdated");

  if (!token) {
    loginSection.style.display = "flex";
    emptyState.style.display = "none";
    listEl.innerHTML = "";
    return;
  }
  
  loginSection.style.display = "none";

  if (isManual) {
      statusEl.textContent = t.refreshing;
      statusEl.style.opacity = 1;
      loadingLine.classList.add("active");
      loadingLine.classList.remove("finished");
      loadingLine.style.width = "50%"; // Fake progress
  }

  try {
    if (isFetching) return;
    isFetching = true;

    const response = await fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ query: `query { Viewer { id } }` }),
    });

    if (response.status === 429) {
        console.warn("Rate Limit Exceeded");
        if(isManual) statusEl.textContent = "Rate Limit (Wait)";
        isFetching = false;
        loadingLine.classList.remove("active");
        return;
    }

    const viewer = await response.json();
    if(!viewer.data) throw new Error("Auth Error");

    if (isManual) loadingLine.style.width = "80%";

    const data = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify({
        query: `query ($userId: Int) {
          MediaListCollection(userId: $userId, type: ANIME, status: CURRENT) {
            lists { entries { mediaId progress updatedAt media { id title { romaji } siteUrl status episodes nextAiringEpisode { airingAt episode } coverImage { large } } } }
          }
        }`,
        variables: { userId: viewer.data.Viewer.id },
      }),
    }).then(r => r.json());

    let entries = data.data.MediaListCollection.lists.flatMap(l => l.entries)
      .filter(e => e.media.nextAiringEpisode && e.media.status === "RELEASING");

    const sortBy = localStorage.getItem("sort_by") || "next";
    const order = localStorage.getItem("sort_order") || "asc";
    const dir = order === "asc" ? 1 : -1;

    entries.sort((a, b) => {
      if (sortBy === "name") return dir * a.media.title.romaji.localeCompare(b.media.title.romaji);
      if (sortBy === "updated") return dir * ((a.updatedAt||0) - (b.updatedAt||0));
      return dir * (a.media.nextAiringEpisode.airingAt - b.media.nextAiringEpisode.airingAt);
    });

    listEl.innerHTML = "";
    
    if (entries.length === 0) {
        emptyState.style.display = "flex";
    } else {
        emptyState.style.display = "none";
        entries.forEach(entry => {
            const title = entry.media.title.romaji;
            const isWrap = localStorage.getItem("wrap_titles") !== "false";
            const displayTitle = (!isWrap && title.length > 19) ? title.substring(0, 19) + "..." : title;
            
            const episode = entry.media.nextAiringEpisode.episode;
            const date = new Date(entry.media.nextAiringEpisode.airingAt * 1000)
                .toLocaleDateString(lang, {weekday:'short', hour:'2-digit', minute:'2-digit'});
                        const progress = entry.progress || 0;
            const released = episode - 1;
            const diff = released - progress;
            const totalEps = entry.media.episodes;
            const displayTotal = totalEps || released;
            const progressPercent = Math.min(100, (progress / (displayTotal || 1)) * 100);

            // Update State
            animeState[entry.mediaId] = {
                progress: progress,
                total: totalEps,
                released: released,
                next: episode
            };

            const card = document.createElement("div");
            card.className = "anime-card";
            card.id = `anime-${entry.mediaId}`;
            card.innerHTML = `
                <img src="${entry.media.coverImage.large}" class="anime-cover" alt="cover">
                <div class="anime-details">
                    <a href="#" class="anime-title" title="${title}">${displayTitle}</a>
                    <div class="anime-meta">
                        <span class="episode-info">Ep. ${episode} • ${date}</span>
                    </div>
                    <div class="progress-bar-container" title="Progression: ${progress}/${totalEps || released}">
                        <div class="progress-bar" style="width: ${progressPercent}%"></div>
                    </div>
                    <div class="card-footer">
                        <div class="progress-info">
                            <div class="current-ep-num">${progress}/${displayTotal || '?'}</div>
                            <div class="badge ${diff > 0 ? 'late' : 'ok'}">${diff > 0 ? t.late(diff) : t.upToDate}</div>
                        </div>
                        <div class="actions">
                             <button class="btn-action dec">−</button>
                             <button class="btn-action inc">+</button>
                        </div>
                    </div>
                </div>`;

            // Listeners
            const openLink = (e) => { 
                e.preventDefault(); 
                e.stopPropagation(); 
                window.electron.ipcInvoke("open-link", entry.media.siteUrl); 
            };
            
            card.addEventListener("click", openLink);
            card.querySelector(".dec").addEventListener("click", (e) => { e.stopPropagation(); updateProgress(entry.mediaId, -1); });
            card.querySelector(".inc").addEventListener("click", (e) => { e.stopPropagation(); updateProgress(entry.mediaId, 1); });
            listEl.appendChild(card);
        });
    }

    // Success Update
    const now = new Date().toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });
    lastUpdatedEl.textContent = t.lastUpdate + now;

  } catch (e) { 
      console.error(e); 
      if(isManual) statusEl.textContent = t.statusError;
  } finally { 
      isFetching = false; 
      if (isManual) {
          loadingLine.style.width = "100%";
          setTimeout(() => {
              statusEl.style.opacity = 0;
              loadingLine.classList.add("finished");
              loadingLine.classList.remove("active");
              loadingLine.style.width = "0%";
          }, 500);
      }
  }
}

function applyTranslations() {
    const t = translations[lang];
    const setText = (id, txt) => { const el = document.getElementById(id); if(el) el.textContent = txt; };
    setText("settingsTitle", t.settingsTitle);
    setText("logoutBtn", t.logout);
    setText("labelTheme", t.labelTheme);
    setText("labelLanguage", t.labelLanguage);
    setText("labelRefresh", t.labelRefresh);
    setText("labelSortBy", t.labelSortBy);
    setText("labelSortOrder", t.labelSortOrder);
    setText("labelTop", t.labelTop);
    setText("labelTruncate", t.labelTruncate);
    setText("labelShowEp", t.labelShowEp);
    setText("labelShowProgress", t.labelShowProgress);
    setText("labelImageSize", t.labelImageSize);
    setText("optSmall", t.optSmall);
    setText("optMedium", t.optMedium);
    setText("optLarge", t.optLarge);

    // Nouvelles traductions pour les menus déroulants
    setText("opt30m", t.opt30m);
    setText("opt1h", t.opt1h);
    setText("opt2h", t.opt2h);
    setText("optSortNext", t.optSortNext);
    setText("optSortUpdated", t.optSortUpdated);
    setText("optSortName", t.optSortName);
    setText("optOrderAsc", t.optOrderAsc);
    setText("optOrderDesc", t.optOrderDesc);
}

// --- INIT ---
document.addEventListener("DOMContentLoaded", () => {
  applyTheme(currentTheme);
  switchView(viewMode);
  applyTranslations();

  // === HEADER ===
  document.getElementById("viewListBtn").addEventListener("click", () => switchView('list'));
  document.getElementById("viewGridBtn").addEventListener("click", () => switchView('grid'));
  document.getElementById("refreshBtn").addEventListener("click", () => fetchData(true));
  document.getElementById("closeBtn").addEventListener("click", () => window.electron.ipcInvoke("close-app"));
  document.getElementById("settingsBtn").addEventListener("click", () => document.getElementById("settingsPanel").style.display = "flex");

  // === SETTINGS ===
  const closeSettings = () => document.getElementById("settingsPanel").style.display = "none";
  document.getElementById("closeSettingsBtn").addEventListener("click", closeSettings);
  document.getElementById("settingsPanel").addEventListener("click", (e) => { if(e.target.id === "settingsPanel") closeSettings(); });

  // Inputs - Remplissage
  const setVal = (id, key, def) => { 
      const el = document.getElementById(id); 
      if(el) {
          el.value = localStorage.getItem(key) || def; 
          el.addEventListener("change", (e) => {
             localStorage.setItem(key, e.target.value);
             if(id === 'defaultTheme') location.reload();
             if(id === 'refreshRate') {
                 clearInterval(refreshInterval);
                 refreshInterval = setInterval(fetchData, parseInt(e.target.value));
             }
             if(id === 'languageSelect') location.reload();
             if(['sortBy', 'sortOrder'].includes(id)) fetchData();
          });
      }
  };
  
  setVal("defaultTheme", "selected_theme", "0");
  setVal("languageSelect", "lang", "fr");
  setVal("refreshRate", "refresh_rate", "3600000");
  setVal("sortBy", "sort_by", "next");
  setVal("sortOrder", "sort_order", "asc");

  const setCheck = (id, key, bodyClass = null) => {
      const el = document.getElementById(id);
      if(el) {
          const saved = localStorage.getItem(key);
          el.checked = saved === null ? true : saved === "true"; // Default true
          
          if(bodyClass) {
             // Logic inversée pour hide-xxx ou standard pour wrap-xxx
             // Si checked=true, on veut afficher => remove hide class
             // Si checked=false, on veut cacher => add hide class
             const isHideClass = bodyClass.startsWith('hide-');
             if(isHideClass) {
                 document.body.classList.toggle(bodyClass, !el.checked);
             } else {
                 document.body.classList.toggle(bodyClass, el.checked);
             }
          }

          el.addEventListener("change", (e) => {
             localStorage.setItem(key, e.target.checked);
             if(id === 'alwaysOnTop') window.electron.ipcInvoke("set-always-on-top", e.target.checked);
             
             if(bodyClass) {
                 const isHideClass = bodyClass.startsWith('hide-');
                 if(isHideClass) {
                     document.body.classList.toggle(bodyClass, !e.target.checked);
                 } else {
                     document.body.classList.toggle(bodyClass, e.target.checked);
                 }
             }

             if(id === 'wrapTitles') fetchData(false);
          });
      }
  }
  setCheck("alwaysOnTop", "always_on_top");
  setCheck("wrapTitles", "wrap_titles", "wrap-titles");
  setCheck("showEpisodeNumber", "show_ep_num", "hide-ep-num");
  setCheck("showProgressBar", "show_progress", "hide-progress");

  // Image Size Select
  const sizeSelect = document.getElementById("imageSizeSelect");
  if(sizeSelect) {
      const savedSize = localStorage.getItem("image_size") || "medium";
      sizeSelect.value = savedSize;
      document.body.classList.add(`size-${savedSize}`);
      
      sizeSelect.addEventListener("change", (e) => {
          const newSize = e.target.value;
          document.body.classList.remove("size-small", "size-medium", "size-large");
          document.body.classList.add(`size-${newSize}`);
          localStorage.setItem("image_size", newSize);
      });
  }

  // === AUTH ===
  const loginBtn = document.getElementById("loginBtn");
  if(loginBtn) loginBtn.addEventListener("click", openAuthWindow);
  
  document.getElementById("logoutBtn").addEventListener("click", () => {
      localStorage.removeItem("anilist_token");
      location.reload();
  });

  // START
  fetchData();
  refreshInterval = setInterval(fetchData, parseInt(localStorage.getItem("refresh_rate") || 3600000));
});