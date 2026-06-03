import { defineStore } from 'pinia';

export const useGitStore = defineStore('git', {
  state: () => ({
    status: null as GitFileStatus | null,
    diff: '',
    isLoading: false,
    isDiffLoading: false,
    error: '',
  }),

  getters: {
    hasRepository: (state) => Boolean(state.status?.isRepository),
    hasDiff: (state) => state.diff.trim().length > 0,
  },

  actions: {
    clear() {
      this.status = null;
      this.diff = '';
      this.error = '';
      this.isLoading = false;
      this.isDiffLoading = false;
    },

    async refresh(filePath: string | null) {
      if (!filePath) {
        this.clear();
        return;
      }

      this.isLoading = true;
      this.error = '';

      try {
        this.status = await window.electronAPI.git.status(filePath);
      } catch (error) {
        this.status = null;
        this.error = error instanceof Error ? error.message : 'Не удалось прочитать Git-статус';
      } finally {
        this.isLoading = false;
      }
    },

    async loadDiff(filePath: string | null) {
      if (!filePath) {
        this.diff = '';
        return;
      }

      this.isDiffLoading = true;
      this.error = '';

      try {
        this.diff = await window.electronAPI.git.diff(filePath);
      } catch (error) {
        this.diff = '';
        this.error = error instanceof Error ? error.message : 'Не удалось получить diff';
      } finally {
        this.isDiffLoading = false;
      }
    },
  },
});
