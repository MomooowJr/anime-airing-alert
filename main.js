const { app, BrowserWindow, ipcMain, shell, Tray, Menu } = require('electron');
const path = require('path');

let mainWindow;
let authWindow;
let tray;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 500,
    frame: false,
    transparent: true,
    resizable: false,
    hasShadow: true,
    skipTaskbar: false,
    vibrancy: 'ultra-dark',
    alwaysOnTop: true,
    icon: path.join(__dirname, 'assets', 'icons', 'icon_64.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile('index.html');

  // Ouvre les DevTools si besoin :
  // mainWindow.webContents.openDevTools();

  // Gestion des liens externes
  ipcMain.handle('open-link', (event, url) => {
    shell.openExternal(url);
  });

  ipcMain.handle('set-always-on-top', (event, flag) => {
    mainWindow.setAlwaysOnTop(flag);
  });

  ipcMain.handle('close-app', () => {
    mainWindow.hide(); // ne ferme pas vraiment
  });

  ipcMain.handle('minimize-app', () => {
    mainWindow.minimize();
  });

  ipcMain.handle('open-auth-window', async () => {
    return new Promise((resolve, reject) => {
      authWindow = new BrowserWindow({
        width: 500,
        height: 600,
        show: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      });

      authWindow.loadURL('https://anilist.co/api/v2/oauth/authorize?client_id=16950&response_type=token');

      authWindow.webContents.on('will-redirect', (event, url) => {
        if (url.includes('access_token=')) {
          const tokenMatch = url.match(/access_token=([^&]+)/);
          if (tokenMatch) {
            resolve(tokenMatch[1]);
            authWindow.close();
          }
        }
      });

      authWindow.on('closed', () => {
        reject(new Error('Fenêtre de connexion fermée sans autorisation'));
      });
    });
  });

  mainWindow.on('close', (e) => {
    e.preventDefault();
    mainWindow.hide(); // cache au lieu de quitter
  });

  setupTray();
}

function setupTray() {
  const iconPath = path.join(__dirname, 'assets', 'icons', 'icon_64.png');

  try {
    tray = new Tray(iconPath);
    console.log("✅ Icône de tray chargée :", iconPath);

    const contextMenu = Menu.buildFromTemplate([
      { label: 'Afficher', click: () => mainWindow.show() },
      { type: 'separator' },
      { label: 'Quitter', click: () => {
          tray.destroy();
          app.quit();
        }
      }
    ]);

    tray.setToolTip('Anime Airing Alert');
    tray.setContextMenu(contextMenu);

    tray.on('double-click', () => {
      mainWindow.show();
    });

  } catch (err) {
    console.error("❌ Impossible de charger l’icône pour la tray :", err.message);
  }
}

app.whenReady().then(createMainWindow);

app.setLoginItemSettings({
	openAtLogin: true,
	path: process.execPath
  });
  

app.on('window-all-closed', () => {
  // Ne quitte pas automatiquement : on reste actif en fond
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
});

app.on('before-quit', () => {
  if (tray) tray.destroy();
});

