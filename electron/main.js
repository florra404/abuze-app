const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

// Включаем логирование обновлений
autoUpdater.logger = require("electron-log");
autoUpdater.logger.transports.file.level = "info";

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: "ABUZE.APP",
    icon: path.join(__dirname, '../public/icon.png'), // Нужна иконка! (об этом ниже)
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    backgroundColor: '#000000', // Чтобы не мигало белым при запуске
    autoHideMenuBar: true, // Скрываем стандартное меню (Файл, Правка...)
  });

  // В продакшене (exe) грузим файл, в разработке - локалхост
  const startUrl = process.env.ELECTRON_START_URL || `file://${path.join(__dirname, '../dist/index.html')}`;
  mainWindow.loadURL(startUrl);

  // Проверяем обновления сразу при запуске
  mainWindow.once('ready-to-show', () => {
    autoUpdater.checkForUpdatesAndNotify();
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// --- ЛОГИКА АВТО-ОБНОВЛЕНИЯ ---
autoUpdater.on('update-available', () => {
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Update Available',
    message: 'A new version of ABUZE.APP is available. Downloading now...',
  });
});

autoUpdater.on('update-downloaded', () => {
  dialog.showMessageBox(mainWindow, {
    type: 'question',
    title: 'Update Ready',
    message: 'Update downloaded. Restart now to install?',
    buttons: ['Yes', 'Later']
  }).then((result) => {
    if (result.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });
});