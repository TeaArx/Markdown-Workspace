export {};

declare global {
  type ThemePreference = 'system' | 'light' | 'dark';
  type ViewMode = 'edit' | 'split' | 'preview';
  type MenuCommand =
    | 'new-file'
    | 'open-file'
    | 'save-file'
    | 'save-file-as'
    | 'open-settings'
    | 'focus-editor'
    | 'start-pomodoro';

  interface OpenFileResult {
    path: string;
    name: string;
    content: string;
  }

  interface SaveFileResult {
    path: string;
    name: string;
    savedAt: string;
  }

  interface AppSettings {
    theme: ThemePreference;
    fontSize: number;
    editorFontFamily: string;
    editorLineHeight: number;
    editorWordWrap: boolean;
    previewFontSize: number;
    previewLineHeight: number;
    windowBounds: {
      width: number;
      height: number;
      x?: number;
      y?: number;
    };
    defaultWindowBounds: {
      width: number;
      height: number;
    };
    lastFilePath: string | null;
    autosave: boolean;
    openLastFileOnStart: boolean;
    pomodoroMinutes: number;
  }

  interface NoteRecord {
    id: number;
    title: string;
    content: string;
    done: number;
    pinned: number;
    createdAt: string;
    updatedAt: string;
  }

  interface ElectronAPI {
    getAppVersion: () => Promise<string>;
    quitApp: () => Promise<boolean>;

    openFile: () => Promise<OpenFileResult | null>;
    openFileByPath: (filePath: string) => Promise<OpenFileResult>;
    saveFile: (content: string, filePath?: string | null) => Promise<SaveFileResult | null>;
    saveFileAs: (content: string, filePath?: string | null) => Promise<SaveFileResult | null>;

    getSettings: () => Promise<AppSettings>;
    updateSettings: (patch: Partial<AppSettings>) => Promise<AppSettings>;
    resetSettings: () => Promise<AppSettings>;

    openSettingsWindow: () => Promise<boolean>;
    closeCurrentWindow: () => Promise<boolean>;
    showMainWindow: () => Promise<boolean>;
    hideMainWindow: () => Promise<boolean>;

    showNotification: (title: string, body: string) => Promise<boolean>;

    notes: {
      list: () => Promise<NoteRecord[]>;
      create: (title: string, content: string) => Promise<NoteRecord>;
      update: (id: number, patch: Partial<Pick<NoteRecord, 'title' | 'content' | 'done' | 'pinned'>>) => Promise<NoteRecord>;
      delete: (id: number) => Promise<{ deleted: boolean }>;
    };

    onMenuCommand: (callback: (command: MenuCommand) => void) => () => void;
    onSettingsUpdated: (callback: (settings: AppSettings) => void) => () => void;
  }

  interface Window {
    electronAPI: ElectronAPI;
  }
}
