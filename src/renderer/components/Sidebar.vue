<template>
  <aside class="sidebar">
    <div class="brand">
      <div class="brand__mark">M</div>
      <div>
        <strong>Markdown Workspace</strong>
        <span>Настольный редактор</span>
      </div>
    </div>

    <div class="sidebar__scroll">
      <nav class="nav-list">
        <RouterLink
          to="/"
          class="nav-item"
          data-short="Ред"
          title="Редактор"
        >
          <span>Редактор</span>
        </RouterLink>
        <RouterLink
          to="/notes"
          class="nav-item"
          data-short="Зам"
          title="Заметки"
        >
          <span>Заметки</span>
        </RouterLink>
        <RouterLink
          to="/chart"
          class="nav-item"
          data-short="Mer"
          title="Mermaid"
        >
          <span>Mermaid</span>
        </RouterLink>
      </nav>

      <div class="side-command-grid">
        <button
          class="side-command"
          type="button"
          data-short="Отк"
          title="Открыть файл"
          @click="editor.openFromDialog"
        >
          Открыть
        </button>
        <button
          v-if="settingsStore.settings.gitIntegrationEnabled"
          class="side-command"
          type="button"
          data-short="Про"
          title="Показать проекты"
          @click="openProjects"
        >
          Проекты
        </button>
        <button
          class="side-command"
          type="button"
          data-short="Обз"
          title="Рабочая область"
          @click="openWorkspace"
        >
          Обзор
        </button>
        <button
          v-if="settingsStore.settings.gitIntegrationEnabled"
          class="side-command"
          type="button"
          data-short="Изм"
          title="Показать изменения"
          :disabled="!editor.filePath || git.isDiffLoading"
          @click="openGitDiff"
        >
          Правки
        </button>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="isWorkspaceOpen"
        class="workspace-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="workspace-title"
        @click.self="closeWorkspace"
      >
        <section class="workspace-dialog">
          <header class="workspace-dialog__header">
            <div>
              <h2 id="workspace-title">Рабочая область</h2>
              <p>{{ editor.filePath ?? "Файл пока не сохранён" }}</p>
            </div>
            <button
              class="markdown-help__close"
              type="button"
              aria-label="Закрыть рабочую область"
              title="Закрыть"
              @click="closeWorkspace"
            >
              ×
            </button>
          </header>

          <div class="workspace-dialog__body">
            <section class="workspace-card">
              <div class="workspace-card__header">
                <span>Файл</span>
                <strong>{{ editor.isDirty ? "изменён" : "сохранён" }}</strong>
              </div>
              <p class="file-name">{{ editor.fileName }}</p>
              <p class="file-path">{{ editor.filePath ?? "Файл пока не сохранён" }}</p>
              <button class="button button--full" type="button" @click="editor.openFromDialog">
                Открыть файл
              </button>
            </section>

            <section class="workspace-card">
              <div class="workspace-card__header" :class="{ 'workspace-card__header--pulse': projectPulse }">
                <span>Проект</span>
                <strong>{{ projectStore.activeProject?.isDirty ? "изменён" : "чисто" }}</strong>
              </div>
              <template v-if="projectStore.activeProject">
                <p class="project-current__name">{{ projectStore.activeProject.name }}</p>
                <p class="project-current__meta">
                  {{ projectStore.activeProject.branch }} ·
                  {{ projectStore.activeProject.path }}
                </p>
              </template>
              <p v-else class="git-panel__empty">Проект не выбран.</p>
              <button
                v-if="settingsStore.settings.gitIntegrationEnabled"
                class="button button--full"
                type="button"
                @click="openProjects"
              >
                Показать проекты
              </button>
            </section>

            <section v-if="settingsStore.settings.gitIntegrationEnabled" class="workspace-card">
              <div class="workspace-card__header">
                <span>Git</span>
                <strong>{{ git.status?.statusLabel ?? "не проверен" }}</strong>
              </div>
              <p v-if="!editor.filePath" class="git-panel__empty">
                Сохраните файл, чтобы проверить Git.
              </p>
              <template v-else-if="git.status?.isRepository">
                <dl class="meta-list">
                  <div>
                    <dt>Ветка</dt>
                    <dd>{{ git.status.branch }}</dd>
                  </div>
                  <div>
                    <dt>Статус</dt>
                    <dd :class="{ 'git-panel__dirty': git.status.isDirty }">
                      {{ git.status.statusLabel }}
                    </dd>
                  </div>
                </dl>
                <p class="file-path" :title="git.status.repoRoot ?? ''">
                  {{ git.status.relativePath }}
                </p>
              </template>
              <p v-else class="git-panel__empty">
                {{ git.isLoading ? "Ищу репозиторий..." : git.status?.statusLabel ?? "Git-статус пока не проверен" }}
              </p>
              <div class="workspace-card__actions">
                <button
                  class="button button--small"
                  type="button"
                  :disabled="!editor.filePath || git.isLoading"
                  @click="refreshGit"
                >
                  Обновить
                </button>
                <button
                  class="button button--small"
                  type="button"
                  :disabled="!editor.filePath || git.isDiffLoading"
                  @click="openGitDiff"
                >
                  {{ git.isDiffLoading ? "Читаю" : "Правки" }}
                </button>
              </div>
              <p v-if="git.error" class="git-panel__error">{{ git.error }}</p>
            </section>

            <section class="workspace-card">
              <div class="workspace-card__header">
                <span>Сессия</span>
                <strong>{{ settingsStore.appVersion || "-" }}</strong>
              </div>
              <dl class="meta-list">
                <div>
                  <dt>Тема</dt>
                  <dd>{{ settingsStore.settings.theme }}</dd>
                </div>
                <div>
                  <dt>Автосохранение</dt>
                  <dd>{{ settingsStore.settings.autosave ? "Вкл" : "Выкл" }}</dd>
                </div>
              </dl>
            </section>
          </div>
        </section>
      </div>

      <div
        v-if="isProjectsOpen"
        class="projects-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="projects-title"
        @click.self="closeProjects"
      >
        <section class="projects-dialog">
          <header class="projects-dialog__header">
            <div>
              <h2 id="projects-title">Git-проекты</h2>
              <p>{{ projectStore.rootPath || "Documents/GitHub" }}</p>
            </div>
            <button
              class="markdown-help__close"
              type="button"
              aria-label="Закрыть проекты"
              title="Закрыть"
              @click="closeProjects"
            >
              ×
            </button>
          </header>

          <div class="projects-dialog__actions">
            <button
              class="button button--small"
              type="button"
              :disabled="projectStore.isLoadingProjects"
              @click="refreshProjects"
            >
              Обновить список
            </button>
            <button
              class="button button--small"
              type="button"
              :disabled="projectStore.isLoadingProjects"
              @click="pickProjectsRoot"
            >
              Выбрать папку
            </button>
          </div>

          <div class="projects-dialog__body">
            <section class="projects-list" aria-label="Список Git-проектов">
              <p v-if="projectStore.isLoadingProjects" class="projects-empty">Ищу Git-проекты...</p>
              <p v-else-if="!projectStore.rootExists" class="projects-empty">
                Папка GitHub не найдена. Выберите папку с проектами вручную.
              </p>
              <p v-else-if="!projectStore.hasProjects" class="projects-empty">
                В этой папке нет Git-проектов.
              </p>

              <button
                v-for="project in projectStore.projects"
                :key="project.path"
                class="project-item"
                :class="{
                  active: project.path === projectStore.selectedProject?.path,
                  'project-item--current': project.path === projectStore.activeProject?.path,
                }"
                type="button"
                @click="selectProject(project)"
              >
                <span class="project-item__name">{{ project.name }}</span>
                <span class="project-item__meta">
                  {{ project.branch }} · {{ project.isDirty ? "изменён" : "чисто" }}
                </span>
              </button>
            </section>

            <section class="project-files" aria-label="Файлы проекта">
              <div class="project-files__header">
                <strong>{{ projectStore.selectedProject?.name ?? "Проект не выбран" }}</strong>
                <span>{{ projectStore.files.length }} файлов</span>
              </div>

              <p v-if="projectStore.isLoadingFiles" class="projects-empty">Читаю Markdown-файлы...</p>
              <p v-else-if="projectStore.selectedProject && !projectStore.hasFiles" class="projects-empty">
                Markdown-файлы не найдены.
              </p>
              <p v-else-if="!projectStore.selectedProject" class="projects-empty">
                Выберите проект слева.
              </p>

              <button
                v-for="file in projectStore.files"
                :key="file.path"
                class="project-file-item"
                type="button"
                :title="file.path"
                @click="openProjectFile(file)"
              >
                <span>{{ file.name }}</span>
                <small>{{ file.relativePath }}</small>
              </button>
            </section>
          </div>

          <p v-if="projectStore.error" class="projects-error">{{ projectStore.error }}</p>
        </section>
      </div>

      <div
        v-if="isDiffOpen"
        class="git-diff-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="git-diff-title"
        @click.self="closeGitDiff"
      >
        <section class="git-diff-dialog">
          <header class="git-diff-dialog__header">
            <div>
              <h2 id="git-diff-title">Изменения Git</h2>
              <p>{{ git.status?.relativePath ?? editor.fileName }}</p>
            </div>
            <button
              class="markdown-help__close"
              type="button"
              aria-label="Закрыть diff"
              title="Закрыть"
              @click="closeGitDiff"
            >
              ×
            </button>
          </header>

          <div v-if="git.diff" class="git-diff-dialog__body" aria-label="Изменения файла">
            <code
              v-for="(line, index) in diffLines"
              :key="`${index}-${line}`"
              class="git-diff-line"
              :class="getDiffLineClass(line)"
            >
              <span class="git-diff-line__number">{{ index + 1 }}</span>
              <span class="git-diff-line__content">{{ line || " " }}</span>
            </code>
          </div>

          <div v-else class="git-diff-dialog__empty">
            Изменений в рабочей копии нет.
          </div>
        </section>
      </div>

      <div v-if="projectNotice" class="project-switch-toast" role="status">
        <span>Проект открыт</span>
        <strong>{{ projectNotice }}</strong>
      </div>
    </Teleport>

  </aside>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { RouterLink } from "vue-router";

import { useEditorStore } from "../stores/editorStore";
import { useGitStore } from "../stores/gitStore";
import { useProjectStore } from "../stores/projectStore";
import { useSettingsStore } from "../stores/settingsStore";

const editor = useEditorStore();
const git = useGitStore();
const projectStore = useProjectStore();
const settingsStore = useSettingsStore();
const isDiffOpen = ref(false);
const isProjectsOpen = ref(false);
const isWorkspaceOpen = ref(false);
const projectPulse = ref(false);
const projectNotice = ref("");
let projectPulseTimer: number | null = null;
let projectNoticeTimer: number | null = null;
const diffLines = computed(() => git.diff.split("\n"));

function refreshGit(): void {
  isDiffOpen.value = false;
  git.diff = "";
  void git.refresh(editor.filePath);
}

function openWorkspace(): void {
  isWorkspaceOpen.value = true;
}

function closeWorkspace(): void {
  isWorkspaceOpen.value = false;
}

function openProjects(): void {
  isProjectsOpen.value = true;

  if (!projectStore.rootPath && !projectStore.isLoadingProjects) {
    void projectStore.loadProjects();
  }
}

function closeProjects(): void {
  isProjectsOpen.value = false;
}

function refreshProjects(): void {
  void projectStore.loadProjects(projectStore.rootPath || null);
}

function pickProjectsRoot(): void {
  void projectStore.pickRoot();
}

function selectProject(project: GitProject): void {
  void projectStore.selectProject(project);
}

async function openProjectFile(file: ProjectFile): Promise<void> {
  const openedProject = projectStore.selectedProject;
  await editor.openFromPath(file.path);

  if (editor.filePath === file.path) {
    projectStore.setActiveProject(openedProject);
    pulseProjectIndicator(openedProject?.name ?? file.name);
    closeProjects();
  }
}

function pulseProjectIndicator(projectName?: string): void {
  projectPulse.value = false;
  projectNotice.value = projectName ?? "";

  if (projectPulseTimer !== null) {
    window.clearTimeout(projectPulseTimer);
  }

  if (projectNoticeTimer !== null) {
    window.clearTimeout(projectNoticeTimer);
  }

  window.requestAnimationFrame(() => {
    projectPulse.value = true;
    projectPulseTimer = window.setTimeout(() => {
      projectPulse.value = false;
      projectPulseTimer = null;
    }, 900);
  });

  if (projectName) {
    projectNoticeTimer = window.setTimeout(() => {
      projectNotice.value = "";
      projectNoticeTimer = null;
    }, 1800);
  }
}

async function openGitDiff(): Promise<void> {
  await git.loadDiff(editor.filePath);
  isDiffOpen.value = true;
}

function closeGitDiff(): void {
  isDiffOpen.value = false;
}

function getDiffLineClass(line: string): Record<string, boolean> {
  return {
    "git-diff-line--addition": line.startsWith("+") && !line.startsWith("+++"),
    "git-diff-line--deletion": line.startsWith("-") && !line.startsWith("---"),
    "git-diff-line--meta": line.startsWith("diff ") || line.startsWith("index "),
    "git-diff-line--file": line.startsWith("---") || line.startsWith("+++"),
    "git-diff-line--hunk": line.startsWith("@@"),
  };
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === "Escape") {
    closeGitDiff();
    closeProjects();
    closeWorkspace();
  }
}

watch(
  () => [editor.filePath, editor.lastSavedAt, settingsStore.settings.gitIntegrationEnabled] as const,
  ([filePath, _lastSavedAt, gitIntegrationEnabled]) => {
    isDiffOpen.value = false;

    if (!gitIntegrationEnabled) {
      git.clear();
      return;
    }

    void git.refresh(filePath);
  },
  { immediate: true },
);

watch(
  () => git.status?.repoRoot,
  (repoRoot) => {
    if (!repoRoot || projectStore.activeProject?.path === repoRoot) {
      return;
    }

    const matchingProject = projectStore.projects.find((project) => project.path === repoRoot);

    if (matchingProject) {
      projectStore.setActiveProject(matchingProject);
      projectStore.selectedProject = matchingProject;
      pulseProjectIndicator(matchingProject.name);
    }
  },
);

window.addEventListener("keydown", handleKeydown);

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleKeydown);

  if (projectPulseTimer !== null) {
    window.clearTimeout(projectPulseTimer);
  }

  if (projectNoticeTimer !== null) {
    window.clearTimeout(projectNoticeTimer);
  }
});
</script>
