import { BrowserWindow, Menu, Tray, app, nativeImage } from "electron";

import { trayIconPath } from "../assets";

let tray: Tray | null = null;

interface TrayOptions {
  getMainWindow: () => BrowserWindow | null;
  showMainWindow: () => void;
  quit: () => void;
}

function createTrayIcon(): Electron.NativeImage {
  const iconSize = process.platform === "win32" ? 16 : 22;
  const icon = nativeImage.createFromPath(trayIconPath).resize({
    width: iconSize,
    height: iconSize,
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

  tray.setContextMenu(
    Menu.buildFromTemplate([
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
    ]),
  );
  tray.on("double-click", options.showMainWindow);

  return tray;
}
