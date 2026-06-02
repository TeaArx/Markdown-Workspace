import { BrowserWindow, shell } from "electron";

import { windowIconPath } from "../assets";
import { readSettings, updateSettings } from "../ipc/settingsHandlers";
import { getWindowShellOptions } from "./titleBar";

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

interface MainWindowOptions {
  shouldQuit: () => boolean;
}

const allowedExternalProtocols = new Set(["http:", "https:", "mailto:"]);

function openExternalUrl(url: string): void {
  try {
    const parsedUrl = new URL(url);

    if (allowedExternalProtocols.has(parsedUrl.protocol)) {
      void shell.openExternal(parsedUrl.toString());
    }
  } catch {
    return;
  }
}

export function createMainWindow({
  shouldQuit,
}: MainWindowOptions): BrowserWindow {
  const settings = readSettings();
  const savedPosition = {
    ...(typeof settings.windowBounds.x === "number" ? { x: settings.windowBounds.x } : {}),
    ...(typeof settings.windowBounds.y === "number" ? { y: settings.windowBounds.y } : {}),
  };
  const mainWindow = new BrowserWindow({
    ...settings.defaultWindowBounds,
    ...savedPosition,
    ...getWindowShellOptions(settings),
    minWidth: 1000,
    minHeight: 700,
    show: false,
    title: "Markdown Workspace",
    icon: windowIconPath,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.setMenu(null);

  let saveBoundsTimer: ReturnType<typeof setTimeout> | null = null;

  const saveWindowBounds = (): void => {
    if (saveBoundsTimer) {
      clearTimeout(saveBoundsTimer);
    }

    saveBoundsTimer = setTimeout(() => {
      if (!mainWindow.isDestroyed()) {
        updateSettings({ windowBounds: mainWindow.getBounds() });
      }
    }, 300);
  };

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.on("resize", saveWindowBounds);
  mainWindow.on("move", saveWindowBounds);

  mainWindow.on("close", (event) => {
    updateSettings({ windowBounds: mainWindow.getBounds() });

    if (!shouldQuit()) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (url !== mainWindow.webContents.getURL()) {
      event.preventDefault();
      openExternalUrl(url);
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    openExternalUrl(url);
    return { action: "deny" };
  });

  return mainWindow;
}
