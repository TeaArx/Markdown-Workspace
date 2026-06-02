import { app, BrowserWindow, ipcMain } from 'electron';
import type { Rectangle } from 'electron';
import fs from 'fs';
import path from 'path';

import { IPC_CHANNELS } from '../../shared/constants';
import { applyWindowShellThemeToAll } from '../windows/titleBar';

export type ThemePreference = 'system' | 'light' | 'dark';

export interface AppSettings {
  theme: ThemePreference;
  fontSize: number;
  editorFontFamily: string;
  editorLineHeight: number;
  editorWordWrap: boolean;
  previewFontSize: number;
  previewLineHeight: number;
  windowBounds: Pick<Rectangle, 'width' | 'height'> & Partial<Pick<Rectangle, 'x' | 'y'>>;
  defaultWindowBounds: Pick<Rectangle, 'width' | 'height'>;
  lastFilePath: string | null;
  autosave: boolean;
  openLastFileOnStart: boolean;
  pomodoroMinutes: number;
}

export const defaultSettings: AppSettings = {
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
};

const themes: ThemePreference[] = ['system', 'light', 'dark'];
const editorFontFamilies = ['mono', 'sans', 'serif'];

function getSettingsPath(): string {
  return path.join(app.getPath('userData'), 'settings.json');
}

function backupCorruptFile(filePath: string): void {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const backupPath = `${filePath}.corrupt-${Date.now()}`;

  try {
    fs.copyFileSync(filePath, backupPath);
  } catch {
    return;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function asFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function sanitizeSettingsPatch(value: unknown): Partial<AppSettings> {
  if (!isPlainObject(value)) {
    throw new Error('A valid settings patch is required.');
  }

  const patch: Partial<AppSettings> = {};

  if (typeof value.theme === 'string') {
    patch.theme = value.theme as ThemePreference;
  }

  if (typeof value.fontSize === 'number') {
    patch.fontSize = value.fontSize;
  }

  if (typeof value.editorFontFamily === 'string') {
    patch.editorFontFamily = value.editorFontFamily;
  }

  if (typeof value.editorLineHeight === 'number') {
    patch.editorLineHeight = value.editorLineHeight;
  }

  if (typeof value.editorWordWrap === 'boolean') {
    patch.editorWordWrap = value.editorWordWrap;
  }

  if (typeof value.previewFontSize === 'number') {
    patch.previewFontSize = value.previewFontSize;
  }

  if (typeof value.previewLineHeight === 'number') {
    patch.previewLineHeight = value.previewLineHeight;
  }

  if (typeof value.autosave === 'boolean') {
    patch.autosave = value.autosave;
  }

  if (typeof value.openLastFileOnStart === 'boolean') {
    patch.openLastFileOnStart = value.openLastFileOnStart;
  }

  if (typeof value.pomodoroMinutes === 'number') {
    patch.pomodoroMinutes = value.pomodoroMinutes;
  }

  if (typeof value.lastFilePath === 'string') {
    patch.lastFilePath = value.lastFilePath;
  } else if (value.lastFilePath === null) {
    patch.lastFilePath = null;
  }

  if (isPlainObject(value.windowBounds)) {
    patch.windowBounds = {
      width: asFiniteNumber(value.windowBounds.width, defaultSettings.windowBounds.width),
      height: asFiniteNumber(value.windowBounds.height, defaultSettings.windowBounds.height),
    };

    if (typeof value.windowBounds.x === 'number') {
      patch.windowBounds.x = value.windowBounds.x;
    }

    if (typeof value.windowBounds.y === 'number') {
      patch.windowBounds.y = value.windowBounds.y;
    }
  }

  if (isPlainObject(value.defaultWindowBounds)) {
    patch.defaultWindowBounds = {
      width: asFiniteNumber(value.defaultWindowBounds.width, defaultSettings.defaultWindowBounds.width),
      height: asFiniteNumber(value.defaultWindowBounds.height, defaultSettings.defaultWindowBounds.height),
    };
  }

  return patch;
}

function sanitizeSettings(value: Partial<AppSettings>): AppSettings {
  const currentBounds = value.windowBounds ?? defaultSettings.windowBounds;
  const defaultBounds = value.defaultWindowBounds ?? defaultSettings.defaultWindowBounds;

  const next: AppSettings = {
    theme: themes.indexOf(value.theme as ThemePreference) >= 0 ? (value.theme as ThemePreference) : defaultSettings.theme,
    fontSize: clamp(asFiniteNumber(value.fontSize, defaultSettings.fontSize), 12, 24),
    editorFontFamily: editorFontFamilies.includes(value.editorFontFamily ?? '')
      ? (value.editorFontFamily as string)
      : defaultSettings.editorFontFamily,
    editorLineHeight: clamp(asFiniteNumber(value.editorLineHeight, defaultSettings.editorLineHeight), 1.2, 2.4),
    editorWordWrap: Boolean(value.editorWordWrap),
    previewFontSize: clamp(asFiniteNumber(value.previewFontSize, defaultSettings.previewFontSize), 12, 28),
    previewLineHeight: clamp(asFiniteNumber(value.previewLineHeight, defaultSettings.previewLineHeight), 1.2, 2.4),
    windowBounds: {
      width: clamp(asFiniteNumber(currentBounds.width, defaultSettings.windowBounds.width), 1000, 2400),
      height: clamp(asFiniteNumber(currentBounds.height, defaultSettings.windowBounds.height), 700, 1600),
    },
    defaultWindowBounds: {
      width: clamp(asFiniteNumber(defaultBounds.width, defaultSettings.defaultWindowBounds.width), 1000, 2400),
      height: clamp(asFiniteNumber(defaultBounds.height, defaultSettings.defaultWindowBounds.height), 700, 1600),
    },
    lastFilePath: typeof value.lastFilePath === 'string' && value.lastFilePath.length > 0 ? value.lastFilePath : null,
    autosave: Boolean(value.autosave),
    openLastFileOnStart: value.openLastFileOnStart !== false,
    pomodoroMinutes: clamp(asFiniteNumber(value.pomodoroMinutes, defaultSettings.pomodoroMinutes), 5, 90),
  };

  if (typeof currentBounds.x === 'number') {
    next.windowBounds.x = currentBounds.x;
  }

  if (typeof currentBounds.y === 'number') {
    next.windowBounds.y = currentBounds.y;
  }

  return next;
}

function broadcastSettings(settings: AppSettings): void {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(IPC_CHANNELS.SETTINGS_UPDATED, settings);
  }
}

function isSettingsWindow(window: BrowserWindow): boolean {
  return window.webContents.getURL().includes('#/settings');
}

function applyDefaultWindowBoundsToMainWindows(settings: Pick<AppSettings, 'defaultWindowBounds'>): void {
  for (const window of BrowserWindow.getAllWindows()) {
    if (window.isDestroyed() || isSettingsWindow(window)) {
      continue;
    }

    const currentBounds = window.getBounds();

    if (
      currentBounds.width === settings.defaultWindowBounds.width &&
      currentBounds.height === settings.defaultWindowBounds.height
    ) {
      continue;
    }

    window.setBounds({
      width: settings.defaultWindowBounds.width,
      height: settings.defaultWindowBounds.height,
    });
  }
}

export function readSettings(): AppSettings {
  const settingsPath = getSettingsPath();

  try {
    if (!fs.existsSync(settingsPath)) {
      return defaultSettings;
    }

    const raw = fs.readFileSync(settingsPath, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<AppSettings>;

    return sanitizeSettings({
      ...defaultSettings,
      ...parsed,
      defaultWindowBounds: parsed.defaultWindowBounds ?? parsed.windowBounds ?? defaultSettings.defaultWindowBounds,
    });
  } catch {
    backupCorruptFile(settingsPath);
    return defaultSettings;
  }
}

export function writeSettings(settings: AppSettings): AppSettings {
  const settingsPath = getSettingsPath();
  const temporaryPath = `${settingsPath}.tmp`;

  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  fs.writeFileSync(temporaryPath, JSON.stringify(settings, null, 2), 'utf-8');
  fs.renameSync(temporaryPath, settingsPath);
  return settings;
}

export function updateSettings(patch: Partial<AppSettings>): AppSettings {
  const current = readSettings();
  const next = sanitizeSettings({
    ...current,
    ...patch,
    windowBounds: patch.windowBounds
      ? {
          ...current.windowBounds,
          ...patch.windowBounds,
        }
      : current.windowBounds,
    defaultWindowBounds: patch.defaultWindowBounds
      ? {
          ...current.defaultWindowBounds,
          ...patch.defaultWindowBounds,
        }
      : current.defaultWindowBounds,
  });

  writeSettings(next);
  applyWindowShellThemeToAll(next);

  if (patch.defaultWindowBounds) {
    applyDefaultWindowBoundsToMainWindows(next);
  }

  broadcastSettings(next);
  return next;
}

export function updateWindowBounds(windowBounds: AppSettings['windowBounds']): AppSettings {
  const current = readSettings();
  const next = sanitizeSettings({
    ...current,
    windowBounds: {
      ...current.windowBounds,
      ...windowBounds,
    },
  });

  writeSettings(next);
  return next;
}

export function setLastFilePath(filePath: string | null): AppSettings {
  return updateSettings({ lastFilePath: filePath });
}

export function registerSettingsHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, () => readSettings());

  ipcMain.handle(IPC_CHANNELS.SETTINGS_UPDATE, (_event, patch: unknown) => {
    return updateSettings(sanitizeSettingsPatch(patch));
  });

  ipcMain.handle(IPC_CHANNELS.SETTINGS_RESET, () => {
    const settings = writeSettings(defaultSettings);
    applyWindowShellThemeToAll(settings);
    applyDefaultWindowBoundsToMainWindows(settings);
    broadcastSettings(settings);
    return settings;
  });
}
