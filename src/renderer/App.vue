<template>
  <Settings v-if="isSettingsRoute" />

  <div v-else class="app-shell">
    <div class="window-titlebar" aria-label="Панель окна">
      <div class="window-titlebar__nav">
        <button
          class="window-titlebar__button"
          type="button"
          title="Назад"
          aria-label="Назад"
          @click="router.go(-1)"
        >
          ‹
        </button>
        <button
          class="window-titlebar__button"
          type="button"
          title="Вперёд"
          aria-label="Вперёд"
          @click="router.go(1)"
        >
          ›
        </button>
      </div>
      <img class="window-titlebar__icon" :src="appIcon" alt="" aria-hidden="true" />
      <strong class="window-titlebar__title">Markdown Workspace</strong>
    </div>
    <Sidebar />

    <main class="workspace">
      <Toolbar />
      <RouterView />
      <StatusBar />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from "vue";
import { RouterView, useRoute, useRouter } from "vue-router";

import appIcon from "../../assets/icon.png";
import Sidebar from "./components/Sidebar.vue";
import StatusBar from "./components/StatusBar.vue";
import Toolbar from "./components/Toolbar.vue";
import Settings from "./views/Settings.vue";
import { useEditorCommands } from "./composables/useEditor";
import { useEditorStore } from "./stores/editorStore";
import { useSettingsStore } from "./stores/settingsStore";

const route = useRoute();
const router = useRouter();
const editor = useEditorStore();
const settingsStore = useSettingsStore();
const { handleMenuCommand } = useEditorCommands();

const isSettingsRoute = computed(() => route.path === "/settings");

let removeMenuListener: (() => void) | null = null;
let removeSettingsListener: (() => void) | null = null;

onMounted(async () => {
  await settingsStore.load();

  removeMenuListener = window.electronAPI.onMenuCommand(async (command) => {
    await handleMenuCommand(command);
  });

  removeSettingsListener = window.electronAPI.onSettingsUpdated((settings) => {
    settingsStore.setSettings(settings);
  });

  if (!isSettingsRoute.value && settingsStore.settings.lastFilePath) {
    await editor.openFromPath(settingsStore.settings.lastFilePath, false);
  }

  if (isSettingsRoute.value) {
    await router.replace("/settings");
  }
});

onBeforeUnmount(() => {
  removeMenuListener?.();
  removeSettingsListener?.();
});
</script>
