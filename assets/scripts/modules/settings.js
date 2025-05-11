export function setupSettings(lang, translations, fetchData) {
  const t = translations[lang];
  const langSelect = document.getElementById("languageSelect");
  const themeSelect = document.getElementById("defaultTheme");
  const refreshRateSelect = document.getElementById("refreshRate");
  const alwaysOnTopCheckbox = document.getElementById("alwaysOnTop");

  // Langue
  langSelect.value = lang;
  langSelect.addEventListener("change", (e) => {
    const newLang = e.target.value;
    localStorage.setItem("lang", newLang);
    location.reload();
  });

  // Thème par défaut
  themeSelect.addEventListener("change", (e) => {
    const index = parseInt(e.target.value);
    localStorage.setItem("selected_theme", index);
    location.reload();
  });

  // Rafraîchissement
  refreshRateSelect.addEventListener("change", (e) => {
    const delay = parseInt(e.target.value);
    localStorage.setItem("refresh_rate", delay);
    clearInterval(window.refreshInterval);
    window.refreshInterval = setInterval(fetchData, delay);
  });

  // Always on top
  alwaysOnTopCheckbox.addEventListener("change", (e) => {
    const val = e.target.checked;
    localStorage.setItem("always_on_top", val);
    window.electron.ipcInvoke("set-always-on-top", val);
  });
}
