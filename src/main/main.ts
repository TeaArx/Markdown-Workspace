import fs from 'fs';
import path from 'path';

import { BrowserWindow, Menu, Notification, app, ipcMain } from 'electron';
import { autoUpdater, type ProgressInfo, type UpdateInfo } from 'electron-updater';

import { IPC_CHANNELS } from '../shared/constants';
import { registerFileHandlers } from './ipc/fileHandlers';
import { registerGitHandlers } from './ipc/gitHandlers';
import { registerNotesHandlers } from './ipc/notesHandlers';
import { registerProjectsHandlers } from './ipc/projectsHandlers';
import { registerSettingsHandlers } from './ipc/settingsHandlers';
import { registerWindowHandlers } from './ipc/windowHandlers';
import { createTray } from './tray/tray';
import {
  closeInstallExperienceWindow,
  createInstallExperienceWindow,
  setInstallExperienceProgress,
} from './windows/installExperience';
import { createMainWindow } from './windows/mainWindow';

const UPDATE_CHECK_DELAY_MS = 4500;

interface VersionState {
  version?: string;
}

function getStartupExperienceModeFromArgs(args: string[]): 'install' | 'updated' | null {
  if (args.includes('--install-welcome')) {
    return 'install';
  }

  if (args.includes('--updated-welcome')) {
    return 'updated';
  }

  return null;
}

function getVersionStatePath(): string {
  return path.join(app.getPath('userData'), 'version-state.json');
}

function readPreviousVersion(): string | null {
  try {
    const rawState = fs.readFileSync(getVersionStatePath(), 'utf8');
    const state = JSON.parse(rawState) as VersionState;
    return typeof state.version === 'string' ? state.version : null;
  } catch {
    return null;
  }
}

function rememberCurrentVersion(): void {
  try {
    fs.mkdirSync(app.getPath('userData'), { recursive: true });
    fs.writeFileSync(
      getVersionStatePath(),
      JSON.stringify({ version: app.getVersion(), updatedAt: new Date().toISOString() }, null, 2),
      'utf8',
    );
  } catch {
    // Version state is cosmetic; startup should continue even if it cannot be persisted.
  }
}

function getStartupExperienceMode(): 'install' | 'updated' | null {
  const argumentMode = getStartupExperienceModeFromArgs(process.argv);

  if (argumentMode) {
    return argumentMode;
  }

  if (!app.isPackaged) {
    return null;
  }

  const previousVersion = readPreviousVersion();

  if (!previousVersion) {
    return 'install';
  }

  return previousVersion === app.getVersion() ? null : 'updated';
}

function normalizeReleaseNotes(releaseNotes: unknown): string {
  if (typeof releaseNotes === 'string') {
    return releaseNotes;
  }

  if (Array.isArray(releaseNotes)) {
    return releaseNotes
      .map((entry) => {
        if (typeof entry === 'string') {
          return entry;
        }

        if (entry && typeof entry === 'object' && 'note' in entry) {
          const note = (entry as { note?: unknown }).note;
          return typeof note === 'string' ? note : '';
        }

        return '';
      })
      .filter(Boolean)
      .join('\n\n');
  }

  return '';
}

let autoUpdatesConfigured = false;

function configureAutoUpdatesOnce(): void {
  if (autoUpdatesConfigured || !app.isPackaged) {
    return;
  }

  autoUpdatesConfigured = true;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;
  let updateDownloadStarted = false;

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    updateDownloadStarted = true;
    createInstallExperienceWindow({
      mode: 'update-download',
      releaseName: `Версия ${info.version}`,
      releaseNotes: normalizeReleaseNotes(info.releaseNotes),
    });
    setInstallExperienceProgress({ percent: 3, label: 'Подготовка загрузки обновления' });

    autoUpdater.downloadUpdate().catch(() => {
      createInstallExperienceWindow({ mode: 'update-error' });
    });
  });

  autoUpdater.on('update-not-available', () => {
    closeInstallExperienceWindow();
  });

  autoUpdater.on('download-progress', (progress: ProgressInfo) => {
    setInstallExperienceProgress({
      percent: progress.percent,
      label: `Скачиваем обновление: ${Math.round(progress.percent)}%`,
    });
  });

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    updateDownloadStarted = false;
    closeInstallExperienceWindow();
    createInstallExperienceWindow({
      mode: 'update-ready',
      releaseName: `Версия ${info.version}`,
      releaseNotes: normalizeReleaseNotes(info.releaseNotes),
    });
  });

  autoUpdater.on('error', () => {
    if (updateDownloadStarted) {
      updateDownloadStarted = false;
      createInstallExperienceWindow({ mode: 'update-error' });
    }
  });

  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((): void => undefined);
  }, UPDATE_CHECK_DELAY_MS);
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

function showStartupExperience(mode: 'install' | 'updated'): void {
  rememberCurrentVersion();
  const installWindow = createInstallExperienceWindow({ mode });

  installWindow.on('closed', () => {
    showMainWindow();
    configureAutoUpdatesOnce();
  });
}

function registerAppHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.APP_GET_VERSION, () => app.getVersion());

  ipcMain.handle(IPC_CHANNELS.APP_QUIT, () => {
    quitApp();
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.APP_INSTALL_UPDATE, () => {
    isQuitting = true;
    autoUpdater.quitAndInstall(false, true);
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

if (process.platform === 'win32') {
  app.setAppUserModelId('com.markdown-workspace.app');
}

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    const startupExperienceMode = getStartupExperienceModeFromArgs(argv);

    if (startupExperienceMode) {
      showStartupExperience(startupExperienceMode);
      return;
    }

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

    if (!startupExperienceMode) {
      configureAutoUpdatesOnce();
    }

    createTray({
      getMainWindow,
      showMainWindow: () => {
        showMainWindow();
      },
      quit: quitApp,
    });

    if (startupExperienceMode) {
      showStartupExperience(startupExperienceMode);
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
