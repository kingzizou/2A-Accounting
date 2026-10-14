const { app, BrowserWindow, dialog, shell, ipcMain, net } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    icon: path.join(__dirname, 'build', 'icon.png'),
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile('index.html');

  // Safety net: if anything ever tries to navigate this window to an outside web address, send it to
  // the person's normal web browser instead and leave this window exactly where it was.
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // Electron denies window.open by default unless a handler explicitly allows it. Same rule as
  // will-navigate above: outside links go to the person's normal browser, never into a new window
  // inside this app.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Every print/certificate screen opens its preview with window.open("", "_blank") and then
    // fills it in with document.write() — the URL for that is "about:blank". That must be allowed
    // to open as a real window inside the app; otherwise it falls into the branch below and gets
    // handed to the OS as if it were an external link, and Windows has no app registered for
    // "about:blank" — which is exactly the "Get an app to open this 'about' link" dialog.
    if (url === 'about:blank') {
      // These windows get their own "Save as PDF" button (see renderer), which calls
      // webContents.printToPDF() on THIS window via IPC — that only works if this window has
      // the same preload bridge as the main window, since a window opened this way doesn't
      // inherit webPreferences from its opener by default.
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
          }
        }
      };
    }
    if (!url.startsWith('file://')) shell.openExternal(url);
    return { action: 'deny' };
  });
}

// Saves whichever window called this (the main app window, for a report, or a print-preview child
// window opened via window.open — both carry the same preload bridge) as a PDF, via a native Save
// dialog. Renders using the page's own @media print CSS, same visual result as the Print button.
ipcMain.handle('save-as-pdf', async (event, defaultName, pdfOptions) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return { ok: false, error: 'No window' };
  try {
    // Document numbers contain "/" (e.g. INV/2026/1) which the OS treats as folders in a file name —
    // swap anything a file name can't contain for "-" and always end in .pdf.
    let safe = String(defaultName || 'document.pdf').replace(/[\\/:*?"<>|]+/g, '-').trim() || 'document.pdf';
    if (!/\.pdf$/i.test(safe)) safe += '.pdf';
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: 'Save as PDF',
      defaultPath: path.join(app.getPath('documents'), safe),
      filters: [{ name: 'PDF Document', extensions: ['pdf'] }]
    });
    if (canceled || !filePath) return { ok: false, canceled: true };
    const buffer = await win.webContents.printToPDF(pdfOptions || {});
    fs.writeFileSync(filePath, buffer);
    return { ok: true, filePath };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// Prints THIS window through the normal print dialog, but without Chrome's automatic date/title
// header and URL footer (they only appear when header/footer strings are passed, so we don't pass any).
// The page's own CSS supplies the "Page X of Y" number.
ipcMain.handle('print-page', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return { ok: false, error: 'No window' };
  return await new Promise((resolve) => {
    win.webContents.print({ silent: false, printBackground: true }, (success, failureReason) => {
      resolve(success ? { ok: true } : { ok: false, canceled: /cancel/i.test(failureReason || ''), error: failureReason });
    });
  });
});

// Generic "save this data to a file the person picks" — used for Excel (.xlsx) export, but written
// generically (caller supplies the extension/filter) in case other export formats are added later.
ipcMain.handle('save-binary-file', async (event, defaultName, base64Data, extension, typeLabel) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'Save File',
    defaultPath: defaultName,
    filters: [{ name: typeLabel || 'File', extensions: [extension || '*'] }]
  });
  if (canceled || !filePath) return { ok: false, canceled: true };
  try {
    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
    return { ok: true, filePath };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// License registration: the page sends the registration details to the developer's Make.com webhook
// (same one the Excel version used). Done here in the main process rather than with fetch() in the
// page so browser cross-origin rules can't block it. Only https URLs on hook.*.make.com are allowed,
// so the page can't use this bridge to reach anywhere else.
ipcMain.handle('register-license', async (_event, url) => {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' || !/^hook\.[a-z0-9-]+\.make\.com$/i.test(u.hostname)) {
      return { ok: false, error: 'Blocked URL' };
    }
    const res = await net.fetch(u.toString(), { method: 'PATCH', headers: { 'Content-Type': 'application/json' } });
    return { ok: true, text: await res.text() };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  // Check for updates shortly after launch, and again periodically for anyone who
  // leaves the app open a long time. Downloads happen silently in the background —
  // the person is only interrupted once, to ask whether to restart and install.
  checkForUpdates();
  setInterval(checkForUpdates, 4 * 60 * 60 * 1000); // every 4 hours
});

function checkForUpdates() {
  autoUpdater.checkForUpdates().catch(err => {
    // Most common cause: no internet right now, or no release published yet.
    // Never interrupt the person for this — just try again next interval.
    console.error('Update check failed:', err.message);
  });
}

autoUpdater.on('update-downloaded', (info) => {
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Update ready',
    message: `Version ${info.version} has been downloaded.`,
    detail: 'Restart now to install it, or keep working and it will install next time you close the app.',
    buttons: ['Restart Now', 'Later'],
    defaultId: 0,
    cancelId: 1
  }).then(result => {
    if (result.response === 0) autoUpdater.quitAndInstall();
  });
});

autoUpdater.on('error', (err) => {
  console.error('Auto-updater error:', err);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
