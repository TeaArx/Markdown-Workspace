import fs from "node:fs";
import path from "node:path";

import { app } from "electron";

export type StartupExperienceMode = "install" | "updated";

interface VersionState {
  version?: string;
}

const INSTALL_WELCOME_ARG = "--install-welcome";
const UPDATED_WELCOME_ARG = "--updated-welcome";

function getVersionStatePath(): string {
  return path.join(app.getPath("userData"), "version-state.json");
}

function readPreviousVersion(): string | null {
  try {
    const rawState = fs.readFileSync(getVersionStatePath(), "utf8");
    const state = JSON.parse(rawState) as VersionState;
    return typeof state.version === "string" ? state.version : null;
  } catch {
    return null;
  }
}

export function getStartupExperienceModeFromArgs(args: string[]): StartupExperienceMode | null {
  if (args.includes(INSTALL_WELCOME_ARG)) {
    return "install";
  }

  if (args.includes(UPDATED_WELCOME_ARG)) {
    return "updated";
  }

  return null;
}

export function getStartupExperienceMode(): StartupExperienceMode | null {
  const argumentMode = getStartupExperienceModeFromArgs(process.argv);

  if (argumentMode) {
    return argumentMode;
  }

  if (!app.isPackaged) {
    return null;
  }

  const previousVersion = readPreviousVersion();

  if (!previousVersion) {
    return "install";
  }

  return previousVersion === app.getVersion() ? null : "updated";
}

export function rememberCurrentVersion(): void {
  try {
    fs.mkdirSync(app.getPath("userData"), { recursive: true });
    fs.writeFileSync(
      getVersionStatePath(),
      JSON.stringify({ version: app.getVersion(), updatedAt: new Date().toISOString() }, null, 2),
      "utf8",
    );
  } catch {
    // The welcome screen must never block app startup.
  }
}
