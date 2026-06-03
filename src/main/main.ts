import { BrowserWindow, Menu, Notification, app, ipcMain } from 'electron';
import { UpdateSourceType, makeUserNotifier, updateElectronApp } from 'update-electron-app';

import { IPC_CHANNELS } from '../shared/constants';
import { registerFileHandlers } from './ipc/fileHandlers';
import { registerNotesHandlers } from './ipc/notesHandlers';
import { registerSettingsHandlers } from './ipc/settingsHandlers';
import { registerWindowHandlers } from './ipc/windowHandlers';
import { createTray } from './tray/tray';
import { createMainWindow } from './windows/mainWindow';

if (require('electron-squirrel-startup')) {
  app.quit();
}

if (process.platform === 'win32') {
  app.setAppUserModelId('com.markdown-workspace.app');
}

if (app.isPackaged) {
  updateElectronApp({
    updateSource: {
      type: UpdateSourceType.ElectronPublicUpdateService,
      repo: 'TeaArx/Markdown-Workspace',
    },
    onNotifyUser: makeUserNotifier({
      title: 'Обновление Markdown Workspace',
      detail: 'Новая версия скачана. Перезапустить приложение и установить обновление?',
      restartButtonText: 'Перезапустить',
      laterButtonText: 'Позже',
    }),
  });
}

let mainWindow: BrowserWindow | null = null;
let isQuitting = false;

function quitApp(): void {
  isQuitting = true;
  app.quit();
}

function getMainWindow(): BrowserWindow | null {
  return mainWindow && !mainWindow.isDestroyed() ? mainWindow : null;
}

function showMainWindow(): BrowserWindow | null {
  if (!getMainWindow()) {
    mainWindow = createMainWindow({ shouldQuit: () => isQuitting });
  }

  mainWindow?.show();

  if (mainWindow?.isMinimized()) {
    mainWindow.restore();
  }

  mainWindow?.focus();
  return mainWindow;
}

function registerAppHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.APP_GET_VERSION, () => app.getVersion());

  ipcMain.handle(IPC_CHANNELS.APP_QUIT, () => {
    quitApp();
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.NOTIFY_SHOW, (_event, payload: { title: string; body: string }) => {
    if (Notification.isSupported()) {
      new Notification({
        title: payload.title,
        body: payload.body,
      }).show();
      return true;
    }

    return false;
  });
}

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    showMainWindow();
  });

  app.on('before-quit', () => {
    isQuitting = true;
  });

  app.whenReady().then(() => {
    registerAppHandlers();
    registerSettingsHandlers();
    registerFileHandlers();
    registerNotesHandlers();
    registerWindowHandlers({
      getMainWindow,
      showMainWindow,
    });

    mainWindow = createMainWindow({ shouldQuit: () => isQuitting });
    Menu.setApplicationMenu(null);

    createTray({
      getMainWindow,
      showMainWindow: () => {
        showMainWindow();
      },
      quit: quitApp,
    });
  });

  app.on('activate', () => {
    showMainWindow();
  });

  app.on('window-all-closed', () => {
    if (process.platform === 'darwin') {
      return;
    }
  });
}
