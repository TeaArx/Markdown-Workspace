import { autoUpdater, type ProgressInfo, type UpdateInfo } from "electron-updater";

import {
  closeInstallExperienceWindow,
  createInstallExperienceWindow,
  setInstallExperienceProgress,
} from "./windows/installExperience";

const UPDATE_CHECK_DELAY_MS = 4500;
const INITIAL_DOWNLOAD_PROGRESS = 3;

let isConfigured = false;
let isDownloading = false;

function normalizeReleaseNotes(releaseNotes: unknown): string {
  if (typeof releaseNotes === "string") {
    return releaseNotes;
  }

  if (!Array.isArray(releaseNotes)) {
    return "";
  }

  return releaseNotes
    .map((entry) => {
      if (typeof entry === "string") {
        return entry;
      }

      if (entry && typeof entry === "object" && "note" in entry) {
        const note = (entry as { note?: unknown }).note;
        return typeof note === "string" ? note : "";
      }

      return "";
    })
    .filter(Boolean)
    .join("\n\n");
}

function getReleaseTitle(info: UpdateInfo): string {
  return `Версия ${info.version}`;
}

function showUpdateDownload(info: UpdateInfo): void {
  isDownloading = true;
  createInstallExperienceWindow({
    mode: "update-download",
    releaseName: getReleaseTitle(info),
    releaseNotes: normalizeReleaseNotes(info.releaseNotes),
  });
  setInstallExperienceProgress({
    percent: INITIAL_DOWNLOAD_PROGRESS,
    label: "Подготовка загрузки обновления",
  });

  autoUpdater.downloadUpdate().catch(() => {
    isDownloading = false;
    createInstallExperienceWindow({ mode: "update-error" });
  });
}

function showUpdateReady(info: UpdateInfo): void {
  isDownloading = false;
  closeInstallExperienceWindow();
  createInstallExperienceWindow({
    mode: "update-ready",
    releaseName: getReleaseTitle(info),
    releaseNotes: normalizeReleaseNotes(info.releaseNotes),
  });
}

function showUpdateError(): void {
  if (!isDownloading) {
    return;
  }

  isDownloading = false;
  createInstallExperienceWindow({ mode: "update-error" });
}

function updateDownloadProgress(progress: ProgressInfo): void {
  setInstallExperienceProgress({
    percent: progress.percent,
    label: `Скачиваем обновление: ${Math.round(progress.percent)}%`,
  });
}

export function configureAutoUpdatesOnce(isPackaged: boolean): void {
  if (isConfigured || !isPackaged) {
    return;
  }

  isConfigured = true;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;

  autoUpdater.on("update-available", showUpdateDownload);
  autoUpdater.on("update-not-available", closeInstallExperienceWindow);
  autoUpdater.on("download-progress", updateDownloadProgress);
  autoUpdater.on("update-downloaded", showUpdateReady);
  autoUpdater.on("error", showUpdateError);

  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((): void => undefined);
  }, UPDATE_CHECK_DELAY_MS);
}

export function installDownloadedUpdate(): void {
  autoUpdater.quitAndInstall(false, true);
}
