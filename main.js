const { app, BrowserWindow, ipcMain, shell, Tray, Menu } = require('electron');
const path = require('path');

let mainWindow;
let authWindow;
let tray;

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
    }
  });
}

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

  ipcMain.handle('open-link', (event, url) => {
    shell.openExternal(url);
  });

  ipcMain.handle('set-always-on-top', (event, flag) => {
    mainWindow.setAlwaysOnTop(flag);
  });

  ipcMain.handle('close-app', () => {
    console.log("🔕 Demande de hide fenêtre (close-app)");
    mainWindow.hide();
  });

  ipcMain.handle('minimize-app', () => {
    mainWindow.minimize();
  });

  ipcMain.handle('force-quit', () => {
    console.log("📤 Quit demandé (force)");
    app.isQuitting = true;
    if (tray) tray.destroy();
    app.quit();
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
    if (!app.isQuitting) {
      e.preventDefault();
      console.log("🧊 Fenêtre cachée (pas fermée)");
      mainWindow.hide();
    } else {
      console.log("🔚 Fermeture réelle autorisée");
    }
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
      {
        label: 'Quitter', click: () => {
          console.log("❌ Quit via systray");
          app.isQuitting = true;
          if (tray) tray.destroy();
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
    console.error("❌ Impossible de charger l’icône tray :", err.message);
  }
}

app.on('before-quit', () => {
  console.log("💀 before-quit déclenché");
  if (tray) tray.destroy();
});

app.on('quit', () => {
  console.log("💥 App quit triggered");
});

app.whenReady().then(() => {
  createMainWindow();

  app.setLoginItemSettings({
    openAtLogin: true,
    path: process.execPath
  });
});

app.on('window-all-closed', () => {
  // On ne ferme rien, car on utilise systray
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
});
