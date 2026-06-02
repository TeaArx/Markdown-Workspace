<template>
  <header class="toolbar">
    <div class="toolbar__group">
      <button
        class="button button--primary"
        type="button"
        @click="editor.newFile"
      >
        Новый
      </button>
      <button class="button" type="button" @click="editor.openFromDialog">
        Открыть
      </button>
      <button
        class="button"
        type="button"
        :disabled="editor.isLoading"
        @click="editor.save"
      >
        Сохранить
      </button>
      <button
        class="button"
        type="button"
        :disabled="editor.isLoading"
        @click="editor.saveAs"
      >
        Сохранить как
      </button>
    </div>

    <div v-if="isEditorRoute" class="segmented" aria-label="Режим просмотра редактора">
      <button
        v-for="mode in modes"
        :key="mode.value"
        type="button"
        :class="{ active: editor.viewMode === mode.value }"
        @click="editor.setViewMode(mode.value)"
      >
        {{ mode.label }}
      </button>
    </div>

    <div class="toolbar__spacer" />

    <div class="toolbar__group toolbar__group--compact">
      <button class="button" type="button" @click="notifications.toggle">
        {{ notifications.isRunning.value ? "Пауза" : notifications.label.value }}
      </button>
      <button
        class="button button--icon"
        type="button"
        title="Сброс таймера"
        @click="notifications.reset"
      >
        Сброс
      </button>
      <button
        class="button"
        type="button"
        @click="windowApi.openSettingsWindow"
      >
        Настройки
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";

import { useNotifications } from "../composables/useNotifications";
import { useEditorStore } from "../stores/editorStore";

const editor = useEditorStore();
const notifications = useNotifications();
const windowApi = window.electronAPI;
const route = useRoute();
const isEditorRoute = computed(() => route.name === "editor");

const modes: Array<{ label: string; value: ViewMode }> = [
  { label: "Редактирование", value: "edit" },
  { label: "Разделить", value: "split" },
  { label: "Предпросмотр", value: "preview" },
];
</script>
