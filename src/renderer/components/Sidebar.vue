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
        data-short="Г"
        title="График"
      >
        <span>График</span>
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
import { RouterLink } from "vue-router";

import { useEditorStore } from "../stores/editorStore";
import { useSettingsStore } from "../stores/settingsStore";

const editor = useEditorStore();
const settingsStore = useSettingsStore();

function openSettings(): void {
  void window.electronAPI.openSettingsWindow();
}
</script>
