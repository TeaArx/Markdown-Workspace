import { BrowserWindow, dialog, ipcMain } from 'electron';
import type { OpenDialogOptions, SaveDialogOptions } from 'electron';
import fs from 'fs/promises';
import path from 'path';

import { IPC_CHANNELS, SUPPORTED_FILE_EXTENSIONS } from '../../shared/constants';
import { setLastFilePath } from './settingsHandlers';

export interface OpenFileResult {
  path: string;
  name: string;
  content: string;
}

export interface SaveFileResult {
  path: string;
  name: string;
  savedAt: string;
}

interface SaveFilePayload {
  content: string;
  filePath?: string | null;
}

const filters = [
  { name: 'Markdown and text', extensions: ['md', 'markdown', 'txt'] },
  { name: 'Markdown', extensions: ['md', 'markdown'] },
  { name: 'Text', extensions: ['txt'] },
];

function getParentWindow(event: Electron.IpcMainInvokeEvent): BrowserWindow | undefined {
  return BrowserWindow.fromWebContents(event.sender) ?? undefined;
}

function assertSupportedPath(filePath: string): void {
  const extension = path.extname(filePath).toLowerCase();

  if (SUPPORTED_FILE_EXTENSIONS.indexOf(extension as typeof SUPPORTED_FILE_EXTENSIONS[number]) < 0) {
    throw new Error('Only .md, .markdown and .txt files are supported.');
  }
}

function isTextFilePath(filePath: string): boolean {
  return path.extname(filePath).toLowerCase() === '.txt';
}

function hasLikelyMarkdownSyntax(content: string): boolean {
  const markdownPatterns = [
    /^#{1,6}\s+\S/m,
    /^>\s+\S/m,
    /^[-*+]\s+\S/m,
    /^\d+\.\s+\S/m,
    /(^|\n)```/,
    /\*\*[^*\n]+\*\*/,
    /(^|[^*])\*[^*\n]+\*([^*]|$)/,
    /\[[^\]\n]+\]\([^)]+\)/,
    /^\|.+\|$/m,
    /^---\s*$/m,
  ];

  return markdownPatterns.some((pattern) => pattern.test(content));
}

async function confirmPlainTextMarkdownSave(
  parentWindow: BrowserWindow | undefined,
  filePath: string,
  content: string,
): Promise<boolean> {
  if (!isTextFilePath(filePath) || !hasLikelyMarkdownSyntax(content)) {
    return true;
  }

  const options: Electron.MessageBoxOptions = {
    type: 'warning',
    buttons: ['Сохранить как .txt', 'Отмена'],
    defaultId: 1,
    cancelId: 1,
    title: 'Markdown в TXT',
    message: 'Файл сохраняется как .txt',
    detail:
      'В .txt Markdown-символы останутся обычным текстом и не будут отображаться как форматирование в большинстве программ. Для предпросмотра и форматирования лучше сохранить файл как .md.',
    noLink: true,
  };
  const result = parentWindow
    ? await dialog.showMessageBox(parentWindow, options)
    : await dialog.showMessageBox(options);

  return result.response === 0;
}

function assertFilePath(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error('A valid file path is required.');
  }

  return value;
}

function sanitizeSaveFilePayload(value: unknown): SaveFilePayload {
  if (!value || typeof value !== 'object') {
    throw new Error('A valid save payload is required.');
  }

  const payload = value as Partial<SaveFilePayload>;

  if (typeof payload.content !== 'string') {
    throw new Error('File content must be a string.');
  }

  if (payload.filePath !== undefined && payload.filePath !== null && typeof payload.filePath !== 'string') {
    throw new Error('File path must be a string.');
  }

  return {
    content: payload.content,
    filePath: payload.filePath ?? null,
  };
}

async function readTextFile(filePath: string): Promise<OpenFileResult> {
  assertSupportedPath(filePath);
  const content = await fs.readFile(filePath, 'utf-8');
  setLastFilePath(filePath);

  return {
    path: filePath,
    name: path.basename(filePath),
    content,
  };
}

async function pickOpenFile(parentWindow?: BrowserWindow): Promise<string | null> {
  const options: OpenDialogOptions = {
    title: 'Open Markdown or text file',
    filters,
    properties: ['openFile'],
  };
  const result = parentWindow ? await dialog.showOpenDialog(parentWindow, options) : await dialog.showOpenDialog(options);

  return result.canceled ? null : result.filePaths[0];
}

async function pickSaveFile(parentWindow: BrowserWindow | undefined, defaultPath?: string | null): Promise<string | null> {
  const options: SaveDialogOptions = {
    title: 'Save Markdown file',
    defaultPath: defaultPath ?? 'untitled.md',
    filters,
  };
  const result = parentWindow ? await dialog.showSaveDialog(parentWindow, options) : await dialog.showSaveDialog(options);

  return result.canceled || !result.filePath ? null : result.filePath;
}

async function saveTextFile(payload: SaveFilePayload, parentWindow: BrowserWindow | undefined, forceDialog: boolean): Promise<SaveFileResult | null> {
  const targetPath = forceDialog || !payload.filePath ? await pickSaveFile(parentWindow, payload.filePath) : payload.filePath;

  if (!targetPath) {
    return null;
  }

  assertSupportedPath(targetPath);

  const shouldSave = await confirmPlainTextMarkdownSave(parentWindow, targetPath, payload.content);

  if (!shouldSave) {
    return null;
  }

  await fs.writeFile(targetPath, payload.content, 'utf-8');
  setLastFilePath(targetPath);

  return {
    path: targetPath,
    name: path.basename(targetPath),
    savedAt: new Date().toISOString(),
  };
}

export function registerFileHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.FILE_OPEN, async (event) => {
    const filePath = await pickOpenFile(getParentWindow(event));
    return filePath ? readTextFile(filePath) : null;
  });

  ipcMain.handle(IPC_CHANNELS.FILE_OPEN_PATH, async (_event, filePath: unknown) => {
    return readTextFile(assertFilePath(filePath));
  });

  ipcMain.handle(IPC_CHANNELS.FILE_SAVE, async (event, payload: unknown) => {
    return saveTextFile(sanitizeSaveFilePayload(payload), getParentWindow(event), false);
  });

  ipcMain.handle(IPC_CHANNELS.FILE_SAVE_AS, async (event, payload: unknown) => {
    return saveTextFile(sanitizeSaveFilePayload(payload), getParentWindow(event), true);
  });
}
