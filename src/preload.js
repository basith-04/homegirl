'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('homegirl', {
  getDebug: () => ipcRenderer.invoke('homegirl:get-debug'), getChatHistory: () => ipcRenderer.invoke('homegirl:get-chat-history'), dismissBlackout: () => ipcRenderer.invoke('homegirl:dismiss-blackout'), simulate: (app) => ipcRenderer.invoke('homegirl:simulate', app), userMessage: (text) => ipcRenderer.invoke('homegirl:user-message', text), parseAi: (text) => ipcRenderer.invoke('homegirl:parse-ai', text), control: (action) => ipcRenderer.invoke('homegirl:control', action),
  onSay: (callback) => ipcRenderer.on('homegirl:say', (_, value) => callback(value)), onTyping: (callback) => ipcRenderer.on('homegirl:typing', (_, value) => callback(value)), onEmote: (callback) => ipcRenderer.on('homegirl:emote', (_, value) => callback(value)), onFakeScreenOff: (callback) => ipcRenderer.on('homegirl:fake-screen-off', () => callback()), onDebug: (callback) => ipcRenderer.on('homegirl:debug', (_, value) => callback(value))
});
