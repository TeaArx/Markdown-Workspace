import { BrowserWindow, Menu, Tray, app, nativeImage } from "electron";

import { trayIconPath } from "../assets";

let tray: Tray | null = null;

interface TrayOptions {
  getMainWindow: () => BrowserWindow | null;
  showMainWindow: () => void;
  quit: () => void;
}

function createTrayIcon(): Electron.NativeImage {
  const icon = nativeImage.createFromPath(trayIconPath).resize({
    width: process.platform === "win32" ? 16 : 22,
    height: process.platform === "win32" ? 16 : 22,
  });

  if (process.platform === "darwin") {
    icon.setTemplateImage(true);
  }

  return icon;
}

export function createTray(options: TrayOptions): Tray {
  if (tray) {
    return tray;
  }

  tray = new Tray(createTrayIcon());
  tray.setToolTip("Markdown Workspace");

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Показать",
      click: options.showMainWindow,
    },
    {
      label: "Скрыть",
      click: () => options.getMainWindow()?.hide(),
    },
    { type: "separator" },
    {
      label: "Выход",
      click: () => {
        app.releaseSingleInstanceLock();
        options.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on("double-click", options.showMainWindow);

  return tray;
}
