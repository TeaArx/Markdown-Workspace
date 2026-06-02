import { defineStore } from "pinia";

const starterContent = `# Без названия

Пишите Markdown слева и просматривайте справа.

- Откройте или перетащите файл .md/.txt
- Сохраняйте с Ctrl+S
- Используйте заметки для небольших локальных задач
`;

const historyLimit = 80;
const historyGroupIntervalMs = 900;

function getFileName(filePath: string | null): string {
  if (!filePath) {
    return "untitled.md";
  }

  return filePath.split(/[\\/]/).pop() ?? "untitled.md";
}

function createDraftFileName(title: string): string {
  const normalized = title
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 48);

  return `${normalized || "note"}.md`;
}

export const useEditorStore = defineStore("editor", {
  state: () => ({
    content: starterContent,
    savedContent: starterContent,
    filePath: null as string | null,
    fileName: "untitled.md",
    lastSavedAt: null as string | null,
    viewMode: "split" as ViewMode,
    statusMessage: "Готово",
    isLoading: false,
    undoStack: [] as string[],
    redoStack: [] as string[],
    lastHistoryAt: 0,
  }),

  getters: {
    isDirty: (state) => state.content !== state.savedContent,
    canUndo: (state) => state.undoStack.length > 0,
    canRedo: (state) => state.redoStack.length > 0,
    wordCount: (state) =>
      state.content.trim().split(/\s+/).filter(Boolean).length,
    charCount: (state) => state.content.length,
    lineCount: (state) => state.content.split("\n").length,
  },

  actions: {
    resetHistory() {
      this.undoStack = [];
      this.redoStack = [];
      this.lastHistoryAt = 0;
    },

    setContent(content: string, trackHistory = true) {
      if (content === this.content) {
        return;
      }

      if (trackHistory) {
        const now = Date.now();
        const previousSnapshot = this.undoStack[this.undoStack.length - 1];
        const isGroupedEdit =
          previousSnapshot !== undefined &&
          now - this.lastHistoryAt < historyGroupIntervalMs &&
          Math.abs(content.length - this.content.length) <= 1;

        if (!isGroupedEdit && previousSnapshot !== this.content) {
          this.undoStack.push(this.content);
          this.undoStack = this.undoStack.slice(-historyLimit);
          this.lastHistoryAt = now;
        }

        this.redoStack = [];
      }

      this.content = content;
    },

    undo() {
      const previous = this.undoStack.pop();

      if (previous === undefined) {
        return;
      }

      this.redoStack.push(this.content);
      this.content = previous;
      this.lastHistoryAt = Date.now();
      this.statusMessage = "Отменено";
    },

    redo() {
      const next = this.redoStack.pop();

      if (next === undefined) {
        return;
      }

      this.undoStack.push(this.content);
      this.content = next;
      this.lastHistoryAt = Date.now();
      this.statusMessage = "Возвращено";
    },

    setViewMode(mode: ViewMode) {
      this.viewMode = mode;
    },

    confirmDiscardUnsavedChanges(actionLabel: string) {
      if (!this.isDirty) {
        return true;
      }

      return window.confirm(
        `${actionLabel}?\n\nВ текущем файле есть несохранённые изменения. Продолжить без сохранения?`,
      );
    },

    newFile() {
      if (!this.confirmDiscardUnsavedChanges("Создать новый файл")) {
        this.statusMessage = "Создание нового файла отменено";
        return false;
      }

      this.content = starterContent;
      this.savedContent = starterContent;
      this.filePath = null;
      this.fileName = "untitled.md";
      this.lastSavedAt = null;
      this.statusMessage = "Новый документ";
      this.resetHistory();
      return true;
    },

    replaceWithDraft(title: string, content: string) {
      if (!this.confirmDiscardUnsavedChanges("Заменить содержимое редактора")) {
        this.statusMessage = "Перенос заметки отменён";
        return false;
      }

      this.content = content;
      this.savedContent = "";
      this.filePath = null;
      this.fileName = createDraftFileName(title);
      this.lastSavedAt = null;
      this.statusMessage = "Заметка перенесена в новый документ";
      this.resetHistory();
      return true;
    },

    applyOpenedFile(file: OpenFileResult) {
      this.content = file.content;
      this.savedContent = file.content;
      this.filePath = file.path;
      this.fileName = file.name || getFileName(file.path);
      this.statusMessage = `Открыто: ${this.fileName}`;
      this.resetHistory();
    },

    applySavedFile(file: SaveFileResult) {
      this.savedContent = this.content;
      this.filePath = file.path;
      this.fileName = file.name || getFileName(file.path);
      this.lastSavedAt = file.savedAt;
      this.statusMessage = `Сохранено: ${this.fileName}`;
    },

    async openFromDialog() {
      if (!this.confirmDiscardUnsavedChanges("Открыть другой файл")) {
        this.statusMessage = "Открытие отменено";
        return;
      }

      this.isLoading = true;

      try {
        const file = await window.electronAPI.openFile();

        if (file) {
          this.applyOpenedFile(file);
        } else {
          this.statusMessage = "Открытие отменено";
        }
      } catch (error) {
        this.statusMessage =
          error instanceof Error ? error.message : "Не удалось открыть файл";
      } finally {
        this.isLoading = false;
      }
    },

    async openFromPath(filePath: string, showError = true) {
      if (!this.confirmDiscardUnsavedChanges("Открыть другой файл")) {
        this.statusMessage = "Открытие отменено";
        return;
      }

      this.isLoading = true;

      try {
        const file = await window.electronAPI.openFileByPath(filePath);
        this.applyOpenedFile(file);
      } catch (error) {
        if (showError) {
          this.statusMessage =
            error instanceof Error
              ? error.message
              : "Не удалось открыть перетащенный файл";
        }
      } finally {
        this.isLoading = false;
      }
    },

    async save() {
      this.isLoading = true;

      try {
        const file = await window.electronAPI.saveFile(
          this.content,
          this.filePath,
        );

        if (file) {
          this.applySavedFile(file);
        } else {
          this.statusMessage = "Сохранение отменено";
        }
      } catch (error) {
        this.statusMessage =
          error instanceof Error ? error.message : "Не удалось сохранить файл";
      } finally {
        this.isLoading = false;
      }
    },

    async saveAs() {
      this.isLoading = true;

      try {
        const file = await window.electronAPI.saveFileAs(
          this.content,
          this.filePath,
        );

        if (file) {
          this.applySavedFile(file);
        } else {
          this.statusMessage = "Сохранение отменено";
        }
      } catch (error) {
        this.statusMessage =
          error instanceof Error ? error.message : "Не удалось сохранить файл";
      } finally {
        this.isLoading = false;
      }
    },
  },
});
