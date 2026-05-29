<template>
  <section
    class="editor-pane"
    :class="{ 'editor-pane--dragging': isDragging }"
    @dragenter.prevent="isDragging = true"
    @dragover.prevent
    @dragleave.prevent="isDragging = false"
    @drop.prevent="handleDrop"
  >
    <div class="pane-header">
      <span>Редактор</span>
      <span>{{ editor.fileName }}</span>
    </div>

    <textarea
      ref="textArea"
      v-model="content"
      class="markdown-input"
      data-editor-input
      spellcheck="true"
      @keydown="handleKeydown"
    />

    <div v-if="isDragging" class="drop-hint">
      Перетащите файл .md или .txt, чтобы открыть
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";

import { useEditorStore } from "../stores/editorStore";
import { useSettingsStore } from "../stores/settingsStore";

const editor = useEditorStore();
const settingsStore = useSettingsStore();
const isDragging = ref(false);
const textArea = ref<HTMLTextAreaElement | null>(null);
let autosaveTimer: ReturnType<typeof setTimeout> | null = null;

const content = computed({
  get: () => editor.content,
  set: (value: string) => editor.setContent(value),
});

function handleDrop(event: DragEvent): void {
  isDragging.value = false;
  const file = event.dataTransfer?.files[0] as
    | (File & { path?: string })
    | undefined;

  if (!file?.path) {
    editor.statusMessage =
      "Эта платформа не предоставляет путь к файлу для перетаскиваемого файла";

    return;
  }

  void editor.openFromPath(file.path);
}

function handleKeydown(event: KeyboardEvent): void {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
    event.preventDefault();
    void editor.save();
    return;
  }

  if (event.key !== "Tab") {
    return;
  }

  event.preventDefault();

  const target = event.currentTarget as HTMLTextAreaElement;
  const start = target.selectionStart;
  const end = target.selectionEnd;
  const insert = "  ";
  const nextContent = `${editor.content.slice(0, start)}${insert}${editor.content.slice(end)}`;

  editor.setContent(nextContent);

  requestAnimationFrame(() => {
    target.selectionStart = start + insert.length;
    target.selectionEnd = start + insert.length;
  });
}

watch(
  () => editor.content,
  () => {
    if (
      !settingsStore.settings.autosave ||
      !editor.filePath ||
      !editor.isDirty
    ) {
      return;
    }

    if (autosaveTimer) {
      clearTimeout(autosaveTimer);
    }

    autosaveTimer = setTimeout(() => {
      void editor.save();
    }, 1200);
  },
);
</script>
