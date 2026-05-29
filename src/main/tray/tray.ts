import { BrowserWindow, Menu, Tray, app, nativeImage } from "electron";

let tray: Tray | null = null;

interface TrayOptions {
  getMainWindow: () => BrowserWindow | null;
  showMainWindow: () => void;
  quit: () => void;
}

function createTrayIcon(): Electron.NativeImage {
  const icon = nativeImage.createFromDataURL(
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAQAAAC1+jfqAAAAM0lEQVR42mNgwA8YGBgY/2dgYGBg+M+ABRjQwMDA8J8BCzCqgAqGJqgFqAERAgB3xxKfOX9zcQAAAABJRU5ErkJggg==",
  );

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
      label: "Show",
      click: options.showMainWindow,
    },
    {
      label: "Hide",
      click: () => options.getMainWindow()?.hide(),
    },
    { type: "separator" },
    {
      label: "Exit",
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
