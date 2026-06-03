export const IPC_CHANNELS = {
  APP_GET_VERSION: 'app:getVersion',
  APP_QUIT: 'app:quit',

  FILE_NEW: 'file:new',
  FILE_OPEN: 'file:open',
  FILE_OPEN_PATH: 'file:openPath',
  FILE_SAVE: 'file:save',
  FILE_SAVE_AS: 'file:saveAs',

  GIT_STATUS: 'git:status',
  GIT_DIFF: 'git:diff',

  SETTINGS_GET: 'settings:get',
  SETTINGS_UPDATE: 'settings:update',
  SETTINGS_RESET: 'settings:reset',
  SETTINGS_UPDATED: 'settings:updated',

  WINDOW_OPEN_SETTINGS: 'window:openSettings',
  WINDOW_CLOSE_CURRENT: 'window:closeCurrent',
  WINDOW_SHOW_MAIN: 'window:showMain',
  WINDOW_HIDE_MAIN: 'window:hideMain',

  MENU_COMMAND: 'menu:command',
  NOTIFY_SHOW: 'notify:show',

  NOTES_LIST: 'notes:list',
  NOTES_CREATE: 'notes:create',
  NOTES_UPDATE: 'notes:update',
  NOTES_DELETE: 'notes:delete',
} as const;

export const MENU_COMMANDS = {
  NEW_FILE: 'new-file',
  OPEN_FILE: 'open-file',
  SAVE_FILE: 'save-file',
  SAVE_FILE_AS: 'save-file-as',
  OPEN_SETTINGS: 'open-settings',
  FOCUS_EDITOR: 'focus-editor',
  START_POMODORO: 'start-pomodoro',
} as const;

export const SUPPORTED_FILE_EXTENSIONS = ['.md', '.markdown', '.txt'] as const;
