<template>
  <aside class="sidebar">
    <div class="brand">
      <div class="brand__mark">M</div>
      <div>
        <strong>Markdown Workspace</strong>
        <span>Настольный редактор</span>
      </div>
    </div>

    <nav class="nav-list">
      <RouterLink
        to="/"
        class="nav-item"
        data-short="Р"
        title="Редактор"
      >
        <span>Редактор</span>
      </RouterLink>
      <RouterLink
        to="/notes"
        class="nav-item"
        data-short="З"
        title="Заметки"
      >
        <span>Заметки</span>
      </RouterLink>
      <RouterLink
        to="/chart"
        class="nav-item"
        data-short="M"
        title="Mermaid"
      >
        <span>Mermaid</span>
      </RouterLink>
    </nav>

    <section class="sidebar-section">
      <h2>Текущий файл</h2>
      <p class="file-name">{{ editor.fileName }}</p>
      <p class="file-path">{{ editor.filePath ?? "Файл пока не сохранён" }}</p>

      <button
        class="button button--full"
        type="button"
        @click="editor.openFromDialog"
      >
        Открыть файл
      </button>
    </section>

    <section v-if="settingsStore.settings.gitIntegrationEnabled" class="sidebar-section git-panel">
      <div class="sidebar-section__header">
        <h2>Git</h2>
        <button
          class="button button--small"
          type="button"
          :disabled="!editor.filePath || git.isLoading"
          @click="refreshGit"
        >
          Обновить
        </button>
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

        <button
          class="button button--full"
          type="button"
          :disabled="git.isDiffLoading"
          @click="openGitDiff"
        >
          {{ git.isDiffLoading ? "Читаю diff" : "Открыть diff" }}
        </button>
      </template>

      <p v-else class="git-panel__empty">
        {{ git.isLoading ? "Ищу репозиторий..." : git.status?.statusLabel ?? "Git-статус пока не проверен" }}
      </p>

      <p v-if="git.error" class="git-panel__error">{{ git.error }}</p>
    </section>

    <Teleport to="body">
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
              <h2 id="git-diff-title">Git diff</h2>
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
    </Teleport>

    <section class="sidebar-section">
      <h2>Сессия</h2>
      <dl class="meta-list">
        <div>
          <dt>Тема</dt>
          <dd>{{ settingsStore.settings.theme }}</dd>
        </div>
        <div>
          <dt>Автосохранение</dt>
          <dd>{{ settingsStore.settings.autosave ? "Вкл" : "Выкл" }}</dd>
        </div>
        <div>
          <dt>Версия</dt>
          <dd>{{ settingsStore.appVersion || "-" }}</dd>
        </div>
      </dl>
    </section>

    <button
      class="button button--full sidebar__settings"
      type="button"
      aria-label="Окно настроек"
      title="Окно настроек"
      @click="openSettings"
    >
      Окно настроек
    </button>
  </aside>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { RouterLink } from "vue-router";

import { useEditorStore } from "../stores/editorStore";
import { useGitStore } from "../stores/gitStore";
import { useSettingsStore } from "../stores/settingsStore";

const editor = useEditorStore();
const git = useGitStore();
const settingsStore = useSettingsStore();
const isDiffOpen = ref(false);
const diffLines = computed(() => git.diff.split("\n"));

function openSettings(): void {
  void window.electronAPI.openSettingsWindow();
}

function refreshGit(): void {
  isDiffOpen.value = false;
  git.diff = "";
  void git.refresh(editor.filePath);
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

window.addEventListener("keydown", handleKeydown);

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleKeydown);
});
</script>
