<template>
  <section class="preview-pane">
    <div class="pane-header">
      <span>Предпросмотр</span>
      <span>{{ editor.wordCount }} слов</span>
    </div>

    <article :key="previewKey" ref="previewElement" class="markdown-preview" v-html="compiled" />
  </section>
</template>

<script setup lang="ts">
import MarkdownIt from "markdown-it";
import hljs from "highlight.js";
import mermaid from "mermaid";
import { computed, nextTick, onMounted, ref, watch } from "vue";

import { useEditorStore } from "../stores/editorStore";
import { useSettingsStore } from "../stores/settingsStore";

const editor = useEditorStore();
const settingsStore = useSettingsStore();
const previewElement = ref<HTMLElement | null>(null);
const previewKey = ref(0);

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
    themeVariables: {
      background: isDark ? "#202a36" : "#ffffff",
      mainBkg: isDark ? "#253140" : "#f7f9fc",
      secondBkg: isDark ? "#1b2430" : "#eef3fb",
      primaryColor: isDark ? "#2f6fbd" : "#eaf1ff",
      primaryTextColor: isDark ? "#f4f7fb" : "#172033",
      primaryBorderColor: isDark ? "#7fb0ff" : "#2f6df6",
      secondaryColor: isDark ? "#2d3a4b" : "#f2f5f9",
      secondaryTextColor: isDark ? "#dbe6f4" : "#3f4c61",
      secondaryBorderColor: isDark ? "#55677f" : "#b9c4d4",
      tertiaryColor: isDark ? "#17202b" : "#ffffff",
      tertiaryTextColor: isDark ? "#dbe6f4" : "#3f4c61",
      tertiaryBorderColor: isDark ? "#46576e" : "#d5dce8",
      lineColor: isDark ? "#8fb8ff" : "#60748f",
      textColor: isDark ? "#f4f7fb" : "#172033",
      fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
      xyChart: {
        backgroundColor: isDark ? "#202a36" : "#ffffff",
        titleColor: isDark ? "#f4f7fb" : "#172033",
        dataLabelColor: isDark ? "#f4f7fb" : "#172033",
        xAxisTitleColor: isDark ? "#d3ddea" : "#3f4c61",
        xAxisLabelColor: isDark ? "#c2cfe0" : "#53657e",
        xAxisTickColor: isDark ? "#5a6f88" : "#b9c4d4",
        xAxisLineColor: isDark ? "#90a4bd" : "#617089",
        yAxisTitleColor: isDark ? "#d3ddea" : "#3f4c61",
        yAxisLabelColor: isDark ? "#c2cfe0" : "#53657e",
        yAxisTickColor: isDark ? "#5a6f88" : "#b9c4d4",
        yAxisLineColor: isDark ? "#90a4bd" : "#617089",
        plotColorPalette: isDark ? "#82adff,#61d8b5,#f4b75d" : "#2f6df6,#07805f,#b05d00",
      },
    },
  });
}

configureMermaid();

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

const compiled = computed(() => markdown.render(editor.content));

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
  } catch (error) {
    console.error("Failed to render Mermaid diagram", error);
  }
}

onMounted(() => {
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
</script>
