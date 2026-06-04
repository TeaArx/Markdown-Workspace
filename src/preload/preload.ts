import { contextBridge, ipcRenderer } from 'electron';

import { IPC_CHANNELS, MENU_COMMANDS } from '../shared/constants';

type MenuCommand = typeof MENU_COMMANDS[keyof typeof MENU_COMMANDS];

const allowedMenuCommands = new Set<string>([
  MENU_COMMANDS.NEW_FILE,
  MENU_COMMANDS.OPEN_FILE,
  MENU_COMMANDS.SAVE_FILE,
  MENU_COMMANDS.SAVE_FILE_AS,
  MENU_COMMANDS.OPEN_SETTINGS,
  MENU_COMMANDS.FOCUS_EDITOR,
  MENU_COMMANDS.START_POMODORO,
]);

function onSafeEvent<T>(channel: string, callback: (payload: T) => void): () => void {
  const listener = (_event: Electron.IpcRendererEvent, payload: T): void => {
    callback(payload);
  };

  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke(IPC_CHANNELS.APP_GET_VERSION),
  quitApp: () => ipcRenderer.invoke(IPC_CHANNELS.APP_QUIT),
  installUpdate: () => ipcRenderer.invoke(IPC_CHANNELS.APP_INSTALL_UPDATE),

  openFile: () => ipcRenderer.invoke(IPC_CHANNELS.FILE_OPEN),
  openFileByPath: (filePath: string) => ipcRenderer.invoke(IPC_CHANNELS.FILE_OPEN_PATH, filePath),
  saveFile: (content: string, filePath?: string | null) =>
    ipcRenderer.invoke(IPC_CHANNELS.FILE_SAVE, { content, filePath }),
  saveFileAs: (content: string, filePath?: string | null) =>
    ipcRenderer.invoke(IPC_CHANNELS.FILE_SAVE_AS, { content, filePath }),

  git: {
    status: (filePath: string) => ipcRenderer.invoke(IPC_CHANNELS.GIT_STATUS, filePath),
    diff: (filePath: string) => ipcRenderer.invoke(IPC_CHANNELS.GIT_DIFF, filePath),
  },

  projects: {
    list: (rootPath?: string | null) => ipcRenderer.invoke(IPC_CHANNELS.PROJECTS_LIST, rootPath),
    pickRoot: () => ipcRenderer.invoke(IPC_CHANNELS.PROJECTS_PICK_ROOT),
    listFiles: (projectPath: string) => ipcRenderer.invoke(IPC_CHANNELS.PROJECTS_LIST_FILES, projectPath),
  },

  getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET),
  updateSettings: (patch: unknown) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_UPDATE, patch),
  resetSettings: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_RESET),

  openSettingsWindow: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_OPEN_SETTINGS),
  closeCurrentWindow: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_CLOSE_CURRENT),
  showMainWindow: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_SHOW_MAIN),
  hideMainWindow: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_HIDE_MAIN),

  showNotification: (title: string, body: string) => ipcRenderer.invoke(IPC_CHANNELS.NOTIFY_SHOW, { title, body }),

  notes: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.NOTES_LIST),
    create: (title: string, content: string) => ipcRenderer.invoke(IPC_CHANNELS.NOTES_CREATE, { title, content }),
    update: (id: number, patch: Record<string, unknown>) =>
      ipcRenderer.invoke(IPC_CHANNELS.NOTES_UPDATE, { id, ...patch }),
    delete: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.NOTES_DELETE, id),
  },

  onMenuCommand: (callback: (command: MenuCommand) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, command: string): void => {
      if (allowedMenuCommands.has(command)) {
        callback(command as MenuCommand);
      }
    };

    ipcRenderer.on(IPC_CHANNELS.MENU_COMMAND, listener);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.MENU_COMMAND, listener);
  },

  onSettingsUpdated: (callback: (settings: unknown) => void) => {
    return onSafeEvent(IPC_CHANNELS.SETTINGS_UPDATED, callback);
  },
});
