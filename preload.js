const { contextBridge, ipcRenderer, shell } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  ipcInvoke: (channel, data) => ipcRenderer.invoke(channel, data),
  openExternal: (url) => shell.openExternal(url)
});
