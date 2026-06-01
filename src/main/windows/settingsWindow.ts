import { BrowserWindow, shell } from "electron";

import { windowIconPath } from "../assets";
import { readSettings } from "../ipc/settingsHandlers";
import { getWindowShellOptions } from "./titleBar";

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

let settingsWindow: BrowserWindow | null = null;

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

export function createSettingsWindow(
  parentWindow?: BrowserWindow | null,
): BrowserWindow {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.show();
    settingsWindow.focus();
    return settingsWindow;
  }

  const settings = readSettings();

  settingsWindow = new BrowserWindow({
    width: 1024,
    height: 720,
    ...getWindowShellOptions(settings),

    minWidth: 620,
    minHeight: 560,
    parent: parentWindow ?? undefined,
    modal: false,
    title: "Settings",
    resizable: true,
    icon: windowIconPath,

    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  settingsWindow.setMenu(null);

  settingsWindow.loadURL(`${MAIN_WINDOW_WEBPACK_ENTRY}#/settings`);

  settingsWindow.webContents.on("will-navigate", (event, url) => {
    if (url !== settingsWindow?.webContents.getURL()) {
      event.preventDefault();
      openExternalUrl(url);
    }
  });

  settingsWindow.webContents.setWindowOpenHandler(({ url }) => {
    openExternalUrl(url);
    return { action: "deny" };
  });

  settingsWindow.on("closed", () => {
    settingsWindow = null;
  });

  return settingsWindow;
}
