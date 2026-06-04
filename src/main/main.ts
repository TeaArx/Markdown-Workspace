import { spawn } from 'child_process';
import path from 'path';

import { BrowserWindow, Menu, Notification, app, autoUpdater, ipcMain } from 'electron';
import { UpdateSourceType, updateElectronApp } from 'update-electron-app';

import { IPC_CHANNELS } from '../shared/constants';
import { registerFileHandlers } from './ipc/fileHandlers';
import { registerGitHandlers } from './ipc/gitHandlers';
import { registerNotesHandlers } from './ipc/notesHandlers';
import { registerProjectsHandlers } from './ipc/projectsHandlers';
import { registerSettingsHandlers } from './ipc/settingsHandlers';
import { registerWindowHandlers } from './ipc/windowHandlers';
import { createTray } from './tray/tray';
import { closeInstallExperienceWindow, createInstallExperienceWindow } from './windows/installExperience';
import { createMainWindow } from './windows/mainWindow';

type SquirrelCommand = '--squirrel-install' | '--squirrel-updated' | '--squirrel-uninstall' | '--squirrel-obsolete';

function runSquirrelCommand(args: string[], done: () => void): void {
  const updateExe = path.resolve(path.dirname(process.execPath), '..', 'Update.exe');
  const child = spawn(updateExe, args, { detached: true });

  child.on('close', done);
  child.on('error', done);
}

function getSquirrelCommand(): SquirrelCommand | null {
  if (process.platform !== 'win32') {
    return null;
  }

  const command = process.argv[1];

  if (
    command === '--squirrel-install' ||
    command === '--squirrel-updated' ||
    command === '--squirrel-uninstall' ||
    command === '--squirrel-obsolete'
  ) {
    return command;
  }

  return null;
}

function launchInstalledApp(mode: 'install' | 'updated'): void {
  const target = path.basename(process.execPath);
  const launchArg = mode === 'install' ? '--install-welcome' : '--updated-welcome';

  runSquirrelCommand(
    [`--processStart=${target}`, `--process-start-args=${launchArg}`],
    () => app.quit(),
  );
}

function handleSquirrelStartupEvent(): boolean {
  const command = getSquirrelCommand();

  if (!command) {
    return false;
  }

  const target = path.basename(process.execPath);

  if (command === '--squirrel-install' || command === '--squirrel-updated') {
    runSquirrelCommand([`--createShortcut=${target}`], () => {
      launchInstalledApp(command === '--squirrel-install' ? 'install' : 'updated');
    });
    return true;
  }

  if (command === '--squirrel-uninstall') {
    runSquirrelCommand([`--removeShortcut=${target}`], () => app.quit());
    return true;
  }

  app.quit();
  return true;
}

function configureAutoUpdates(): void {
  autoUpdater.on('update-available', () => {
    createInstallExperienceWindow({ mode: 'update-download' });
  });

  autoUpdater.on('update-not-available', () => {
    closeInstallExperienceWindow();
  });

  autoUpdater.on('error', () => {
    closeInstallExperienceWindow();
  });

  updateElectronApp({
    updateSource: {
      type: UpdateSourceType.ElectronPublicUpdateService,
      repo: 'TeaArx/Markdown-Workspace',
    },
    onNotifyUser: (info) => {
      closeInstallExperienceWindow();
      createInstallExperienceWindow({
        mode: 'update-ready',
        releaseName: info.releaseName,
        releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : '',
      });
    },
  });
}

function getStartupExperienceMode(): 'install' | 'updated' | null {
  if (process.argv.includes('--install-welcome')) {
    return 'install';
  }

  if (process.argv.includes('--updated-welcome')) {
    return 'updated';
  }

  return null;
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

  ipcMain.handle(IPC_CHANNELS.APP_INSTALL_UPDATE, () => {
    isQuitting = true;
    autoUpdater.quitAndInstall();
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

const handledSquirrelStartupEvent = handleSquirrelStartupEvent();

if (process.platform === 'win32') {
  app.setAppUserModelId('com.markdown-workspace.app');
}

const gotSingleInstanceLock = handledSquirrelStartupEvent || app.requestSingleInstanceLock();

if (handledSquirrelStartupEvent) {
  // Squirrel events are short-lived helper launches. The callbacks above will quit the app.
} else if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    showMainWindow();
  });

  app.on('before-quit', () => {
    isQuitting = true;
  });

  app.whenReady().then(() => {
    const startupExperienceMode = getStartupExperienceMode();

    registerAppHandlers();
    registerSettingsHandlers();
    registerFileHandlers();
    registerGitHandlers();
    registerNotesHandlers();
    registerProjectsHandlers();
    registerWindowHandlers({
      getMainWindow,
      showMainWindow,
    });

    Menu.setApplicationMenu(null);

    if (app.isPackaged) {
      configureAutoUpdates();
    }

    createTray({
      getMainWindow,
      showMainWindow: () => {
        showMainWindow();
      },
      quit: quitApp,
    });

    if (startupExperienceMode) {
      createInstallExperienceWindow({ mode: startupExperienceMode });
      setTimeout(() => {
        closeInstallExperienceWindow();
        showMainWindow();
      }, 3600);
      return;
    }

    mainWindow = createMainWindow({ shouldQuit: () => isQuitting });
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
