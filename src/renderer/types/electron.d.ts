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
    gitIntegrationEnabled: boolean;
  }

  interface GitFileStatus {
    isRepository: boolean;
    repoRoot: string | null;
    branch: string | null;
    filePath: string;
    relativePath: string | null;
    statusCode: string | null;
    statusLabel: string;
    isDirty: boolean;
  }

  interface GitProject {
    name: string;
    path: string;
    branch: string;
    isDirty: boolean;
  }

  interface ProjectFile {
    name: string;
    path: string;
    relativePath: string;
  }

  interface ProjectsListResult {
    rootPath: string;
    rootExists: boolean;
    projects: GitProject[];
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
    installUpdate: () => Promise<boolean>;

    openFile: () => Promise<OpenFileResult | null>;
    openFileByPath: (filePath: string) => Promise<OpenFileResult>;
    saveFile: (content: string, filePath?: string | null) => Promise<SaveFileResult | null>;
    saveFileAs: (content: string, filePath?: string | null) => Promise<SaveFileResult | null>;

    git: {
      status: (filePath: string) => Promise<GitFileStatus>;
      diff: (filePath: string) => Promise<string>;
    };

    projects: {
      list: (rootPath?: string | null) => Promise<ProjectsListResult>;
      pickRoot: () => Promise<ProjectsListResult | null>;
      listFiles: (projectPath: string) => Promise<ProjectFile[]>;
    };

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
