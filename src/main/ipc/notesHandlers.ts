import { ipcMain } from 'electron';

import { IPC_CHANNELS } from '../../shared/constants';
import { createNote, deleteNote, listNotes, updateNote } from '../db/database';

interface CreateNotePayload {
  title: string;
  content: string;
}

interface UpdateNotePayload {
  id: number;
  title?: string;
  content?: string;
  done?: number;
  pinned?: number;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function assertIntegerId(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
    throw new Error('A valid note id is required.');
  }

  return value;
}

function sanitizeCreateNotePayload(value: unknown): CreateNotePayload {
  if (!isPlainObject(value) || typeof value.title !== 'string' || typeof value.content !== 'string') {
    throw new Error('A valid note payload is required.');
  }

  return {
    title: value.title,
    content: value.content,
  };
}

function sanitizeUpdateNotePayload(value: unknown): UpdateNotePayload {
  if (!isPlainObject(value)) {
    throw new Error('A valid note update payload is required.');
  }

  const payload: UpdateNotePayload = {
    id: assertIntegerId(value.id),
  };

  if (typeof value.title === 'string') {
    payload.title = value.title;
  }

  if (typeof value.content === 'string') {
    payload.content = value.content;
  }

  if (typeof value.done === 'number') {
    payload.done = Number(Boolean(value.done));
  }

  if (typeof value.pinned === 'number') {
    payload.pinned = Number(Boolean(value.pinned));
  }

  return payload;
}

export function registerNotesHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.NOTES_LIST, () => listNotes());

  ipcMain.handle(IPC_CHANNELS.NOTES_CREATE, (_event, payload: unknown) => {
    const note = sanitizeCreateNotePayload(payload);
    return createNote(note.title, note.content);
  });

  ipcMain.handle(IPC_CHANNELS.NOTES_UPDATE, (_event, payload: unknown) => {
    const note = sanitizeUpdateNotePayload(payload);
    return updateNote(note.id, note);
  });

  ipcMain.handle(IPC_CHANNELS.NOTES_DELETE, (_event, id: unknown) => {
    return deleteNote(assertIntegerId(id));
  });
}
