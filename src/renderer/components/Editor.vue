<template>
  <section
    class="editor-pane"
    :class="{
      'editor-pane--controls-open': isTextSettingsOpen,
      'editor-pane--dragging': isDragging,
    }"
    @dragenter.prevent="isDragging = true"
    @dragover.prevent
    @dragleave.prevent="isDragging = false"
    @drop.prevent="handleDrop"
  >
    <div class="pane-header">
      <button
        class="pane-title-button"
        type="button"
        :aria-expanded="isTextSettingsOpen"
        title="Настройки редактора"
        @click="isTextSettingsOpen = !isTextSettingsOpen"
      >
        Редактор
      </button>
      <div class="pane-header__actions">
        <button
          class="pane-icon-button"
          type="button"
          :disabled="!editor.canUndo"
          aria-label="Отменить"
          title="Отменить"
          @click="undo"
        >
          ↶
        </button>
        <button
          class="pane-icon-button"
          type="button"
          :disabled="!editor.canRedo"
          aria-label="Вернуть"
          title="Вернуть"
          @click="redo"
        >
          ↷
        </button>
        <button
          class="markdown-help-toggle"
          type="button"
          :aria-expanded="isMarkdownHelpOpen"
          aria-controls="markdown-help"
          title="Подсказка по Markdown"
          @click="isMarkdownHelpOpen = !isMarkdownHelpOpen"
        >
          MD
        </button>
        <span>{{ editor.fileName }}</span>
      </div>
    </div>

    <div v-if="isTextSettingsOpen" class="pane-controls" aria-label="Настройки редактора">
      <label>
        <span>Размер</span>
        <input
          :value="settingsStore.settings.fontSize"
          min="12"
          max="24"
          type="range"
          @input="updateTextSetting('fontSize', Number(($event.target as HTMLInputElement).value))"
        />
        <strong>{{ settingsStore.settings.fontSize }}px</strong>
      </label>

      <label>
        <span>Шрифт</span>
        <select
          :value="settingsStore.settings.editorFontFamily"
          @change="updateTextSetting('editorFontFamily', ($event.target as HTMLSelectElement).value)"
        >
          <option value="sans">Segoe UI</option>
          <option value="mono">Моно</option>
          <option value="serif">С засечками</option>
        </select>
      </label>

      <label>
        <span>Интервал</span>
        <input
          :value="settingsStore.settings.editorLineHeight"
          min="1.2"
          max="2.4"
          step="0.1"
          type="range"
          @input="updateTextSetting('editorLineHeight', Number(($event.target as HTMLInputElement).value))"
        />
        <strong>{{ settingsStore.settings.editorLineHeight.toFixed(1) }}</strong>
      </label>

      <label class="pane-control-toggle">
        <input
          :checked="settingsStore.settings.editorWordWrap"
          type="checkbox"
          @change="updateTextSetting('editorWordWrap', ($event.target as HTMLInputElement).checked)"
        />
        <span>Перенос</span>
      </label>
    </div>

    <aside
      v-if="isMarkdownHelpOpen"
      id="markdown-help"
      class="markdown-help"
      aria-label="Подсказка по Markdown"
    >
      <div class="markdown-help__header">
        <strong>Markdown</strong>
        <button
          class="markdown-help__close"
          type="button"
          aria-label="Закрыть подсказку"
          title="Закрыть"
          @click="isMarkdownHelpOpen = false"
        >
          ×
        </button>
      </div>

      <div class="markdown-help__grid">
        <button
          v-for="snippet in markdownSnippets"
          :key="snippet.label"
          type="button"
          @mousedown.prevent
          @click="insertMarkdown(snippet)"
        >
          <code>{{ snippet.syntax }}</code>
          <span>{{ snippet.label }}</span>
        </button>
      </div>
    </aside>

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
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";

import { useEditorStore } from "../stores/editorStore";
import { useSettingsStore } from "../stores/settingsStore";

const editor = useEditorStore();
const settingsStore = useSettingsStore();
const isDragging = ref(false);
const isMarkdownHelpOpen = ref(false);
const isTextSettingsOpen = ref(false);
const textArea = ref<HTMLTextAreaElement | null>(null);
let autosaveTimer: ReturnType<typeof setTimeout> | null = null;

type MarkdownSnippet = {
  label: string;
  syntax: string;
  before: string;
  after?: string;
  placeholder?: string;
};

const markdownSnippets: MarkdownSnippet[] = [
  { label: "Заголовок", syntax: "###", before: "### ", placeholder: "Заголовок" },
  { label: "Жирный", syntax: "** **", before: "**", after: "**", placeholder: "текст" },
  { label: "Курсив", syntax: "* *", before: "*", after: "*", placeholder: "текст" },
  { label: "Список", syntax: "- item", before: "- ", placeholder: "пункт списка" },
  { label: "Цитата", syntax: ">", before: "> ", placeholder: "цитата" },
  { label: "Ссылка", syntax: "[]()", before: "[", after: "](https://)", placeholder: "текст" },
  { label: "Код", syntax: "```", before: "```\n", after: "\n```", placeholder: "код" },
  {
    label: "Таблица",
    syntax: "| |",
    before: "| Колонка | Значение |\n| --- | --- |\n| ",
    after: " |  |\n",
    placeholder: "текст",
  },
  { label: "Линия", syntax: "---", before: "\n---\n", placeholder: "" },
];

const content = computed({
  get: () => editor.content,
  set: (value: string) => editor.setContent(value),
});

function clearAutosaveTimer(): void {
  if (!autosaveTimer) {
    return;
  }

  clearTimeout(autosaveTimer);
  autosaveTimer = null;
}

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

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z" && !event.shiftKey) {
    event.preventDefault();
    undo();
    return;
  }

  if (
    (event.ctrlKey || event.metaKey) &&
    (event.key.toLowerCase() === "y" || (event.key.toLowerCase() === "z" && event.shiftKey))
  ) {
    event.preventDefault();
    redo();
    return;
  }

  if (event.key !== "Tab") {
    return;
  }

  event.preventDefault();

  const target = event.currentTarget as HTMLTextAreaElement;
  updateTabIndent(target, event.shiftKey);
}

function updateTabIndent(target: HTMLTextAreaElement, isOutdent: boolean): void {
  const start = target.selectionStart;
  const end = target.selectionEnd;
  const selectedText = editor.content.slice(start, end);

  if (selectedText.includes("\n")) {
    const lineStart = editor.content.lastIndexOf("\n", start - 1) + 1;
    const selectedBlock = editor.content.slice(lineStart, end);
    const lines = selectedBlock.split("\n");
    const nextBlock = lines
      .map((line) => (isOutdent ? line.replace(/^( {1,2}|\t)/, "") : `  ${line}`))
      .join("\n");
    const nextContent = `${editor.content.slice(0, lineStart)}${nextBlock}${editor.content.slice(end)}`;

    editor.setContent(nextContent);

    requestAnimationFrame(() => {
      target.selectionStart = lineStart;
      target.selectionEnd = lineStart + nextBlock.length;
    });

    return;
  }

  if (isOutdent) {
    const lineStart = editor.content.lastIndexOf("\n", start - 1) + 1;
    const prefix = editor.content.slice(lineStart, start);
    const removableIndent = prefix.match(/( {1,2}|\t)$/)?.[0] ?? "";

    if (!removableIndent) {
      return;
    }

    const nextContent = `${editor.content.slice(0, start - removableIndent.length)}${editor.content.slice(end)}`;

    editor.setContent(nextContent);

    requestAnimationFrame(() => {
      target.selectionStart = start - removableIndent.length;
      target.selectionEnd = start - removableIndent.length;
    });

    return;
  }

  const insert = "  ";
  const nextContent = `${editor.content.slice(0, start)}${insert}${editor.content.slice(end)}`;

  editor.setContent(nextContent);

  requestAnimationFrame(() => {
    target.selectionStart = start + insert.length;
    target.selectionEnd = start + insert.length;
  });
}

async function updateTextSetting<K extends keyof AppSettings>(
  key: K,
  value: AppSettings[K],
): Promise<void> {
  await settingsStore.update({ [key]: value } as Partial<AppSettings>);
}

async function focusTextAreaAtEnd(): Promise<void> {
  await nextTick();

  if (!textArea.value) {
    return;
  }

  textArea.value.focus();
  textArea.value.selectionStart = editor.content.length;
  textArea.value.selectionEnd = editor.content.length;
}

function undo(): void {
  editor.undo();
  void focusTextAreaAtEnd();
}

function redo(): void {
  editor.redo();
  void focusTextAreaAtEnd();
}

async function insertMarkdown(snippet: MarkdownSnippet): Promise<void> {
  const target = textArea.value;

  if (!target) {
    return;
  }

  const start = target.selectionStart;
  const end = target.selectionEnd;
  const selectedText = editor.content.slice(start, end);
  const insertText = selectedText || snippet.placeholder || "";
  const after = snippet.after ?? "";
  const nextContent = `${editor.content.slice(0, start)}${snippet.before}${insertText}${after}${editor.content.slice(end)}`;
  const selectionStart = start + snippet.before.length;
  const selectionEnd = selectionStart + insertText.length;

  editor.setContent(nextContent);
  await nextTick();

  target.focus();
  target.selectionStart = selectionStart;
  target.selectionEnd = selectionEnd;
}

watch(
  () => [
    editor.content,
    editor.filePath,
    editor.isDirty,
    settingsStore.settings.autosave,
  ],
  () => {
    clearAutosaveTimer();

    if (
      !settingsStore.settings.autosave ||
      !editor.filePath ||
      !editor.isDirty
    ) {
      return;
    }

    autosaveTimer = setTimeout(() => {
      void editor.save();
    }, 1200);
  },
);

onBeforeUnmount(clearAutosaveTimer);
</script>
