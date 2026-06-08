import { CancellationError, CancellationToken } from "builder-util-runtime";
import { autoUpdater, type ProgressInfo, type UpdateInfo } from "electron-updater";

import {
  closeInstallExperienceWindow,
  createInstallExperienceWindow,
  setInstallExperienceProgress,
} from "./windows/installExperience";

const UPDATE_CHECK_DELAY_MS = 4500;
const INITIAL_DOWNLOAD_PROGRESS = 3;

type UpdateState = "idle" | "checking" | "downloading" | "ready" | "cancelled";

let isConfigured = false;
let updateState: UpdateState = "idle";
let downloadCancellationToken: CancellationToken | null = null;

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

function disposeDownloadToken(): void {
  downloadCancellationToken?.dispose();
  downloadCancellationToken = null;
}

function showUpdateDownload(info: UpdateInfo): void {
  if (updateState === "downloading" || updateState === "ready") {
    return;
  }

  updateState = "downloading";
  disposeDownloadToken();
  downloadCancellationToken = new CancellationToken();

  const downloadWindow = createInstallExperienceWindow({
    mode: "update-download",
    releaseName: getReleaseTitle(info),
    releaseNotes: normalizeReleaseNotes(info.releaseNotes),
  });

  downloadWindow.once("closed", () => {
    if (updateState === "downloading") {
      cancelUpdateDownload();
    }
  });

  setInstallExperienceProgress({
    percent: INITIAL_DOWNLOAD_PROGRESS,
    label: "Подготовка загрузки обновления",
  });

  autoUpdater.downloadUpdate(downloadCancellationToken).catch((error: unknown) => {
    if (error instanceof CancellationError || updateState === "cancelled") {
      return;
    }

    showUpdateError();
  });
}

function showUpdateReady(info: UpdateInfo): void {
  updateState = "ready";
  disposeDownloadToken();
  closeInstallExperienceWindow();
  createInstallExperienceWindow({
    mode: "update-ready",
    releaseName: getReleaseTitle(info),
    releaseNotes: normalizeReleaseNotes(info.releaseNotes),
  });
}

function showUpdateError(): void {
  if (updateState !== "checking" && updateState !== "downloading") {
    return;
  }

  updateState = "idle";
  disposeDownloadToken();
  createInstallExperienceWindow({ mode: "update-error" });
}

function updateDownloadProgress(progress: ProgressInfo): void {
  if (updateState !== "downloading") {
    return;
  }

  setInstallExperienceProgress({
    percent: Math.min(progress.percent, 99),
    label:
      progress.percent >= 99
        ? "Проверяем файл обновления"
        : `Скачиваем обновление: ${Math.round(progress.percent)}%`,
  });
}

function handleUpdateNotAvailable(): void {
  if (updateState === "checking") {
    updateState = "idle";
  }

  closeInstallExperienceWindow();
}

function handleUpdateCancelled(): void {
  if (updateState !== "cancelled") {
    updateState = "idle";
  }

  disposeDownloadToken();
}

export function configureAutoUpdatesOnce(isPackaged: boolean): void {
  if (isConfigured || !isPackaged) {
    return;
  }

  isConfigured = true;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;

  autoUpdater.on("checking-for-update", () => {
    if (updateState === "idle") {
      updateState = "checking";
    }
  });
  autoUpdater.on("update-available", showUpdateDownload);
  autoUpdater.on("update-not-available", handleUpdateNotAvailable);
  autoUpdater.on("download-progress", updateDownloadProgress);
  autoUpdater.on("update-downloaded", showUpdateReady);
  autoUpdater.on("update-cancelled", handleUpdateCancelled);
  autoUpdater.on("error", showUpdateError);

  setTimeout(() => {
    if (updateState !== "idle") {
      return;
    }

    autoUpdater.checkForUpdates().catch((): void => {
      if (updateState === "checking") {
        updateState = "idle";
      }
    });
  }, UPDATE_CHECK_DELAY_MS);
}

export function cancelUpdateDownload(): boolean {
  if (updateState !== "downloading" || !downloadCancellationToken) {
    return false;
  }

  updateState = "cancelled";
  setInstallExperienceProgress({
    label: "Загрузка обновления остановлена",
  });
  downloadCancellationToken.cancel();
  return true;
}

export function installDownloadedUpdate(): boolean {
  if (updateState !== "ready") {
    return false;
  }

  autoUpdater.quitAndInstall(false, true);
  return true;
}
