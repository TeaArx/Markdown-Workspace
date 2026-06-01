import { BrowserWindow, BrowserWindowConstructorOptions, nativeTheme } from "electron";

import type { AppSettings } from "../ipc/settingsHandlers";

type ResolvedTheme = "light" | "dark";

const titleBarHeight = 32;

function resolveTheme(settings: Pick<AppSettings, "theme">): ResolvedTheme {
  if (settings.theme === "system") {
    return nativeTheme.shouldUseDarkColors ? "dark" : "light";
  }

  return settings.theme;
}

function getTitleBarColors(settings: Pick<AppSettings, "theme">): Electron.TitleBarOverlay {
  const theme = resolveTheme(settings);

  if (theme === "dark") {
    return {
      color: "#171b1b",
      symbolColor: "#f4f0e8",
      height: titleBarHeight,
    };
  }

  return {
    color: "#f3f1ec",
    symbolColor: "#1e2422",
    height: titleBarHeight,
  };
}

export function getWindowShellOptions(settings: Pick<AppSettings, "theme">): BrowserWindowConstructorOptions {
  return {
    autoHideMenuBar: true,
    titleBarStyle: "hidden",
    titleBarOverlay: getTitleBarColors(settings),
    backgroundColor: resolveTheme(settings) === "dark" ? "#171b1b" : "#f3f1ec",
  };
}

export function applyWindowShellTheme(window: BrowserWindow, settings: Pick<AppSettings, "theme">): void {
  if (window.isDestroyed()) {
    return;
  }

  window.setBackgroundColor(resolveTheme(settings) === "dark" ? "#171b1b" : "#f3f1ec");
  window.setTitleBarOverlay(getTitleBarColors(settings));
}

export function applyWindowShellThemeToAll(settings: Pick<AppSettings, "theme">): void {
  for (const window of BrowserWindow.getAllWindows()) {
    applyWindowShellTheme(window, settings);
  }
}
