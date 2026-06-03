import { BrowserWindow, BrowserWindowConstructorOptions, nativeTheme } from "electron";

import type { AppSettings } from "../ipc/settingsHandlers";

type ResolvedTheme = "light" | "dark";

const titleBarHeight = 32;
const shellColors: Record<ResolvedTheme, { background: string; symbol: string }> = {
  dark: {
    background: "#171b1b",
    symbol: "#f4f0e8",
  },
  light: {
    background: "#eef1f4",
    symbol: "#172126",
  },
};

function resolveTheme(settings: Pick<AppSettings, "theme">): ResolvedTheme {
  if (settings.theme === "system") {
    return nativeTheme.shouldUseDarkColors ? "dark" : "light";
  }

  return settings.theme;
}

function getTitleBarColors(settings: Pick<AppSettings, "theme">): Electron.TitleBarOverlay {
  const theme = resolveTheme(settings);
  const colors = shellColors[theme];

  return {
    color: colors.background,
    symbolColor: colors.symbol,
    height: titleBarHeight,
  };
}

export function getWindowShellOptions(settings: Pick<AppSettings, "theme">): BrowserWindowConstructorOptions {
  return {
    autoHideMenuBar: true,
    titleBarStyle: "hidden",
    titleBarOverlay: getTitleBarColors(settings),
    backgroundColor: shellColors[resolveTheme(settings)].background,
  };
}

export function applyWindowShellTheme(window: BrowserWindow, settings: Pick<AppSettings, "theme">): void {
  if (window.isDestroyed()) {
    return;
  }

  window.setBackgroundColor(shellColors[resolveTheme(settings)].background);
  window.setTitleBarOverlay(getTitleBarColors(settings));
}

export function applyWindowShellThemeToAll(settings: Pick<AppSettings, "theme">): void {
  for (const window of BrowserWindow.getAllWindows()) {
    applyWindowShellTheme(window, settings);
  }
}
