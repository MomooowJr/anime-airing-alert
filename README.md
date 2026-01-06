# Anime Airing Alert

> 🇬🇧 English version | 🇫🇷 Version française plus bas

---

## 🇬🇧 English

**Anime Airing Alert** is a lightweight, modern floating widget built with **Electron** that keeps you updated on upcoming anime episodes using data from [Anilist](https://anilist.co).

### 🎯 Features

- **Watchlist Synchronization**: Automatically displays upcoming episodes from your current Anilist watchlist (limited to series currently airing with "Releasing" status).
- **Dual View Modes**: Switch between a detailed **List view** and a beautiful **Grid view**.
- **Real-time Tracking**: Update your progress directly from the widget (updates are instant and synced in the background).
- **Smart Episode Handling**: Correctly handles long-running series (like One Piece) by showing progress relative to current airings even when total episodes are unknown.
- **Advanced Settings**:
  - **Themes**: Choose from 7 premium themes (Glass, OLED, Cyberpunk, Light, Dracula, Nord, Forest).
  - **Customizable Sizes**: Choose between Small, Medium, and Large image cards.
  - **UI Toggles**: Show/hide progress bars, episode numbers, or toggle title truncation (Compact vs Full titles).
  - **Adjustable Frequency**: Set how often the app syncs your data.
- **Robust Performance**: Built-in protection against API Rate Limits (429 errors).
- **Multilingual**: Full support for English and French.
- **Native Experience**: Floating window, "Always on Top" option, and sleek loading animations.

### ⚙️ Requirements

- **Node.js v18+** must be installed: [https://nodejs.org](https://nodejs.org)

### 📦 Installation

```bash
git clone https://github.com/MomooowJr/anime-airing-alert.git
cd anime-airing-alert
npm install
npm start
```

### 🛠️ Build

To generate a standalone Windows **.exe** file:
```bash
npm run build
```
The build will be available in the `dist/` folder.

### 📜 License

MIT © Momooow Jr

---

## 🇫🇷 Français

**Anime Airing Alert** est un widget flottant léger et moderne, développé avec **Electron**, qui vous permet de suivre en temps réel la sortie de vos épisodes d’anime via [Anilist](https://anilist.co).

### 🎯 Fonctionnalités

- **Synchronisation Anilist** : Affiche automatiquement les épisodes à venir de votre liste de lecture actuelle (uniquement pour les séries en cours de diffusion avec le statut "Releasing").
- **Double Mode d'Affichage** : Basculez entre une **vue Liste** détaillée et une **vue Grille** immersive.
- **Suivi en temps réel** : Mettez à jour votre progression directement depuis le widget (les changements sont instantanés et synchronisés en arrière-plan).
- **Gestion intelligente des épisodes** : Gère correctement les séries "infinies" (comme One Piece) en affichant votre progression par rapport aux sorties réelles.
- **Paramètres Avancés** :
  - **Thèmes** : Choisissez parmi 7 thèmes premium (Glass, OLED, Cyberpunk, Light, Dracula, Nord, Forest).
  - **Tailles Personnalisables** : Choisissez entre des cartes de taille Petite, Moyenne ou Grande.
  - **Options d'affichage** : Affichez/masquez les barres de progression, les numéros d'épisodes, ou activez le mode "Titres complets".
  - **Fréquence ajustable** : Réglez l'intervalle de rafraîchissement automatique.
- **Performance Robuste** : Protection intégrée contre les limites de l'API Anilist (erreurs 429).
- **Multilingue** : Support complet du Français et de l'Anglais.
- **Expérience Native** : Fenêtre flottante, option "Toujours au-dessus", et animations de chargement fluides.

### ⚙️ Prérequis

- **Node.js v18 ou supérieur** doit être installé : [https://nodejs.org](https://nodejs.org)

### 📦 Installation

```bash
git clone https://github.com/MomooowJr/anime-airing-alert.git
cd anime-airing-alert
npm install
npm start
```

### 🛠️ Compilation

Pour générer un fichier exécutable **.exe** pour Windows :

```bash
npm run build
```
Le fichier **.exe** sera disponible dans le dossier `dist/`.

### 📜 Licence

MIT © Momooow Jr