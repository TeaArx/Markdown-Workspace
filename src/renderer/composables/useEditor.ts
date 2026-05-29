import { MENU_COMMANDS } from '../../shared/constants';
import { useEditorStore } from '../stores/editorStore';
import { useNotifications } from './useNotifications';

export function useEditorCommands() {
  const editor = useEditorStore();
  const notifications = useNotifications();

  async function handleMenuCommand(command: MenuCommand): Promise<void> {
    switch (command) {
      case MENU_COMMANDS.NEW_FILE:
        editor.newFile();
        break;
      case MENU_COMMANDS.OPEN_FILE:
        await editor.openFromDialog();
        break;
      case MENU_COMMANDS.SAVE_FILE:
        await editor.save();
        break;
      case MENU_COMMANDS.SAVE_FILE_AS:
        await editor.saveAs();
        break;
      case MENU_COMMANDS.OPEN_SETTINGS:
        await window.electronAPI.openSettingsWindow();
        break;
      case MENU_COMMANDS.FOCUS_EDITOR:
        (document.querySelector('[data-editor-input]') as HTMLTextAreaElement | null)?.focus();
        break;
      case MENU_COMMANDS.START_POMODORO:
        notifications.start();
        break;
      default:
        break;
    }
  }

  return {
    handleMenuCommand,
  };
}
