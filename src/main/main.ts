import { BrowserWindow, Menu, Notification, app, ipcMain } from "electron";

import { IPC_CHANNELS } from "../shared/constants";
import { registerFileHandlers } from "./ipc/fileHandlers";
import { registerGitHandlers } from "./ipc/gitHandlers";
import { registerNotesHandlers } from "./ipc/notesHandlers";
import { registerProjectsHandlers } from "./ipc/projectsHandlers";
import { registerSettingsHandlers } from "./ipc/settingsHandlers";
import { registerWindowHandlers } from "./ipc/windowHandlers";
import {
  getStartupExperienceMode,
  getStartupExperienceModeFromArgs,
  rememberCurrentVersion,
  type StartupExperienceMode,
} from "./startupExperience";
import { createTray } from "./tray/tray";
import { configureAutoUpdatesOnce, installDownloadedUpdate } from "./updates";
import { createInstallExperienceWindow } from "./windows/installExperience";
import { createMainWindow } from "./windows/mainWindow";

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

function startAutoUpdates(): void {
  configureAutoUpdatesOnce(app.isPackaged);
}

function showStartupExperience(mode: StartupExperienceMode): void {
  rememberCurrentVersion();
  const installWindow = createInstallExperienceWindow({ mode });

  installWindow.on("closed", () => {
    showMainWindow();
    startAutoUpdates();
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
    installDownloadedUpdate();
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.NOTIFY_SHOW, (_event, payload: { title: string; body: string }) => {
    if (!Notification.isSupported()) {
      return false;
    }

    new Notification({
      title: payload.title,
      body: payload.body,
    }).show();

    return true;
  });
}

function registerIpcHandlers(): void {
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
}

function registerAppLifecycle(): void {
  app.on("second-instance", (_event, argv) => {
    const startupExperienceMode = getStartupExperienceModeFromArgs(argv);

    if (startupExperienceMode) {
      showStartupExperience(startupExperienceMode);
      return;
    }

    showMainWindow();
  });

  app.on("before-quit", () => {
    isQuitting = true;
  });

  app.on("activate", () => {
    showMainWindow();
  });

  app.on("window-all-closed", () => {
    if (process.platform === "darwin") {
      return;
    }
  });
}

function bootstrapApplication(): void {
  const startupExperienceMode = getStartupExperienceMode();

  registerIpcHandlers();
  Menu.setApplicationMenu(null);

  if (!startupExperienceMode) {
    startAutoUpdates();
  }

  createTray({
    getMainWindow,
    showMainWindow,
    quit: quitApp,
  });

  if (startupExperienceMode) {
    showStartupExperience(startupExperienceMode);
    return;
  }

  mainWindow = createMainWindow({ shouldQuit: () => isQuitting });
}

if (process.platform === "win32") {
  app.setAppUserModelId("com.markdown-workspace.app");
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  registerAppLifecycle();
  app.whenReady().then(bootstrapApplication);
}
