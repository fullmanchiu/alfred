import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  appInfo: () => ipcRenderer.invoke('app:info'),

  on: (channel: string, callback: (...args: any[]) => void) => {
    const subscription = (_event: any, ...args: any[]) => callback(...args);
    ipcRenderer.on(channel, subscription);
    return () => ipcRenderer.removeListener(channel, subscription);
  },
  off: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.removeListener(channel, callback);
  },
  send: (channel: string, ...args: any[]) => {
    ipcRenderer.send(channel, ...args);
  },
  invoke: (channel: string, ...args: any[]) => {
    return ipcRenderer.invoke(channel, ...args);
  },
});
