const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  toggleFullscreen: () => ipcRenderer.send('window-toggle-fullscreen'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  checkForUpdates: () => ipcRenderer.send('app-check-update'),
  onUpdateAvailable: (callback) => ipcRenderer.on('app-update-available', (_event, value) => callback(value)),
});
