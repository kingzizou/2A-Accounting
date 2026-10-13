const { contextBridge, ipcRenderer } = require('electron');

// The narrow bridge between the page (index.html) and Electron — contextIsolation stays on, and the
// page gets only these functions, not Node or Electron internals.
contextBridge.exposeInMainWorld('electronAPI', {
  // Sends the license registration to the Make.com webhook via the main process (see main.js).
  registerLicense: (url) => ipcRenderer.invoke('register-license', url),
  // Saves THIS window (the page that calls it) to a PDF file the person picks, via the OS Save
  // dialog — no print dialog involved. pdfOptions matches Electron's webContents.printToPDF options
  // (e.g. { landscape: true }).
  saveAsPDF: (defaultName, pdfOptions) => ipcRenderer.invoke('save-as-pdf', defaultName, pdfOptions),
  // Saves arbitrary base64-encoded file content (e.g. an .xlsx workbook built in the page) to a file
  // the person picks, via the OS Save dialog.
  saveBinaryFile: (defaultName, base64Data, extension, typeLabel) => ipcRenderer.invoke('save-binary-file', defaultName, base64Data, extension, typeLabel)
});
