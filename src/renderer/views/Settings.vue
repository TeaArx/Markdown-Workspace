<template>
  <section class="settings-view">
    <header class="settings-header">
      <div>
        <h1>Настройки</h1>
        <p>Рабочее пространство Markdown {{ settingsStore.appVersion }}</p>
      </div>
      <button class="button" type="button" @click="closeWindow">Закрыть</button>
    </header>
    <div class="settings-scroll">
      <div class="settings-grid">
        <label class="field">
          <span>Тема</span>
          <select v-model="draft.theme">
            <option value="system">Системная</option>
            <option value="light">Светлая</option>
            <option value="dark">Тёмная</option>
          </select>
        </label>

        <label class="field">
          <span>Размер шрифта редактора</span>

          <input
            v-model.number="draft.fontSize"
            min="12"
            max="24"
            type="range"
          />
          <strong>{{ draft.fontSize }}px</strong>
        </label>

        <label class="field field--inline">
          <input v-model="draft.autosave" type="checkbox" />
          <span>Автосохранение текущего файла</span>
        </label>

        <label class="field">
          <span>Длительность фокус-сессии (мин.)</span>

          <input
            v-model.number="draft.pomodoroMinutes"
            min="5"
            max="90"
            type="number"
          />
        </label>

        <label class="field">
          <span>Ширина окна по умолчанию</span>

          <input
            v-model.number="draft.windowBounds.width"
            min="900"
            max="2400"
            type="number"
          />
        </label>

        <label class="field">
          <span>Высота окна по умолчанию</span>

          <input
            v-model.number="draft.windowBounds.height"
            min="600"
            max="1600"
            type="number"
          />
        </label>
      </div>

      <section class="settings-summary">
        <h2>Последний файл</h2>
        <p>
          {{ settingsStore.settings.lastFilePath ?? "Файл пока не открыт" }}
        </p>
      </section>
    </div>

    <footer class="settings-actions">
      <button
        class="button button--primary"
        type="button"
        @click="saveSettings"
      >
        Сохранить настройки
      </button>
      <button class="button" type="button" @click="resetSettings">
        Сбросить
      </button>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive } from "vue";

import { useSettingsStore } from "../stores/settingsStore";

const settingsStore = useSettingsStore();
const draft = reactive<AppSettings>({
  theme: "system",
  fontSize: 16,
  windowBounds: {
    width: 1280,
    height: 820,
  },
  lastFilePath: null,
  autosave: false,
  pomodoroMinutes: 25,
});

function assignDraft(settings: AppSettings): void {
  draft.theme = settings.theme;
  draft.fontSize = settings.fontSize;
  draft.windowBounds = { ...settings.windowBounds };
  draft.lastFilePath = settings.lastFilePath;
  draft.autosave = settings.autosave;
  draft.pomodoroMinutes = settings.pomodoroMinutes;
}

async function saveSettings(): Promise<void> {
  const settings = await settingsStore.update({
    theme: draft.theme,
    fontSize: draft.fontSize,
    windowBounds: { ...draft.windowBounds },
    autosave: draft.autosave,
    pomodoroMinutes: draft.pomodoroMinutes,
  });
  assignDraft(settings);
}

async function resetSettings(): Promise<void> {
  const settings = await settingsStore.reset();
  assignDraft(settings);
}

async function closeWindow(): Promise<void> {
  await window.electronAPI.closeCurrentWindow();
}

onMounted(async () => {
  if (!settingsStore.appVersion) {
    await settingsStore.load();
  }

  assignDraft(settingsStore.settings);
});
</script>
