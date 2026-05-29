<template>
  <section class="editor-view" :class="`editor-view--${editor.viewMode}`">
    <Editor v-if="editor.viewMode !== 'preview'" />
    <Preview v-if="editor.viewMode !== 'edit'" />
  </section>
</template>

<script setup lang="ts">
import Editor from '../components/Editor.vue';
import Preview from '../components/Preview.vue';
import { useEditorStore } from '../stores/editorStore';

const editor = useEditorStore();
</script>
