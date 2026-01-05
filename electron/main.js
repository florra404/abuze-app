const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

// Логирование
const log = require('electron-log');
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false, // <--- ОТКЛЮЧАЕМ СТАНДАРТНУЮ РАМКУ WINDOWS
    titleBarStyle: 'hidden', // Скрываем системные кнопки
    backgroundColor: '#000000',
    icon: path.join(__dirname, '../public/icon.ico'), // Убедись, что icon.ico есть в public
    webPreferences: {
      nodeIntegration: true, // Включаем, чтобы работало ipcRenderer
      contextIsolation: false, // Для упрощения работы с кастомным окном
      // В продакшене лучше использовать preload, но для простоты оставим так
    },
  });

  const startUrl = process.env.ELECTRON_START_URL || `file://${path.join(__dirname, '../dist/index.html')}`;
  mainWindow.loadURL(startUrl);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    autoUpdater.checkForUpdatesAndNotify();
  });
}

// --- ОБРАБОТЧИКИ КНОПОК КАСТОМНОГО ОКНА ---
ipcMain.on('app-minimize', () => {
  mainWindow.minimize();
});

ipcMain.on('app-close', () => {
  mainWindow.close();
});

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Авто-обновление (оставляем как было)
autoUpdater.on('update-available', () => {
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Update Available',
    message: 'Downloading new version...',
  });
});

autoUpdater.on('update-downloaded', () => {
  dialog.showMessageBox(mainWindow, {
    type: 'question',
    title: 'Update Ready',
    message: 'Update downloaded. Restart?',
    buttons: ['Yes', 'Later']
  }).then((result) => {
    if (result.response === 0) autoUpdater.quitAndInstall();
  });
});