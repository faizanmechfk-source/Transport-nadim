const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const url = require('url');
const fs = require('fs');

let mainWindow;
let splashWindow;

function createSplashWindow() {
  const iconPath = path.join(__dirname, 'icon.ico');
  splashWindow = new BrowserWindow({
    width: 520,
    height: 340,
    frame: false,
    alwaysOnTop: true,
    transparent: true,
    center: true,
    resizable: false,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      nodeIntegration: false,
    },
  });

  const splashHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            margin: 0;
            background: #1e3a8a;
            color: #ffffff;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            border-radius: 12px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
            user-select: none;
          }
          h1 { margin: 0; font-size: 28px; letter-spacing: 1px; }
          p { margin: 8px 0 24px; color: #93c5fd; font-size: 14px; }
          .loader {
            width: 48px;
            height: 48px;
            border: 4px solid #3b82f6;
            border-top: 4px solid #ffffff;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          .footer { position: absolute; bottom: 16px; font-size: 11px; color: #60a5fa; }
        </style>
      </head>
      <body>
        <h1>TRANSPORT ENTRY</h1>
        <p>Production Transport & Billing Management</p>
        <div class="loader"></div>
        <div class="footer">Loading local storage & database... v1.0.0</div>
      </body>
    </html>
  `;

  splashWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(splashHtml));
}

function createMainWindow() {
  const iconPath = path.join(__dirname, 'icon.ico');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 700,
    title: 'TRANSPORT ENTRY - Professional Transport Management',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  let indexPath = path.join(__dirname, '../dist/index.html');
  if (!fs.existsSync(indexPath)) {
    const localDist = path.join(__dirname, 'dist/index.html');
    if (fs.existsSync(localDist)) {
      indexPath = localDist;
    } else {
      indexPath = path.join(app.getAppPath(), 'dist/index.html');
    }
  }

  const startUrl = process.env.ELECTRON_START_URL || url.format({
    pathname: indexPath,
    protocol: 'file:',
    slashes: true,
  });

  mainWindow.loadURL(startUrl);

  mainWindow.once('ready-to-show', () => {
    setTimeout(() => {
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.close();
      }
      mainWindow.show();
    }, 1200);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers for Windows Titlebar & Controls
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.on('window-toggle-fullscreen', () => {
  if (mainWindow) {
    mainWindow.setFullScreen(!mainWindow.isFullScreen());
  }
});

ipcMain.handle('window-is-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

// Auto-updater placeholder setup (electron-updater compatible)
app.whenReady().then(() => {
  createSplashWindow();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
