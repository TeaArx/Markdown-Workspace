import { BrowserWindow, app, dialog, ipcMain } from 'electron';
import { execFile } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { promisify } from 'util';

import { IPC_CHANNELS, SUPPORTED_FILE_EXTENSIONS } from '../../shared/constants';

const execFileAsync = promisify(execFile);
const commandTimeoutMs = 8000;
const ignoredDirectories = new Set(['.git', 'node_modules', 'out', 'dist', 'build']);
const maxMarkdownFiles = 300;

export interface GitProject {
  name: string;
  path: string;
  branch: string;
  isDirty: boolean;
}

export interface ProjectFile {
  name: string;
  path: string;
  relativePath: string;
}

export interface ProjectsListResult {
  rootPath: string;
  rootExists: boolean;
  projects: GitProject[];
}

function getDefaultProjectsRoot(): string {
  return path.join(app.getPath('documents'), 'GitHub');
}

function getParentWindow(event: Electron.IpcMainInvokeEvent): BrowserWindow | undefined {
  return BrowserWindow.fromWebContents(event.sender) ?? undefined;
}

function assertDirectoryPath(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error('A valid directory path is required.');
  }

  return value;
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function isDirectory(filePath: string): Promise<boolean> {
  try {
    return (await fs.stat(filePath)).isDirectory();
  } catch {
    return false;
  }
}

async function runGit(args: string[], cwd: string): Promise<string> {
  const { stdout } = await execFileAsync('git', args, {
    cwd,
    timeout: commandTimeoutMs,
    windowsHide: true,
  });

  return stdout.trim();
}

async function readProject(projectPath: string): Promise<GitProject | null> {
  const gitPath = path.join(projectPath, '.git');

  if (!(await pathExists(gitPath))) {
    return null;
  }

  try {
    const branch = await runGit(['rev-parse', '--abbrev-ref', 'HEAD'], projectPath);
    const status = await runGit(['status', '--porcelain=v1'], projectPath);

    return {
      name: path.basename(projectPath),
      path: projectPath,
      branch,
      isDirty: status.length > 0,
    };
  } catch {
    return {
      name: path.basename(projectPath),
      path: projectPath,
      branch: '-',
      isDirty: false,
    };
  }
}

async function listProjects(rootPath = getDefaultProjectsRoot()): Promise<ProjectsListResult> {
  if (!(await isDirectory(rootPath))) {
    return {
      rootPath,
      rootExists: false,
      projects: [],
    };
  }

  const entries = await fs.readdir(rootPath, { withFileTypes: true });
  const projectResults = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => readProject(path.join(rootPath, entry.name))),
  );

  return {
    rootPath,
    rootExists: true,
    projects: projectResults
      .filter((project): project is GitProject => Boolean(project))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}

function isSupportedMarkdownPath(filePath: string): boolean {
  const extension = path.extname(filePath).toLowerCase();
  return SUPPORTED_FILE_EXTENSIONS.includes(extension as typeof SUPPORTED_FILE_EXTENSIONS[number]);
}

async function collectMarkdownFiles(projectPath: string, currentPath = projectPath, files: ProjectFile[] = []): Promise<ProjectFile[]> {
  if (files.length >= maxMarkdownFiles) {
    return files;
  }

  const entries = await fs.readdir(currentPath, { withFileTypes: true });

  for (const entry of entries) {
    if (files.length >= maxMarkdownFiles) {
      break;
    }

    const entryPath = path.join(currentPath, entry.name);

    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        await collectMarkdownFiles(projectPath, entryPath, files);
      }

      continue;
    }

    if (entry.isFile() && isSupportedMarkdownPath(entryPath)) {
      files.push({
        name: entry.name,
        path: entryPath,
        relativePath: path.relative(projectPath, entryPath),
      });
    }
  }

  return files;
}

async function listProjectFiles(projectPath: string): Promise<ProjectFile[]> {
  const safeProjectPath = assertDirectoryPath(projectPath);

  if (!(await isDirectory(safeProjectPath)) || !(await pathExists(path.join(safeProjectPath, '.git')))) {
    throw new Error('A valid Git project path is required.');
  }

  return (await collectMarkdownFiles(safeProjectPath)).sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

async function pickProjectsRoot(parentWindow?: BrowserWindow): Promise<ProjectsListResult | null> {
  const options: Electron.OpenDialogOptions = {
    title: 'Выберите папку с Git-проектами',
    defaultPath: getDefaultProjectsRoot(),
    properties: ['openDirectory'],
  };
  const result = parentWindow ? await dialog.showOpenDialog(parentWindow, options) : await dialog.showOpenDialog(options);

  if (result.canceled || !result.filePaths[0]) {
    return null;
  }

  return listProjects(result.filePaths[0]);
}

export function registerProjectsHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.PROJECTS_LIST, (_event, rootPath?: unknown) => {
    return listProjects(typeof rootPath === 'string' && rootPath.length > 0 ? rootPath : undefined);
  });

  ipcMain.handle(IPC_CHANNELS.PROJECTS_PICK_ROOT, (event) => {
    return pickProjectsRoot(getParentWindow(event));
  });

  ipcMain.handle(IPC_CHANNELS.PROJECTS_LIST_FILES, (_event, projectPath: unknown) => {
    return listProjectFiles(assertDirectoryPath(projectPath));
  });
}
