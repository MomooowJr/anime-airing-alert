export async function openAuthWindow() {
  try {
    const token = await window.electron.ipcInvoke("open-auth-window");
    localStorage.setItem("anilist_token", token);
    location.reload();
  } catch (error) {
    document.getElementById("status").textContent =
      "Connexion Anilist échouée.";
    console.error("Erreur d'authentification :", error);
  }
}
