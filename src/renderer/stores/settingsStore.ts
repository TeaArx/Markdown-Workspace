import { defineStore } from 'pinia';

const fallbackSettings: AppSettings = {
  theme: 'system',
  fontSize: 16,
  editorFontFamily: 'mono',
  editorLineHeight: 1.7,
  editorWordWrap: false,
  previewFontSize: 16,
  previewLineHeight: 1.72,
  windowBounds: {
    width: 1400,
    height: 900,
  },
  defaultWindowBounds: {
    width: 1400,
    height: 900,
  },
  lastFilePath: null,
  autosave: false,
  openLastFileOnStart: true,
  pomodoroMinutes: 25,
  gitIntegrationEnabled: false,
};

function resolveTheme(theme: ThemePreference): 'light' | 'dark' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  return theme;
}

function toPlainSettingsPatch(patch: Partial<AppSettings>): Partial<AppSettings> {
  return JSON.parse(JSON.stringify(patch)) as Partial<AppSettings>;
}

function mergeSettings(settings: AppSettings, patch: Partial<AppSettings>): AppSettings {
  return {
    ...settings,
    ...patch,
    windowBounds: patch.windowBounds
      ? {
          ...settings.windowBounds,
          ...patch.windowBounds,
        }
      : settings.windowBounds,
    defaultWindowBounds: patch.defaultWindowBounds
      ? {
          ...settings.defaultWindowBounds,
          ...patch.defaultWindowBounds,
        }
      : settings.defaultWindowBounds,
  };
}

function resolveEditorFontFamily(fontFamily: string): string {
  if (fontFamily === 'sans') {
    return 'Inter, ui-sans-serif, system-ui, sans-serif';
  }

  if (fontFamily === 'serif') {
    return 'Georgia, "Times New Roman", serif';
  }

  return '"Cascadia Code", "Fira Code", Consolas, monospace';
}

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    settings: fallbackSettings,
    appVersion: '',
    isLoading: false,
  }),

  actions: {
    applyToDocument(settings?: AppSettings) {
      const targetSettings = settings ?? this.settings;
      const resolvedTheme = resolveTheme(targetSettings.theme);
      document.documentElement.dataset.theme = resolvedTheme;
      document.documentElement.style.setProperty('--editor-font-size', `${targetSettings.fontSize}px`);
      document.documentElement.style.setProperty('--editor-font-family', resolveEditorFontFamily(targetSettings.editorFontFamily));
      document.documentElement.style.setProperty('--editor-line-height', String(targetSettings.editorLineHeight));
      document.documentElement.style.setProperty('--editor-white-space', targetSettings.editorWordWrap ? 'pre-wrap' : 'pre');
      document.documentElement.style.setProperty('--editor-overflow-wrap', targetSettings.editorWordWrap ? 'anywhere' : 'normal');
      document.documentElement.style.setProperty('--preview-font-size', `${targetSettings.previewFontSize}px`);
      document.documentElement.style.setProperty('--preview-line-height', String(targetSettings.previewLineHeight));
    },

    setSettings(settings: AppSettings) {
      this.settings = settings;
      this.applyToDocument(settings);
    },

    async load() {
      this.isLoading = true;

      try {
        const [settings, version] = await Promise.all([
          window.electronAPI.getSettings(),
          window.electronAPI.getAppVersion(),
        ]);
        this.appVersion = version;
        this.setSettings(settings);
      } finally {
        this.isLoading = false;
      }
    },

    async update(patch: Partial<AppSettings>) {
      const previousSettings = this.settings;
      this.setSettings(mergeSettings(this.settings, patch));

      try {
        const settings = await window.electronAPI.updateSettings(toPlainSettingsPatch(patch));
        this.setSettings(settings);
        return settings;
      } catch (error) {
        this.setSettings(previousSettings);
        throw error;
      }
    },

    async reset() {
      const settings = await window.electronAPI.resetSettings();
      this.setSettings(settings);
      return settings;
    },
  },
});
