<template>
  <section class="notes-view">
    <div class="notes-list">
      <div class="pane-header">
        <span>Заметки</span>
        <div class="notes-list__actions">
          <button
            class="button button--small"
            type="button"
            :disabled="notes.length === 0"
            @click="toggleSelectionMode"
          >
            {{ isSelecting ? "Отмена" : "Выбрать" }}
          </button>
          <button class="button button--small" type="button" @click="createNote">
            Добавить
          </button>
        </div>
      </div>

      <div v-if="isSelecting" class="notes-selection-bar">
        <span>{{ selectedNoteIds.size }} выбрано</span>
        <button
          class="button button--small button--danger"
          type="button"
          :disabled="selectedNoteIds.size === 0"
          @click="removeSelectedNotes"
        >
          Удалить
        </button>
      </div>

      <div class="notes-items">
        <button
          v-for="note in notes"
          :key="note.id"
          class="note-item"
          :class="{
            active: selectedNote?.id === note.id,
            done: Boolean(note.done),
            pinned: Boolean(note.pinned),
            selected: selectedNoteIds.has(note.id),
          }"
          type="button"
          @click="handleNoteClick(note)"
        >
          <span v-if="isSelecting" class="note-item__check" aria-hidden="true">
            {{ selectedNoteIds.has(note.id) ? "✓" : "" }}
          </span>
          <span class="note-item__content">
            <span class="note-item__top">
              <strong>{{ note.title }}</strong>
              <span class="note-item__badges" aria-label="Статусы заметки">
                <span v-if="note.pinned" class="note-badge note-badge--pinned" title="Закреплено">
                  <span aria-hidden="true">★</span>
                  Закреплено
                </span>
                <span v-if="note.done" class="note-badge note-badge--done" title="Выполнено">
                  <span aria-hidden="true">✓</span>
                  Готово
                </span>
              </span>
            </span>
            <span>{{ previewLine(note.content) }}</span>
          </span>
        </button>
      </div>

      <p v-if="notes.length === 0" class="empty-state">
        Пока нет заметок. Создайте одну для задачи, идеи или короткого
        фрагмента.
      </p>
    </div>

    <div class="note-editor">
      <template v-if="selectedNote">
        <div class="pane-header">
          <span>Редактировать заметку</span>

          <div class="note-actions">
            <label class="inline-toggle" :class="{ active: draftDone }">
              <input v-model="draftDone" type="checkbox" />
              <span aria-hidden="true">✓</span>
              Выполнено
            </label>
            <label class="inline-toggle" :class="{ active: draftPinned }">
              <input v-model="draftPinned" type="checkbox" />
              <span aria-hidden="true">★</span>
              Закреплено
            </label>
          </div>
        </div>

        <input
          v-model="draftTitle"
          class="note-title-input"
          type="text"
          placeholder="Заголовок"
        />
        <textarea
          v-model="draftContent"
          class="note-content-input"
          placeholder="Напишите локальную заметку..."
        />

        <div class="note-footer">
          <button
            class="button button--primary"
            type="button"
            @click="saveNote"
          >
            Сохранить
          </button>
          <button class="button" type="button" @click="sendToEditor">
            Отправить в редактор
          </button>
          <button
            class="button button--danger"
            type="button"
            @click="removeNote"
          >
            Удалить
          </button>
        </div>
      </template>

      <div v-else class="empty-state empty-state--center">
        Выберите заметку или создайте новую.
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

import { useEditorStore } from "../stores/editorStore";

const editor = useEditorStore();
const notes = ref<NoteRecord[]>([]);
const selectedId = ref<number | null>(null);
const draftTitle = ref("");
const draftContent = ref("");
const draftDone = ref(false);
const draftPinned = ref(false);
const isSelecting = ref(false);
const selectedNoteIds = ref<Set<number>>(new Set());

const selectedNote = computed(
  () => notes.value.find((note) => note.id === selectedId.value) ?? null,
);

function previewLine(content: string): string {
  const line = content.replace(/\s+/g, " ").trim();
  return line.length > 70
    ? `${line.slice(0, 70)}...`
    : line || "Пустая заметка";
}

function fillDraft(note: NoteRecord): void {
  selectedId.value = note.id;
  draftTitle.value = note.title;
  draftContent.value = note.content;
  draftDone.value = Boolean(note.done);
  draftPinned.value = Boolean(note.pinned);
}

async function loadNotes(): Promise<void> {
  notes.value = await window.electronAPI.notes.list();

  if (notes.value.length && !selectedNote.value) {
    fillDraft(notes.value[0]);
  }
}

function selectNote(note: NoteRecord): void {
  fillDraft(note);
}

function handleNoteClick(note: NoteRecord): void {
  if (!isSelecting.value) {
    selectNote(note);
    return;
  }

  const nextSelection = new Set(selectedNoteIds.value);

  if (nextSelection.has(note.id)) {
    nextSelection.delete(note.id);
  } else {
    nextSelection.add(note.id);
  }

  selectedNoteIds.value = nextSelection;
}

function toggleSelectionMode(): void {
  isSelecting.value = !isSelecting.value;
  selectedNoteIds.value = new Set();
}

async function createNote(): Promise<void> {
  const note = await window.electronAPI.notes.create(
    "Новая заметка",
    "- Задача\n- Детали",
  );
  notes.value = [note, ...notes.value];
  fillDraft(note);
}

async function saveNote(): Promise<void> {
  if (!selectedNote.value) {
    return;
  }

  const note = await window.electronAPI.notes.update(selectedNote.value.id, {
    title: draftTitle.value,
    content: draftContent.value,
    done: Number(draftDone.value),
    pinned: Number(draftPinned.value),
  });

  notes.value = notes.value.map((item) => (item.id === note.id ? note : item));
  notes.value.sort(
    (left, right) =>
      Number(right.pinned) - Number(left.pinned) ||
      right.updatedAt.localeCompare(left.updatedAt),
  );
  fillDraft(note);
}

async function removeNote(): Promise<void> {
  if (!selectedNote.value) {
    return;
  }

  const shouldDelete = window.confirm(`Удалить заметку "${selectedNote.value.title}"?`);

  if (!shouldDelete) {
    return;
  }

  await window.electronAPI.notes.delete(selectedNote.value.id);
  notes.value = notes.value.filter(
    (note) => note.id !== selectedNote.value?.id,
  );
  selectedId.value = null;

  if (notes.value.length) {
    fillDraft(notes.value[0]);
  }
}

async function removeSelectedNotes(): Promise<void> {
  const ids = selectedNoteIds.value;

  if (!ids.size) {
    return;
  }

  const notesToDelete = notes.value.filter((note) => ids.has(note.id));
  const listPreview = notesToDelete
    .slice(0, 8)
    .map((note) => `• ${note.title}`)
    .join("\n");
  const restCount = Math.max(0, notesToDelete.length - 8);
  const detail = restCount ? `${listPreview}\nи ещё ${restCount}` : listPreview;
  const shouldDelete = window.confirm(
    `Удалить ${notesToDelete.length} заметок?\n\n${detail}`,
  );

  if (!shouldDelete) {
    return;
  }

  await Promise.all(notesToDelete.map((note) => window.electronAPI.notes.delete(note.id)));
  notes.value = notes.value.filter((note) => !ids.has(note.id));
  selectedNoteIds.value = new Set();
  isSelecting.value = false;

  if (selectedId.value && ids.has(selectedId.value)) {
    selectedId.value = null;
  }

  if (notes.value.length && !selectedNote.value) {
    fillDraft(notes.value[0]);
  }
}

function sendToEditor(): void {
  if (!selectedNote.value) {
    return;
  }

  editor.setContent(`# ${draftTitle.value}\n\n${draftContent.value}`);
  editor.statusMessage = "Заметка скопирована в редактор";
}

onMounted(() => {
  void loadNotes();
});
</script>
