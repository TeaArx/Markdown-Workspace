<template>
  <footer class="status-bar">
    <span :class="{ 'status-bar__dirty': editor.isDirty }">
      {{ editor.isDirty ? "Изменения не сохранены" : "Сохранено" }}
    </span>

    <span>{{ editor.lineCount }} строк</span>
    <span>{{ editor.wordCount }} слов</span>
    <span>{{ editor.charCount }} символов</span>

    <span class="status-bar__message">{{ editor.statusMessage }}</span>
    <span class="status-bar__timer"
      >{{ notifications.label.value }}
      {{ notifications.formattedTime.value }}</span
    >
  </footer>
</template>

<script setup lang="ts">
import { useNotifications } from "../composables/useNotifications";
import { useEditorStore } from "../stores/editorStore";

const editor = useEditorStore();
const notifications = useNotifications();
</script>
