<template>
  <section class="settings-view">
    <div class="window-titlebar" aria-label="Панель окна">
      <img class="window-titlebar__icon" :src="appIcon" alt="" aria-hidden="true" />
      <strong class="window-titlebar__title">Настройки</strong>
    </div>

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

        <label class="field field--inline">
          <input v-model="draft.autosave" type="checkbox" />
          <span>Автосохранение текущего файла</span>
        </label>

        <label class="field field--inline">
          <input v-model="draft.openLastFileOnStart" type="checkbox" />
          <span>Открывать последний файл при запуске</span>
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
          <span>Стартовая ширина окна</span>

          <input
            v-model.number="draft.defaultWindowBounds.width"
            min="1000"
            max="2400"
            type="number"
          />
        </label>

        <label class="field">
          <span>Стартовая высота окна</span>

          <input
            v-model.number="draft.defaultWindowBounds.height"
            min="700"
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

import appIcon from "../../../assets/icon.png";
import { useSettingsStore } from "../stores/settingsStore";

const settingsStore = useSettingsStore();
const draft = reactive<AppSettings>({
  theme: "system",
  fontSize: 16,
  editorFontFamily: "mono",
  editorLineHeight: 1.7,
  editorWordWrap: false,
  previewFontSize: 16,
  previewLineHeight: 1.72,
  windowBounds: {
    width: 1280,
    height: 820,
  },
  defaultWindowBounds: {
    width: 1280,
    height: 820,
  },
  lastFilePath: null,
  autosave: false,
  openLastFileOnStart: true,
  pomodoroMinutes: 25,
});

function assignDraft(settings: AppSettings): void {
  draft.theme = settings.theme;
  draft.fontSize = settings.fontSize;
  draft.editorFontFamily = settings.editorFontFamily;
  draft.editorLineHeight = settings.editorLineHeight;
  draft.editorWordWrap = settings.editorWordWrap;
  draft.previewFontSize = settings.previewFontSize;
  draft.previewLineHeight = settings.previewLineHeight;
  draft.windowBounds = { ...settings.windowBounds };
  draft.defaultWindowBounds = { ...settings.defaultWindowBounds };
  draft.lastFilePath = settings.lastFilePath;
  draft.autosave = settings.autosave;
  draft.openLastFileOnStart = settings.openLastFileOnStart;
  draft.pomodoroMinutes = settings.pomodoroMinutes;
}

async function saveSettings(): Promise<void> {
  const settings = await settingsStore.update({
    theme: draft.theme,
    defaultWindowBounds: { ...draft.defaultWindowBounds },
    autosave: draft.autosave,
    openLastFileOnStart: draft.openLastFileOnStart,
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
