import { app, BrowserWindow } from 'electron';
import { join } from 'path';

app.commandLine.appendSwitch('remote-debugging-port', '9222');
app.commandLine.appendSwitch('remote-allow-origins', '*');

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    title: 'Alfred',
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.webContents.openDevTools();

  const url = process.env.VITE_DEV_SERVER_URL;
  if (url) {
    mainWindow.loadURL(url);
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});

export { mainWindow };
