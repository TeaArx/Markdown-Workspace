import { BrowserWindow, ipcMain } from 'electron';

import { IPC_CHANNELS } from '../../shared/constants';
import { createSettingsWindow } from '../windows/settingsWindow';

interface WindowHandlerOptions {
  getMainWindow: () => BrowserWindow | null;
  showMainWindow: () => BrowserWindow | null;
}

export function registerWindowHandlers(options: WindowHandlerOptions): void {
  ipcMain.handle(IPC_CHANNELS.WINDOW_OPEN_SETTINGS, () => {
    createSettingsWindow(options.getMainWindow());
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW_CLOSE_CURRENT, (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close();
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW_SHOW_MAIN, () => {
    options.showMainWindow();
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW_HIDE_MAIN, () => {
    options.getMainWindow()?.hide();
    return true;
  });
}
