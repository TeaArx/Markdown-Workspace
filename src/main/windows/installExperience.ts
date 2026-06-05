import { BrowserWindow } from "electron";

import { IPC_CHANNELS } from "../../shared/constants";
import { windowIconPath } from "../assets";

declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

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

let installExperienceWindow: BrowserWindow | null = null;

const modeCopy: Record<InstallExperienceMode, {
  eyebrow: string;
  title: string;
  detail: string;
  progressLabel: string;
  finalLabel: string;
  action?: string;
  secondary?: string;
}> = {
  install: {
    eyebrow: "Markdown Workspace",
    title: "Завершаем установку",
    detail: "Создаем ярлыки, подготавливаем рабочую папку и проверяем настройки перед первым запуском.",
    progressLabel: "Настройка приложения",
    finalLabel: "Готово к работе",
    action: "Открыть приложение",
  },
  updated: {
    eyebrow: "Markdown Workspace",
    title: "Обновление установлено",
    detail: "Применяем новую версию и обновляем рабочее окружение приложения.",
    progressLabel: "Применение обновления",
    finalLabel: "Новая версия готова",
    action: "Открыть приложение",
  },
  "update-download": {
    eyebrow: "Markdown Workspace",
    title: "Скачиваем обновление",
    detail: "Загрузка идет в фоне. Можно продолжать работу, окно закроется само, когда обновление будет готово.",
    progressLabel: "Подготовка обновления",
    finalLabel: "Почти готово",
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
    detail: "Не получилось скачать или проверить новую версию. Можно продолжить работу и попробовать позже.",
    progressLabel: "Проверка обновления",
    finalLabel: "Нужно повторить позже",
    action: "Продолжить",
  },
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function createInstallExperienceHtml(options: InstallExperienceOptions): string {
  const copy = modeCopy[options.mode];
  const hasAction = Boolean(copy.action);
  const targetProgress = options.mode === "update-download" ? 92 : 100;
  const releaseTitle = options.releaseName ? `<p class="release">${escapeHtml(options.releaseName)}</p>` : "";
  const releaseNotes = options.releaseNotes
    ? `<div class="notes">${escapeHtml(options.releaseNotes).slice(0, 900)}</div>`
    : "";
  const secondaryButton = copy.secondary
    ? `<button type="button" data-later>${escapeHtml(copy.secondary)}</button>`
    : "";

  return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'self' data:; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:;" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(copy.title)}</title>
    <style>
      :root {
        color-scheme: dark;
        --bg: #171b1b;
        --panel: #242927;
        --panel-soft: #2d332f;
        --text: #f4f0e8;
        --muted: #c3baad;
        --accent: #58c7b2;
        --accent-strong: #9ee3d5;
        --warning: #e7a95f;
        --border: #465047;
      }

      * { box-sizing: border-box; }

      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background:
          radial-gradient(circle at 18% 12%, rgba(88, 199, 178, 0.24), transparent 34%),
          linear-gradient(145deg, #151918, #232925 48%, #181d1c);
        color: var(--text);
        font-family: "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, Arial, sans-serif;
        overflow: hidden;
        user-select: none;
      }

      .shell {
        width: 100%;
        min-height: 100vh;
        display: grid;
        grid-template-rows: auto 1fr;
        padding: 20px;
      }

      .titlebar {
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        color: var(--muted);
        font-size: 12px;
        -webkit-app-region: drag;
      }

      .window-actions {
        display: flex;
        gap: 8px;
        -webkit-app-region: no-drag;
      }

      .window-actions button {
        width: 32px;
        height: 28px;
        border: 1px solid transparent;
        border-radius: 7px;
        background: transparent;
        color: var(--muted);
        cursor: pointer;
        font: inherit;
      }

      .window-actions button:hover {
        border-color: var(--border);
        background: rgba(255, 255, 255, 0.06);
        color: var(--text);
      }

      main {
        display: grid;
        align-content: center;
        gap: 24px;
        padding: 16px 12px 26px;
      }

      .mark {
        width: 64px;
        height: 64px;
        display: grid;
        place-items: center;
        border-radius: 14px;
        background:
          linear-gradient(135deg, rgba(255, 255, 255, 0.22), transparent 42%),
          linear-gradient(135deg, #9aa8ff, var(--accent) 54%, #c77a2d);
        box-shadow: 0 22px 54px rgba(88, 199, 178, 0.22);
        color: white;
        font-size: 24px;
        font-weight: 700;
      }

      .copy {
        display: grid;
        gap: 10px;
      }

      .eyebrow {
        margin: 0;
        color: var(--accent-strong);
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      h1 {
        margin: 0;
        max-width: 520px;
        font-size: 34px;
        font-weight: 650;
        line-height: 1.12;
        letter-spacing: 0;
      }

      .detail,
      .release,
      .notes {
        margin: 0;
        max-width: 560px;
        color: var(--muted);
        font-size: 15px;
        line-height: 1.55;
      }

      .release {
        color: var(--text);
        font-weight: 600;
      }

      .notes {
        max-height: 88px;
        overflow: hidden;
        padding: 10px 12px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.04);
        font-size: 13px;
      }

      .progress {
        display: grid;
        gap: 10px;
        max-width: 560px;
      }

      .progress__meta {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        color: var(--muted);
        font-size: 13px;
      }

      .progress__percent {
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
        width: 8%;
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, var(--accent), #9aa8ff 54%, var(--warning));
        transition: width 0.22s ease;
      }

      .steps {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
        max-width: 560px;
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
        border-color: rgba(88, 199, 178, 0.5);
        background: rgba(88, 199, 178, 0.14);
        color: var(--accent-strong);
      }

      .actions {
        display: ${hasAction ? "flex" : "none"};
        flex-wrap: wrap;
        gap: 10px;
      }

      .actions button {
        min-height: 38px;
        padding: 0 16px;
        border: 1px solid var(--border);
        border-radius: 8px;
        background: var(--panel-soft);
        color: var(--text);
        cursor: pointer;
        font: inherit;
        font-size: 13px;
        font-weight: 600;
      }

      .actions button.primary {
        border-color: var(--accent);
        background: linear-gradient(180deg, #58c7b2, #219985);
        color: #071615;
      }
    </style>
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
          <div class="step active" data-step="0">Проверка файлов</div>
          <div class="step" data-step="1">Настройка ярлыков</div>
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
      const bar = document.querySelector("[data-bar]");
      const percent = document.querySelector("[data-percent]");
      const label = document.querySelector("[data-label]");
      const steps = Array.from(document.querySelectorAll("[data-step]"));
      let progress = mode === "update-ready" ? 100 : 7;

      function setProgress(value) {
        progress = Math.min(target, Math.max(0, value));
        bar.style.width = progress + "%";
        percent.textContent = Math.round(progress) + "%";
        steps.forEach((step, index) => step.classList.toggle("active", progress >= index * 38));
        if (progress >= target) {
          label.textContent = ${JSON.stringify(copy.finalLabel)};
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

      document.querySelector("[data-close]")?.addEventListener("click", () => {
        window.electronAPI?.closeCurrentWindow?.();
      });

      document.querySelector("[data-later]")?.addEventListener("click", () => {
        window.electronAPI?.closeCurrentWindow?.();
      });

      document.querySelector("[data-install]")?.addEventListener("click", () => {
        if (mode === "update-ready") {
          window.electronAPI?.installUpdate?.();
          return;
        }

        window.electronAPI?.closeCurrentWindow?.();
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
    backgroundColor: "#171b1b",
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
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
