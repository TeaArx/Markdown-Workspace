import { computed, ref } from "vue";

import { useSettingsStore } from "../stores/settingsStore";

const remainingSeconds = ref(0);
const isRunning = ref(false);
const label = ref("Фокус");

let timer: ReturnType<typeof setInterval> | null = null;

function stopTimer(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

function padTwo(value: number): string {
  return value < 10 ? `0${value}` : `${value}`;
}

async function finishTimer(): Promise<void> {
  stopTimer();
  isRunning.value = false;
  remainingSeconds.value = 0;

  await window.electronAPI.showNotification(
    "Фокус-сессия завершена",
    "Время встать, потянуться и снова сфокусироваться.",
  );
}

export function useNotifications() {
  const settingsStore = useSettingsStore();

  const formattedTime = computed(() => {
    const minutes = padTwo(Math.floor(remainingSeconds.value / 60));
    const seconds = padTwo(remainingSeconds.value % 60);
    return `${minutes}:${seconds}`;
  });

  function start(minutes = settingsStore.settings.pomodoroMinutes): void {
    stopTimer();
    label.value = "Фокус";
    remainingSeconds.value = minutes * 60;
    isRunning.value = true;

    timer = setInterval(() => {
      remainingSeconds.value -= 1;

      if (remainingSeconds.value <= 0) {
        void finishTimer();
      }
    }, 1000);
  }

  function pause(): void {
    stopTimer();
    isRunning.value = false;
    label.value = "Пауза";
  }

  function reset(): void {
    stopTimer();
    isRunning.value = false;
    label.value = "Фокус";
    remainingSeconds.value = 0;
  }

  function toggle(): void {
    if (isRunning.value) {
      pause();
      return;
    }

    if (remainingSeconds.value > 0) {
      isRunning.value = true;
      label.value = "Фокус";
      stopTimer();
      timer = setInterval(() => {
        remainingSeconds.value -= 1;

        if (remainingSeconds.value <= 0) {
          void finishTimer();
        }
      }, 1000);
      return;
    }

    start(settingsStore.settings.pomodoroMinutes);
  }

  return {
    label,
    remainingSeconds,
    formattedTime,
    isRunning,
    start,
    pause,
    reset,
    toggle,
  };
}
