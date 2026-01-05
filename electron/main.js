const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

// Настройка логов
log.transports.file.level = 'debug'; // Пишем всё подробно
autoUpdater.logger = log;

// --- ВАЖНЫЙ ФИКС ДЛЯ 0% ---
// Отключаем проверку подписи, так как у нас нет платного сертификата
autoUpdater.verifyUpdateCodeSignature = false; 

// Настройки скачивания
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

let mainWindow;
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#000000',
    icon: path.join(__dirname, '../public/icon.ico'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  const startUrl = process.env.ELECTRON_START_URL || `file://${path.join(__dirname, '../dist/index.html')}`;
  mainWindow.loadURL(startUrl);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    // Проверяем обновления тихо
    autoUpdater.checkForUpdates();
  });
}

// --- ЛОГИКА ОБНОВЛЕНИЯ (Связь с React) ---

// 1. Обновление найдено -> Сообщаем React
autoUpdater.on('update-available', () => {
  mainWindow.webContents.send('update_available');
});

// 2. Идет скачивание -> Шлем проценты
autoUpdater.on('download-progress', (progressObj) => {
  mainWindow.webContents.send('update_progress', progressObj.percent);
});

// 3. Скачалось -> Готово к установке
autoUpdater.on('update-downloaded', () => {
  mainWindow.webContents.send('update_downloaded');
});

// Обработчик кнопки "Перезапустить" из React
ipcMain.on('restart_app', () => {
  autoUpdater.quitAndInstall();
});

// Кнопки окна
ipcMain.on('app-minimize', () => mainWindow.minimize());
ipcMain.on('app-close', () => mainWindow.close());

app.on('ready', createWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});