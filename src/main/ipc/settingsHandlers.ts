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
  windowBounds: Pick<Rectangle, 'width' | 'height'> & Partial<Pick<Rectangle, 'x' | 'y'>>;
  lastFilePath: string | null;
  autosave: boolean;
  pomodoroMinutes: number;
}

export const defaultSettings: AppSettings = {
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

const themes: ThemePreference[] = ['system', 'light', 'dark'];

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

  if (typeof value.autosave === 'boolean') {
    patch.autosave = value.autosave;
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

  return patch;
}

function sanitizeSettings(value: Partial<AppSettings>): AppSettings {
  const currentBounds = value.windowBounds ?? defaultSettings.windowBounds;

  const next: AppSettings = {
    theme: themes.indexOf(value.theme as ThemePreference) >= 0 ? (value.theme as ThemePreference) : defaultSettings.theme,
    fontSize: clamp(asFiniteNumber(value.fontSize, defaultSettings.fontSize), 12, 24),
    windowBounds: {
      width: clamp(asFiniteNumber(currentBounds.width, defaultSettings.windowBounds.width), 900, 2400),
      height: clamp(asFiniteNumber(currentBounds.height, defaultSettings.windowBounds.height), 600, 1600),
    },
    lastFilePath: typeof value.lastFilePath === 'string' && value.lastFilePath.length > 0 ? value.lastFilePath : null,
    autosave: Boolean(value.autosave),
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

export function readSettings(): AppSettings {
  const settingsPath = getSettingsPath();

  try {
    if (!fs.existsSync(settingsPath)) {
      return defaultSettings;
    }

    const raw = fs.readFileSync(settingsPath, 'utf-8');
    return sanitizeSettings({
      ...defaultSettings,
      ...JSON.parse(raw),
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
  });

  writeSettings(next);
  applyWindowShellThemeToAll(next);
  broadcastSettings(next);
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
    broadcastSettings(settings);
    return settings;
  });
}
