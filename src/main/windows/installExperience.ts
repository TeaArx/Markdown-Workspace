import { BrowserWindow } from "electron";

import { IPC_CHANNELS } from "../../shared/constants";
import { windowIconPath } from "../assets";
import { getPreloadPath } from "./rendererEntry";

export type InstallExperienceMode =
  | "install"
  | "updated"
  | "update-download"
  | "update-ready"
  | "update-error";

interface InstallExperienceOptions {
  mode: InstallExperienceMode;
  releaseName?: string;
  releaseNotes?: string;
}

interface InstallExperienceCopy {
  eyebrow: string;
  title: string;
  detail: string;
  progressLabel: string;
  finalLabel: string;
  action?: string;
  secondary?: string;
}

const copyByMode: Record<InstallExperienceMode, InstallExperienceCopy> = {
  install: {
    eyebrow: "Markdown Workspace",
    title: "Завершаем установку",
    detail: "Подготавливаем рабочую папку, проверяем настройки и запускаем приложение.",
    progressLabel: "Настройка приложения",
    finalLabel: "Готово к работе",
    action: "Открыть приложение",
  },
  updated: {
    eyebrow: "Markdown Workspace",
    title: "Обновление установлено",
    detail: "Новая версия готова. Рабочее окружение приложения уже обновлено.",
    progressLabel: "Применение обновления",
    finalLabel: "Версия готова",
    action: "Открыть приложение",
  },
  "update-download": {
    eyebrow: "Markdown Workspace",
    title: "Скачиваем обновление",
    detail: "Проверяем и скачиваем файл новой версии. Если открыть приложение сейчас, загрузка будет остановлена.",
    progressLabel: "Подготовка загрузки",
    finalLabel: "Проверка файла",
    action: "Открыть приложение",
  },
  "update-ready": {
    eyebrow: "Markdown Workspace",
    title: "Обновление готово",
    detail: "Новая версия скачана. Перезапустите приложение, чтобы установить ее сейчас.",
    progressLabel: "Загрузка завершена",
    finalLabel: "100% готово",
    action: "Перезапустить и установить",
    secondary: "Позже",
  },
  "update-error": {
    eyebrow: "Markdown Workspace",
    title: "Обновление не удалось",
    detail: "Не получилось проверить или скачать новую версию. Можно продолжить работу и повторить попытку позже.",
    progressLabel: "Проверка обновления",
    finalLabel: "Нужно повторить позже",
    action: "Продолжить",
  },
};

let installExperienceWindow: BrowserWindow | null = null;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function createStyles(hasAction: boolean): string {
  return `
    :root {
      color-scheme: dark;
      --bg: #151818;
      --surface: #202525;
      --surface-raised: #29302f;
      --text: #f3f5f1;
      --muted: #aeb8b1;
      --accent: #5ed0bd;
      --accent-strong: #a1eadc;
      --warning: #e0aa5f;
      --border: #3f4947;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      min-height: 100vh;
      overflow: hidden;
      background: linear-gradient(135deg, #151818, #222928 56%, #171b1c);
      color: var(--text);
      font-family: "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, Arial, sans-serif;
      user-select: none;
    }

    .shell {
      min-height: 100vh;
      display: grid;
      grid-template-rows: 36px 1fr;
      padding: 18px 22px 24px;
    }

    .titlebar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: var(--muted);
      font-size: 12px;
      -webkit-app-region: drag;
    }

    .window-actions {
      display: flex;
      -webkit-app-region: no-drag;
    }

    .window-actions button {
      width: 32px;
      height: 28px;
      border: 1px solid transparent;
      border-radius: 6px;
      background: transparent;
      color: var(--muted);
      cursor: pointer;
      font: inherit;
      font-size: 18px;
      line-height: 1;
    }

    .window-actions button:hover {
      border-color: var(--border);
      background: rgba(255, 255, 255, 0.06);
      color: var(--text);
    }

    main {
      width: 100%;
      display: grid;
      align-content: center;
      gap: 22px;
      padding: 18px 8px 14px;
    }

    .mark {
      width: 62px;
      height: 62px;
      display: grid;
      place-items: center;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 12px;
      background: linear-gradient(135deg, #6788f0, var(--accent) 58%, #d18d44);
      color: #071615;
      font-size: 24px;
      font-weight: 750;
    }

    .copy {
      display: grid;
      gap: 10px;
      max-width: 570px;
    }

    .eyebrow {
      margin: 0;
      color: var(--accent-strong);
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0;
      text-transform: uppercase;
    }

    h1 {
      margin: 0;
      font-size: 33px;
      font-weight: 650;
      line-height: 1.14;
      letter-spacing: 0;
    }

    .detail,
    .release,
    .notes {
      margin: 0;
      color: var(--muted);
      font-size: 15px;
      line-height: 1.55;
    }

    .release {
      color: var(--text);
      font-weight: 650;
    }

    .notes {
      max-height: 88px;
      overflow: hidden;
      padding: 10px 12px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.04);
      font-size: 13px;
      white-space: pre-wrap;
    }

    .progress {
      display: grid;
      gap: 10px;
      max-width: 570px;
    }

    .progress__meta {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      color: var(--muted);
      font-size: 13px;
    }

    .progress__percent {
      flex: 0 0 auto;
      color: var(--accent-strong);
      font-weight: 700;
    }

    .track {
      height: 12px;
      overflow: hidden;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.1);
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
    }

    .bar {
      width: 0;
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, var(--accent), #7f9cf3 58%, var(--warning));
      transition: width 0.22s ease;
    }

    .steps {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
      max-width: 570px;
    }

    .step {
      min-width: 0;
      padding: 9px 10px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.045);
      color: var(--muted);
      font-size: 12px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .step.active {
      border-color: rgba(94, 208, 189, 0.5);
      background: rgba(94, 208, 189, 0.14);
      color: var(--accent-strong);
    }

    .actions {
      display: ${hasAction ? "flex" : "none"};
      flex-wrap: wrap;
      gap: 10px;
      max-width: 570px;
    }

    .actions button {
      min-height: 38px;
      padding: 0 16px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--surface-raised);
      color: var(--text);
      cursor: pointer;
      font: inherit;
      font-size: 13px;
      font-weight: 650;
    }

    .actions button.primary {
      border-color: var(--accent);
      background: linear-gradient(180deg, #64d5c2, #28a38d);
      color: #071615;
    }
  `;
}

function createInstallExperienceHtml(options: InstallExperienceOptions): string {
  const copy = copyByMode[options.mode];
  const targetProgress = options.mode === "update-download" ? 92 : 100;
  const hasAction = Boolean(copy.action);
  const releaseTitle = options.releaseName ? `<p class="release">${escapeHtml(options.releaseName)}</p>` : "";
  const releaseNotes = options.releaseNotes
    ? `<div class="notes">${escapeHtml(options.releaseNotes.slice(0, 900))}</div>`
    : "";
  const secondaryButton = copy.secondary
    ? `<button type="button" data-later>${escapeHtml(copy.secondary)}</button>`
    : "";

  return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'self' data:; script-src 'unsafe-inline'; style-src 'unsafe-inline';" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(copy.title)}</title>
    <style>${createStyles(hasAction)}</style>
  </head>
  <body>
    <div class="shell">
      <header class="titlebar">
        <span>${escapeHtml(copy.eyebrow)}</span>
        <div class="window-actions">
          <button type="button" data-close title="Закрыть">×</button>
        </div>
      </header>
      <main>
        <div class="mark">M</div>
        <section class="copy">
          <p class="eyebrow">${escapeHtml(copy.eyebrow)}</p>
          <h1>${escapeHtml(copy.title)}</h1>
          <p class="detail">${escapeHtml(copy.detail)}</p>
          ${releaseTitle}
          ${releaseNotes}
        </section>
        <section class="progress" aria-label="${escapeHtml(copy.progressLabel)}">
          <div class="progress__meta">
            <span data-label>${escapeHtml(copy.progressLabel)}</span>
            <span class="progress__percent" data-percent>0%</span>
          </div>
          <div class="track"><div class="bar" data-bar></div></div>
        </section>
        <section class="steps">
          <div class="step active" data-step="0">Проверка</div>
          <div class="step" data-step="1">Подготовка</div>
          <div class="step" data-step="2">${escapeHtml(copy.finalLabel)}</div>
        </section>
        <section class="actions">
          <button class="primary" type="button" data-install>${escapeHtml(copy.action ?? "")}</button>
          ${secondaryButton}
        </section>
      </main>
    </div>
    <script>
      const target = ${targetProgress};
      const mode = ${JSON.stringify(options.mode)};
      const finalLabel = ${JSON.stringify(copy.finalLabel)};
      const bar = document.querySelector("[data-bar]");
      const percent = document.querySelector("[data-percent]");
      const label = document.querySelector("[data-label]");
      const steps = Array.from(document.querySelectorAll("[data-step]"));
      let isClosing = false;
      let progress = mode === "update-ready" ? 100 : 7;

      function setProgress(value) {
        progress = Math.min(target, Math.max(0, value));
        bar.style.width = progress + "%";
        percent.textContent = Math.round(progress) + "%";
        steps.forEach((step, index) => step.classList.toggle("active", progress >= index * 38));

        if (progress >= target) {
          label.textContent = finalLabel;
        }
      }

      if (mode === "update-ready") {
        setProgress(100);
      } else {
        setProgress(progress);
        window.setInterval(() => {
          const remaining = target - progress;
          const speed = remaining > 24 ? 4.5 : 1.25;
          setProgress(progress + Math.random() * speed + 0.6);
        }, 240);
      }

      window.electronAPI?.onUpdateProgress?.((payload) => {
        if (typeof payload?.percent === "number") {
          setProgress(payload.percent);
        }

        if (typeof payload?.label === "string" && payload.label.length > 0) {
          label.textContent = payload.label;
        }
      });

      async function closeWindow(cancelDownload) {
        if (isClosing) {
          return;
        }

        isClosing = true;

        if (cancelDownload) {
          label.textContent = "Останавливаем загрузку";
          await window.electronAPI?.cancelUpdateDownload?.().catch(() => false);
        }

        window.electronAPI?.closeCurrentWindow?.();
      }

      document.querySelector("[data-close]")?.addEventListener("click", () => {
        closeWindow(mode === "update-download");
      });

      document.querySelector("[data-later]")?.addEventListener("click", () => {
        closeWindow(false);
      });

      document.querySelector("[data-install]")?.addEventListener("click", (event) => {
        event.currentTarget.disabled = true;

        if (mode === "update-ready") {
          window.electronAPI?.installUpdate?.();
          return;
        }

        closeWindow(mode === "update-download");
      });
    </script>
  </body>
</html>`;
}

export function createInstallExperienceWindow(options: InstallExperienceOptions): BrowserWindow {
  if (installExperienceWindow && !installExperienceWindow.isDestroyed()) {
    installExperienceWindow.close();
  }

  installExperienceWindow = new BrowserWindow({
    width: 680,
    height: 520,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    frame: false,
    show: false,
    title: "Markdown Workspace",
    icon: windowIconPath,
    backgroundColor: "#151818",
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  installExperienceWindow.loadURL(
    `data:text/html;charset=utf-8,${encodeURIComponent(createInstallExperienceHtml(options))}`,
  );

  installExperienceWindow.once("ready-to-show", () => {
    installExperienceWindow?.show();
  });

  installExperienceWindow.on("closed", () => {
    installExperienceWindow = null;
  });

  return installExperienceWindow;
}

export function closeInstallExperienceWindow(): void {
  if (installExperienceWindow && !installExperienceWindow.isDestroyed()) {
    installExperienceWindow.close();
  }
}

export function setInstallExperienceProgress(payload: { percent?: number; label?: string }): void {
  if (installExperienceWindow && !installExperienceWindow.isDestroyed()) {
    installExperienceWindow.webContents.send(IPC_CHANNELS.APP_UPDATE_PROGRESS, payload);
  }
}
