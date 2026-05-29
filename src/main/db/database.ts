import { app } from 'electron';
import fs from 'fs';
import path from 'path';

export interface NoteRecord {
  id: number;
  title: string;
  content: string;
  done: number;
  pinned: number;
  createdAt: string;
  updatedAt: string;
}

interface NotesFile {
  nextId: number;
  notes: NoteRecord[];
}

let cache: NotesFile | null = null;

function now(): string {
  return new Date().toISOString();
}

function getDatabasePath(): string {
  const dataDirectory = app.getPath('userData');
  fs.mkdirSync(dataDirectory, { recursive: true });
  return path.join(dataDirectory, 'notes.json');
}

function backupCorruptFile(filePath: string): void {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const backupPath = `${filePath}.corrupt-${Date.now()}`;

  try {
    fs.copyFileSync(filePath, backupPath);
  } catch {
    return;
  }
}

function normalizeNote(note: Partial<NoteRecord>, fallbackId: number): NoteRecord {
  const timestamp = now();

  return {
    id: typeof note.id === 'number' ? note.id : fallbackId,
    title: typeof note.title === 'string' && note.title.trim() ? note.title.trim() : 'Untitled note',
    content: typeof note.content === 'string' ? note.content : '',
    done: Number(Boolean(note.done)),
    pinned: Number(Boolean(note.pinned)),
    createdAt: typeof note.createdAt === 'string' ? note.createdAt : timestamp,
    updatedAt: typeof note.updatedAt === 'string' ? note.updatedAt : timestamp,
  };
}

function readNotesFile(): NotesFile {
  if (cache) {
    return cache;
  }

  const databasePath = getDatabasePath();

  try {
    if (!fs.existsSync(databasePath)) {
      cache = { nextId: 1, notes: [] };
      return cache;
    }

    const raw = JSON.parse(fs.readFileSync(databasePath, 'utf-8')) as Partial<NotesFile>;
    const notes = Array.isArray(raw.notes) ? raw.notes.map((note, index) => normalizeNote(note, index + 1)) : [];
    const maxId = notes.reduce((max, note) => Math.max(max, note.id), 0);
    cache = {
      nextId: Math.max(typeof raw.nextId === 'number' ? raw.nextId : 1, maxId + 1),
      notes,
    };
    return cache;
  } catch {
    backupCorruptFile(databasePath);
    cache = { nextId: 1, notes: [] };
    return cache;
  }
}

function writeNotesFile(data: NotesFile): NotesFile {
  const databasePath = getDatabasePath();
  const temporaryPath = `${databasePath}.tmp`;

  cache = data;
  fs.writeFileSync(temporaryPath, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(temporaryPath, databasePath);
  return data;
}

function sortNotes(notes: NoteRecord[]): NoteRecord[] {
  return [...notes].sort((left, right) => Number(right.pinned) - Number(left.pinned) || right.updatedAt.localeCompare(left.updatedAt));
}

export function listNotes(): NoteRecord[] {
  return sortNotes(readNotesFile().notes);
}

export function createNote(title: string, content: string): NoteRecord {
  const database = readNotesFile();
  const timestamp = now();
  const note: NoteRecord = {
    id: database.nextId,
    title: title.trim() || 'Untitled note',
    content,
    done: 0,
    pinned: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  writeNotesFile({
    nextId: database.nextId + 1,
    notes: [note, ...database.notes],
  });

  return note;
}

export function getNote(id: number): NoteRecord {
  const note = readNotesFile().notes.find((item) => item.id === id);

  if (!note) {
    throw new Error('Note not found.');
  }

  return note;
}

export function updateNote(id: number, patch: Partial<Pick<NoteRecord, 'title' | 'content' | 'done' | 'pinned'>>): NoteRecord {
  const database = readNotesFile();
  const current = getNote(id);
  const next: NoteRecord = {
    ...current,
    title: typeof patch.title === 'string' && patch.title.trim() ? patch.title.trim() : current.title,
    content: typeof patch.content === 'string' ? patch.content : current.content,
    done: typeof patch.done === 'number' ? Number(Boolean(patch.done)) : current.done,
    pinned: typeof patch.pinned === 'number' ? Number(Boolean(patch.pinned)) : current.pinned,
    updatedAt: now(),
  };

  writeNotesFile({
    ...database,
    notes: database.notes.map((note) => (note.id === id ? next : note)),
  });

  return next;
}

export function deleteNote(id: number): { deleted: boolean } {
  const database = readNotesFile();
  const notes = database.notes.filter((note) => note.id !== id);
  writeNotesFile({ ...database, notes });
  return { deleted: notes.length !== database.notes.length };
}
