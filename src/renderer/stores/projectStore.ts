import { defineStore } from 'pinia';

export const useProjectStore = defineStore('projects', {
  state: () => ({
    rootPath: '',
    rootExists: true,
    projects: [] as GitProject[],
    selectedProject: null as GitProject | null,
    activeProject: null as GitProject | null,
    files: [] as ProjectFile[],
    isLoadingProjects: false,
    isLoadingFiles: false,
    error: '',
  }),

  getters: {
    hasProjects: (state) => state.projects.length > 0,
    hasFiles: (state) => state.files.length > 0,
  },

  actions: {
    applyProjects(result: ProjectsListResult) {
      this.rootPath = result.rootPath;
      this.rootExists = result.rootExists;
      this.projects = result.projects;
      this.activeProject = result.projects.find((project) => project.path === this.activeProject?.path) ?? this.activeProject;
      this.selectedProject =
        result.projects.find((project) => project.path === this.selectedProject?.path) ??
        result.projects.find((project) => project.path === this.activeProject?.path) ??
        result.projects[0] ??
        null;
    },

    async loadProjects(rootPath?: string | null) {
      this.isLoadingProjects = true;
      this.error = '';

      try {
        const result = await window.electronAPI.projects.list(rootPath ?? null);
        this.applyProjects(result);

        if (this.selectedProject) {
          await this.selectProject(this.selectedProject);
        } else {
          this.files = [];
        }
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Не удалось найти Git-проекты';
      } finally {
        this.isLoadingProjects = false;
      }
    },

    async pickRoot() {
      this.isLoadingProjects = true;
      this.error = '';

      try {
        const result = await window.electronAPI.projects.pickRoot();

        if (!result) {
          return;
        }

        this.applyProjects(result);

        if (this.selectedProject) {
          await this.selectProject(this.selectedProject);
        } else {
          this.files = [];
        }
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Не удалось выбрать папку проектов';
      } finally {
        this.isLoadingProjects = false;
      }
    },

    async selectProject(project: GitProject) {
      this.selectedProject = project;
      this.files = [];
      this.isLoadingFiles = true;
      this.error = '';

      try {
        this.files = await window.electronAPI.projects.listFiles(project.path);
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Не удалось прочитать файлы проекта';
      } finally {
        this.isLoadingFiles = false;
      }
    },

    setActiveProject(project: GitProject | null) {
      this.activeProject = project;
    },
  },
});
