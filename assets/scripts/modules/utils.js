export function applyTheme(index) {
  const themes = ["theme-dark", "theme-light", "theme-neon", "theme-neo"];
  document.body.classList.remove(...themes);
  document.body.classList.add(themes[index]);
  localStorage.setItem("selected_theme", index);
}

export function applyResponsiveLayout() {
  const width = window.innerWidth;

  document.body.classList.toggle("no-images", width < 280);
  document.body.classList.toggle("compact", width < 240);
  document.body.classList.toggle("hide-title", width < 200);
}
