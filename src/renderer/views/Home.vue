<template>
  <section
    ref="editorView"
    class="editor-view"
    :class="[
      `editor-view--${editor.viewMode}`,
      { 'editor-view--resizing': isResizing },
    ]"
    :style="splitStyle"
    @pointermove="handlePointerMove"
    @pointerup="stopResize"
    @pointercancel="stopResize"
  >
    <Editor v-if="editor.viewMode !== 'preview'" />
    <button
      v-if="editor.viewMode === 'split'"
      class="editor-resizer"
      type="button"
      aria-label="Изменить ширину редактора и предпросмотра"
      @pointerdown="startResize"
      @dblclick="resetSplit"
    />
    <Preview v-if="editor.viewMode !== 'edit'" />
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";

import Editor from "../components/Editor.vue";
import Preview from "../components/Preview.vue";
import { useEditorStore } from "../stores/editorStore";

const editor = useEditorStore();
const editorView = ref<HTMLElement | null>(null);
const splitPercent = ref(50);
const isResizing = ref(false);

const splitStyle = computed(() => ({
  "--editor-split": `${splitPercent.value}%`,
}));

function updateSplit(clientX: number, clientY: number): void {
  if (!editorView.value) {
    return;
  }

  const bounds = editorView.value.getBoundingClientRect();
  const isStacked = window.matchMedia("(max-width: 900px)").matches;
  const pointerPosition = isStacked ? clientY - bounds.top : clientX - bounds.left;
  const size = isStacked ? bounds.height : bounds.width;
  const percent = (pointerPosition / size) * 100;
  splitPercent.value = Math.min(75, Math.max(25, percent));
}

function startResize(event: PointerEvent): void {
  isResizing.value = true;
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  updateSplit(event.clientX, event.clientY);
}

function handlePointerMove(event: PointerEvent): void {
  if (!isResizing.value) {
    return;
  }

  updateSplit(event.clientX, event.clientY);
}

function stopResize(event: PointerEvent): void {
  if (!isResizing.value) {
    return;
  }

  isResizing.value = false;
  const target = event.target as HTMLElement;

  if (target.hasPointerCapture?.(event.pointerId)) {
    target.releasePointerCapture(event.pointerId);
  }
}

function resetSplit(): void {
  splitPercent.value = 50;
}
</script>
