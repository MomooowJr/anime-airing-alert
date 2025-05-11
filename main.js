const { app, BrowserWindow, ipcMain, shell, Tray, Menu } = require('electron');
const path = require('path');
const Store = require('electron-store');

let mainWindow;
let tray;
const store = new Store();

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: store.get('windowWidth', 400),
    height: store.get('windowHeight', 500),
    minWidth: 240,
    minHeight: 250,
	icon: path.join(__dirname, 'assets', 'icons', 'icon_64.png'),
    frame: false,
    transparent: true,
    resizable: true,
    vibrancy: 'ultra-dark',
    alwaysOnTop: store.get('alwaysOnTop', true),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile('index.html');

  // Save window size on resize
  mainWindow.on('resize', () => {
    const [width, height] = mainWindow.getSize();
    store.set('windowWidth', width);
    store.set('windowHeight', height);
  });

  mainWindow.on('close', (e) => {
    if (!app.isQuiting) {
      e.preventDefault();
      mainWindow.hide();
    }
    return false;
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function setupTray() {
  const iconPath = path.join(__dirname, 'assets', 'icons', 'icon_64.png');
  tray = new Tray(iconPath);

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Afficher', click: () => mainWindow.show() },
    { type: 'separator' },
    {
      label: 'Quitter',
      click: () => {
        app.isQuiting = true;
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
}

ipcMain.handle('open-link', (event, url) => {
  shell.openExternal(url);
});

ipcMain.handle('set-always-on-top', (event, flag) => {
  mainWindow.setAlwaysOnTop(flag);
  store.set('alwaysOnTop', flag);
});

ipcMain.handle('close-app', () => {
  if (mainWindow) mainWindow.hide(); // 👈 on cache au lieu de quitter
});

ipcMain.handle('minimize-app', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('open-auth-window', async () => {
  return new Promise((resolve, reject) => {
    const authWindow = new BrowserWindow({
      width: 500,
      height: 600,
      show: true,
      parent: mainWindow,
      modal: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    const authUrl = 'https://anilist.co/api/v2/oauth/authorize?client_id=16950&response_type=token';
    authWindow.loadURL(authUrl);

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

app.whenReady().then(() => {
  createMainWindow();
  setupTray();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
});
