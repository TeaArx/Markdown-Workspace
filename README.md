# Markdown Workspace

## English

Markdown Workspace is a training desktop project built to practice Electron application patterns with Vue, Pinia, Markdown-it, Highlight.js and Mermaid. It supports local file editing, live preview, notes, project charts, focus timer notifications and persistent application settings.

### Features

- Open, edit, drag and save `.md`, `.markdown` and `.txt` files.
- Live Markdown preview with syntax highlighting and Mermaid diagrams.
- Local notes stored in the Electron `userData` directory.
- Chart editor that can generate Markdown and Mermaid chart blocks.
- Light, dark and system themes.
- Autosave option and focus timer notifications.
- Secure Electron IPC through `contextBridge` and isolated renderer access.
- Frameless themed window title bar without the native application menu.

### Requirements

- Node.js
- npm
- Windows, macOS or Linux supported by Electron Forge

### Installation

```bash
npm install
```

### Development

```bash
npm start
```

### Checks

```bash
npm run lint
npx tsc --noEmit
```

### Packaging

```bash
npm run package
```

`npm run package` and `npm run build` both run `electron-forge package`. They create an unpacked application in `out/`, including the executable and the Electron runtime files.

```bash
npm run make
```

`npm run make` creates distributable artifacts such as installers or archives in `out/make/`, depending on the configured Electron Forge makers.

### Output

- `out/Markdown Workspace-win32-x64/` contains the unpacked Windows application.
- `out/Markdown Workspace-win32-x64/Markdown Workspace.exe` is the executable for the unpacked app.
- `out/make/` contains installer or distribution artifacts created by `npm run make`.


### Project Structure

```text
my-electron-vue-app/
  forge.config.ts
  package.json
  webpack.main.config.ts
  webpack.renderer.config.ts
  webpack.plugins.ts
  webpack.rules.ts
  src/
    main/
      main.ts
      db/
      ipc/
      tray/
      windows/
    preload/
      preload.ts
    renderer/
      App.vue
      components/
      composables/
      router/
      stores/
      styles/
      types/
      views/
    shared/
      constants.ts
```

## Russian

Markdown Workspace - учебный настольный проект для отработки паттернов разработки Electron-приложений с Vue, Pinia, Markdown-it, Highlight.js и Mermaid. Приложение поддерживает работу с локальными файлами, предпросмотр, заметки, графики проекта, уведомления фокус-таймера и сохранение настроек.

### Возможности

- Открытие, редактирование, перетаскивание и сохранение файлов `.md`, `.markdown` и `.txt`.
- Живой предпросмотр Markdown с подсветкой кода и Mermaid-схемами.
- Локальные заметки в директории Electron `userData`.
- Редактор графиков с генерацией Markdown и Mermaid-блоков.
- Светлая, темная и системная темы.
- Автосохранение и уведомления фокус-таймера.
- Безопасный Electron IPC через `contextBridge` и изолированный renderer.
- Окно с оформленной под тему шапкой без нативного меню приложения.

### Требования

- Node.js
- npm
- Windows, macOS или Linux, поддерживаемые Electron Forge

### Установка

```bash
npm install
```

### Запуск для разработки

```bash
npm start
```

### Проверки

```bash
npm run lint
npx tsc --noEmit
```

### Сборка

```bash
npm run package
```

`npm run package` и `npm run build` выполняют `electron-forge package`. Они создают распакованное приложение в папке `out/`: исполняемый файл и runtime-файлы Electron.

```bash
npm run make
```


`npm run make` создает файлы для распространения, например установщик или архив, в папке `out/make/`. Конкретный формат зависит от настроенных makers в Electron Forge.

### Где искать результат

- `out/Markdown Workspace-win32-x64/` содержит распакованное приложение для Windows.
- `out/Markdown Workspace-win32-x64/Markdown Workspace.exe` - исполняемый файл распакованного приложения.
- `out/make/` содержит установщик или другие дистрибутивные файлы после `npm run make`.


### Структура проекта

```text
my-electron-vue-app/
  forge.config.ts
  package.json
  webpack.main.config.ts
  webpack.renderer.config.ts
  webpack.plugins.ts
  webpack.rules.ts
  src/
    main/
      main.ts
      db/
      ipc/
      tray/
      windows/
    preload/
      preload.ts
    renderer/
      App.vue
      components/
      composables/
      router/
      stores/
      styles/
      types/
      views/
    shared/
      constants.ts
```
