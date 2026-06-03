import { ipcMain } from 'electron';
import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

import { IPC_CHANNELS } from '../../shared/constants';

const execFileAsync = promisify(execFile);
const commandTimeoutMs = 8000;

export interface GitFileStatus {
  isRepository: boolean;
  repoRoot: string | null;
  branch: string | null;
  filePath: string;
  relativePath: string | null;
  statusCode: string | null;
  statusLabel: string;
  isDirty: boolean;
}

function assertFilePath(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error('A valid file path is required.');
  }

  return value;
}

async function runGit(args: string[], cwd: string): Promise<string> {
  const { stdout } = await execFileAsync('git', args, {
    cwd,
    timeout: commandTimeoutMs,
    windowsHide: true,
  });

  return stdout.trim();
}

function getWorkingDirectory(filePath: string): string {
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    return filePath;
  }

  return path.dirname(filePath);
}

function getStatusLabel(statusCode: string | null): string {
  if (!statusCode) {
    return 'Чисто';
  }

  if (statusCode === '??') {
    return 'Не отслеживается';
  }

  if (statusCode.includes('D')) {
    return 'Удалён';
  }

  if (statusCode.includes('A')) {
    return 'Добавлен';
  }

  if (statusCode.includes('M')) {
    return 'Изменён';
  }

  if (statusCode.includes('R')) {
    return 'Переименован';
  }

  return 'Есть изменения';
}

function getSafeRelativePath(repoRoot: string, filePath: string): string {
  const relativePath = path.relative(repoRoot, filePath);

  if (!relativePath || relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new Error('The file is outside of the detected Git repository.');
  }

  return relativePath;
}

async function getGitStatus(filePath: string): Promise<GitFileStatus> {
  const cwd = getWorkingDirectory(filePath);

  try {
    const repoRoot = await runGit(['rev-parse', '--show-toplevel'], cwd);
    const branch = await runGit(['rev-parse', '--abbrev-ref', 'HEAD'], repoRoot);
    const relativePath = getSafeRelativePath(repoRoot, filePath);
    const porcelain = await runGit(['status', '--porcelain=v1', '--', relativePath], repoRoot);
    const statusCode = porcelain.length > 0 ? porcelain.slice(0, 2).trim() || porcelain.slice(0, 2) : null;

    return {
      isRepository: true,
      repoRoot,
      branch,
      filePath,
      relativePath,
      statusCode,
      statusLabel: getStatusLabel(statusCode),
      isDirty: Boolean(statusCode),
    };
  } catch {
    return {
      isRepository: false,
      repoRoot: null,
      branch: null,
      filePath,
      relativePath: null,
      statusCode: null,
      statusLabel: 'Git-репозиторий не найден',
      isDirty: false,
    };
  }
}

async function getGitDiff(filePath: string): Promise<string> {
  const cwd = getWorkingDirectory(filePath);
  const repoRoot = await runGit(['rev-parse', '--show-toplevel'], cwd);
  const relativePath = getSafeRelativePath(repoRoot, filePath);

  return runGit(['diff', '--', relativePath], repoRoot);
}

export function registerGitHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.GIT_STATUS, (_event, filePath: unknown) => {
    return getGitStatus(assertFilePath(filePath));
  });

  ipcMain.handle(IPC_CHANNELS.GIT_DIFF, (_event, filePath: unknown) => {
    return getGitDiff(assertFilePath(filePath));
  });
}
