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
      background: isDark ? "#242927" : "#ffffff",
      mainBkg: isDark ? "#2d332f" : "#faf9f5",
      secondBkg: isDark ? "#202522" : "#f6f3ed",
      primaryColor: isDark ? "#264a43" : "#e0f3ee",
      primaryTextColor: isDark ? "#f4f0e8" : "#1e2422",
      primaryBorderColor: isDark ? "#58c7b2" : "#0f8b7c",
      secondaryColor: isDark ? "#3a403b" : "#f6f3ed",
      secondaryTextColor: isDark ? "#ddd4c8" : "#514941",
      secondaryBorderColor: isDark ? "#667064" : "#bfae9c",
      tertiaryColor: isDark ? "#171b1b" : "#ffffff",
      tertiaryTextColor: isDark ? "#ddd4c8" : "#514941",
      tertiaryBorderColor: isDark ? "#465047" : "#ddd4c7",
      lineColor: isDark ? "#9ee3d5" : "#695f55",
      textColor: isDark ? "#f4f0e8" : "#1e2422",
      fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
      xyChart: {
        backgroundColor: isDark ? "#242927" : "#ffffff",
        titleColor: isDark ? "#f4f0e8" : "#1e2422",
        dataLabelColor: isDark ? "#f4f0e8" : "#1e2422",
        xAxisTitleColor: isDark ? "#ddd4c8" : "#514941",
        xAxisLabelColor: isDark ? "#cbbfad" : "#695f55",
        xAxisTickColor: isDark ? "#667064" : "#bfae9c",
        xAxisLineColor: isDark ? "#b9aea0" : "#756b61",
        yAxisTitleColor: isDark ? "#ddd4c8" : "#514941",
        yAxisLabelColor: isDark ? "#cbbfad" : "#695f55",
        yAxisTickColor: isDark ? "#667064" : "#bfae9c",
        yAxisLineColor: isDark ? "#b9aea0" : "#756b61",
        plotColorPalette: isDark ? "#58c7b2,#e7a95f,#77d8a8" : "#0f8b7c,#c77a2d,#0f7a5a",
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
