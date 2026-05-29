import { defineStore } from "pinia";

const starterContent = `# Без названия

Пишите Markdown слева и просматривайте справа.

- Откройте или перетащите файл .md/.txt
- Сохраняйте с Ctrl+S
- Используйте заметки для небольших локальных задач
`;

function getFileName(filePath: string | null): string {
  if (!filePath) {
    return "untitled.md";
  }

  return filePath.split(/[\\/]/).pop() ?? "untitled.md";
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
  }),

  getters: {
    isDirty: (state) => state.content !== state.savedContent,
    wordCount: (state) =>
      state.content.trim().split(/\s+/).filter(Boolean).length,
    charCount: (state) => state.content.length,
    lineCount: (state) => state.content.split("\n").length,
  },

  actions: {
    setContent(content: string) {
      this.content = content;
    },

    setViewMode(mode: ViewMode) {
      this.viewMode = mode;
    },

    newFile() {
      this.content = starterContent;
      this.savedContent = starterContent;
      this.filePath = null;
      this.fileName = "untitled.md";
      this.lastSavedAt = null;
      this.statusMessage = "Новый документ";
    },

    applyOpenedFile(file: OpenFileResult) {
      this.content = file.content;
      this.savedContent = file.content;
      this.filePath = file.path;
      this.fileName = file.name || getFileName(file.path);
      this.statusMessage = `Открыто: ${this.fileName}`;
    },

    applySavedFile(file: SaveFileResult) {
      this.savedContent = this.content;
      this.filePath = file.path;
      this.fileName = file.name || getFileName(file.path);
      this.lastSavedAt = file.savedAt;
      this.statusMessage = `Сохранено: ${this.fileName}`;
    },

    async openFromDialog() {
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
