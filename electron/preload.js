const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectFiles: () => ipcRenderer.invoke('select-files'),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  selectWatermark: () => ipcRenderer.invoke('select-watermark'),
  selectReferenceImage: () => ipcRenderer.invoke('select-reference-image'),
  processImage: (data) => ipcRenderer.invoke('process-image', data),
  generateMeta: (data) => ipcRenderer.invoke('generate-meta', data),
  generateAltText: (data) => ipcRenderer.invoke('generate-alt-text', data),
  generateImageFromText: (data) => ipcRenderer.invoke('generate-image-from-text', data),
  validatePath: (data) => ipcRenderer.invoke('validate-path', data),
  optimizeFilename: (data) => ipcRenderer.invoke('optimize-filename', data),
});

