<template>
  <section class="preview-pane" :class="{ 'preview-pane--controls-open': isPreviewSettingsOpen }">
    <div class="pane-header">
      <button
        class="pane-title-button"
        type="button"
        :aria-expanded="isPreviewSettingsOpen"
        title="Настройки предпросмотра"
        @click="isPreviewSettingsOpen = !isPreviewSettingsOpen"
      >
        Предпросмотр
      </button>
      <span>{{ editor.wordCount }} слов</span>
    </div>

    <div v-if="isPreviewSettingsOpen" class="pane-controls pane-controls--compact" aria-label="Настройки предпросмотра">
      <label>
        <span>Размер</span>
        <input
          :value="settingsStore.settings.previewFontSize"
          min="12"
          max="28"
          type="range"
          @input="updatePreviewSetting('previewFontSize', Number(($event.target as HTMLInputElement).value))"
        />
        <strong>{{ settingsStore.settings.previewFontSize }}px</strong>
      </label>

      <label>
        <span>Интервал</span>
        <input
          :value="settingsStore.settings.previewLineHeight"
          min="1.2"
          max="2.4"
          step="0.1"
          type="range"
          @input="updatePreviewSetting('previewLineHeight', Number(($event.target as HTMLInputElement).value))"
        />
        <strong>{{ settingsStore.settings.previewLineHeight.toFixed(1) }}</strong>
      </label>

    </div>

    <article :key="previewKey" ref="previewElement" class="markdown-preview" v-html="compiled" />
  </section>
</template>

<script setup lang="ts">
import MarkdownIt from "markdown-it";
import hljs from "highlight.js";
import mermaid from "mermaid";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";

import { useEditorStore } from "../stores/editorStore";
import { useSettingsStore } from "../stores/settingsStore";

const editor = useEditorStore();
const settingsStore = useSettingsStore();
const previewElement = ref<HTMLElement | null>(null);
const previewKey = ref(0);
const isPreviewSettingsOpen = ref(false);
let removeSystemThemeListener: (() => void) | null = null;

function resolveMermaidTheme(): "base" | "dark" {
  const theme = settingsStore.settings.theme;

  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "base";
  }

  return theme === "dark" ? "dark" : "base";
}

function configureMermaid(): void {
  const isDark = resolveMermaidTheme() === "dark";

  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme: "base",
    xyChart: {
      width: 660,
      height: 360,
      titlePadding: 10,
      xAxis: {
        labelPadding: 8,
        titlePadding: 10,
      },
      yAxis: {
        labelPadding: 8,
        titlePadding: 10,
      },
      plotReservedSpacePercent: 74,
    },
    themeVariables: {
      background: isDark ? "#242927" : "#ffffff",
      mainBkg: isDark ? "#2d332f" : "#fbfaf7",
      secondBkg: isDark ? "#202522" : "#e8ebfb",
      primaryColor: isDark ? "#264a43" : "#e0f3ee",
      primaryTextColor: isDark ? "#f4f0e8" : "#1e2422",
      primaryBorderColor: isDark ? "#58c7b2" : "#0f8b7c",
      secondaryColor: isDark ? "#303650" : "#e8ebfb",
      secondaryTextColor: isDark ? "#ddd4c8" : "#354248",
      secondaryBorderColor: isDark ? "#9aa8ff" : "#5266c2",
      tertiaryColor: isDark ? "#171b1b" : "#ffffff",
      tertiaryTextColor: isDark ? "#ddd4c8" : "#514941",
      tertiaryBorderColor: isDark ? "#465047" : "#ddd4c7",
      lineColor: isDark ? "#9ee3d5" : "#076b60",
      textColor: isDark ? "#f4f0e8" : "#1e2422",
      fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
      xyChart: {
        backgroundColor: isDark ? "#242927" : "#ffffff",
        titleColor: isDark ? "#f4f0e8" : "#1e2422",
        dataLabelColor: isDark ? "#f4f0e8" : "#1e2422",
        xAxisTitleColor: isDark ? "#ddd4c8" : "#514941",
        xAxisLabelColor: isDark ? "#ddd4c8" : "#354248",
        xAxisTickColor: isDark ? "#465047" : "#d5dde1",
        xAxisLineColor: isDark ? "#9ee3d5" : "#0f8b7c",
        yAxisTitleColor: isDark ? "#ddd4c8" : "#514941",
        yAxisLabelColor: isDark ? "#ddd4c8" : "#354248",
        yAxisTickColor: isDark ? "#465047" : "#d5dde1",
        yAxisLineColor: isDark ? "#9ee3d5" : "#0f8b7c",
        plotColorPalette: isDark ? "#58c7b2,#9aa8ff,#77d8a8" : "#0f8b7c,#5266c2,#c77a2d",
      },
    },
  });
}

configureMermaid();

function padMermaidXYCharts(): void {
  if (!previewElement.value) {
    return;
  }

  const svgs = previewElement.value.querySelectorAll<SVGSVGElement>(".mermaid svg");

  svgs.forEach((svg) => {
    const isXYChart = svg.querySelector(".bar-plot-0, .line-plot-0");

    if (!isXYChart || svg.dataset.xyChartPadded === "true") {
      return;
    }

    const viewBox = svg.getAttribute("viewBox")?.split(/\s+/).map(Number);

    if (!viewBox || viewBox.length !== 4 || viewBox.some((value) => !Number.isFinite(value))) {
      return;
    }

    const [x, y, width, height] = viewBox;
    const padding = {
      top: 24,
      right: 28,
      bottom: 30,
      left: 28,
    };

    svg.setAttribute(
      "viewBox",
      [
        x - padding.left,
        y - padding.top,
        width + padding.left + padding.right,
        height + padding.top + padding.bottom,
      ].join(" "),
    );
    svg.dataset.xyChartPadded = "true";
  });
}

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  highlight(code, language) {
    if (language === "mermaid") {
      return `<pre class="mermaid">${markdown.utils.escapeHtml(code)}</pre>`;
    }

    if (language && hljs.getLanguage(language)) {
      try {
        return `<pre class="hljs"><code>${hljs.highlight(code, { language }).value}</code></pre>`;
      } catch {
        return "";
      }
    }

    return `<pre class="hljs"><code>${markdown.utils.escapeHtml(code)}</code></pre>`;
  },
});

const defaultLinkOpenRenderer = markdown.renderer.rules.link_open;

markdown.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  tokens[idx].attrSet("target", "_blank");
  tokens[idx].attrSet("rel", "noopener noreferrer");

  return defaultLinkOpenRenderer
    ? defaultLinkOpenRenderer(tokens, idx, options, env, self)
    : self.renderToken(tokens, idx, options);
};

const compiled = computed(() => markdown.render(editor.content));

async function updatePreviewSetting<K extends keyof AppSettings>(
  key: K,
  value: AppSettings[K],
): Promise<void> {
  await settingsStore.update({ [key]: value } as Partial<AppSettings>);
}

async function renderMermaid(): Promise<void> {
  await nextTick();

  if (!previewElement.value) {
    return;
  }

  const diagrams = previewElement.value.querySelectorAll<HTMLElement>(".mermaid");

  if (!diagrams.length) {
    return;
  }

  try {
    configureMermaid();
    await mermaid.run({ nodes: diagrams });
    padMermaidXYCharts();
  } catch (error) {
    const message = error instanceof Error ? error.message : "не удалось отрисовать диаграмму";
    editor.statusMessage = `Ошибка Mermaid: ${message}`;
  }
}

onMounted(() => {
  const colorSchemeQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const handleSystemThemeChange = (): void => {
    if (settingsStore.settings.theme !== "system") {
      return;
    }

    previewKey.value += 1;
    void renderMermaid();
  };

  colorSchemeQuery.addEventListener("change", handleSystemThemeChange);
  removeSystemThemeListener = () => colorSchemeQuery.removeEventListener("change", handleSystemThemeChange);
  void renderMermaid();
});

watch(compiled, () => {
  void renderMermaid();
});

watch(
  () => settingsStore.settings.theme,
  () => {
    previewKey.value += 1;
    void renderMermaid();
  },
);

onBeforeUnmount(() => {
  removeSystemThemeListener?.();
});
</script>
