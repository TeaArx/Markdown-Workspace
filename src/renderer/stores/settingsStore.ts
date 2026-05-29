import { defineStore } from 'pinia';

const fallbackSettings: AppSettings = {
  theme: 'system',
  fontSize: 16,
  windowBounds: {
    width: 1400,
    height: 900,
  },
  lastFilePath: null,
  autosave: false,
  pomodoroMinutes: 25,
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
      const settings = await window.electronAPI.updateSettings(toPlainSettingsPatch(patch));
      this.setSettings(settings);
      return settings;
    },

    async reset() {
      const settings = await window.electronAPI.resetSettings();
      this.setSettings(settings);
      return settings;
    },
  },
});
