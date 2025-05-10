const { contextBridge, ipcRenderer, shell } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  openExternal: (url) => shell.openExternal(url),
  ipcInvoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args)
});
