<template>
  <section class="chart-view" aria-labelledby="chart-title">
    <aside class="chart-guide">
      <div class="pane-header">
        <span>График файла</span>
      </div>

      <div class="chart-guide__body">
        <div class="chart-guide__file">
          <span>Текущий файл</span>
          <strong>{{ editor.fileName }}</strong>
        </div>

        <button class="button button--primary button--full" type="button" @click="applyToDocument">
          Вставить в файл
        </button>
        <button class="button button--full" type="button" :disabled="!editor.isDirty || editor.isLoading" @click="editor.save">
          Сохранить файл
        </button>
        <button class="button button--full" type="button" @click="loadFromDocument">
          Загрузить из файла
        </button>
        <button class="button button--full" type="button" @click="resetChart">
          Новый график
        </button>
      </div>
    </aside>

    <div class="chart-workspace">
      <header class="chart-header">
        <div>
          <p class="chart-kicker">Данные в Markdown</p>
          <h1 id="chart-title">{{ title || "Без названия" }}</h1>
          <p class="chart-summary">
            {{ description || "График будет сохранен прямо в текущий Markdown-файл." }}
          </p>
        </div>

        <div class="chart-status" :class="{ 'chart-status--dirty': editor.isDirty }">
          {{ editor.isDirty ? "Есть несохраненные изменения" : "Файл сохранен" }}
        </div>
      </header>

      <div class="chart-layout">
        <article class="chart-panel" aria-label="Предпросмотр графика">
          <div class="chart-panel__topline">
            <div>
              <span class="chart-stat-label">Пик</span>
              <strong>{{ peak.label }} · {{ peak.value }} {{ unitLabel }}</strong>
            </div>
            <div>
              <span class="chart-stat-label">Сумма</span>
              <strong>{{ totalValue }} {{ unitLabel }}</strong>
            </div>
            <div>
              <span class="chart-stat-label">Среднее</span>
              <strong>{{ averageValue }} {{ unitLabel }}</strong>
            </div>
          </div>

          <svg class="activity-chart" viewBox="0 0 720 360" role="img" :aria-label="chartAriaLabel">
            <title>{{ chartAriaLabel }}</title>
            <desc>График строится из строк редактора данных.</desc>

            <g class="chart-grid" aria-hidden="true">
              <line
                v-for="tick in yTicks"
                :key="tick"
                x1="58"
                x2="684"
                :y1="yScale(tick)"
                :y2="yScale(tick)"
              />
            </g>

            <g class="chart-axis" aria-hidden="true">
              <text v-for="tick in yTicks" :key="tick" x="44" :y="yScale(tick) + 4">
                {{ tick }}
              </text>
            </g>

            <g v-if="chartKind !== 'line'">
              <g v-for="point in plottedData" :key="point.label" class="chart-bar-group">
                <rect
                  class="chart-bar"
                  :class="{ 'chart-bar--peak': point.label === peak.label }"
                  :x="point.x"
                  :y="point.y"
                  :width="barWidth"
                  :height="point.height"
                  rx="6"
                />
                <text class="chart-value" :x="point.x + barWidth / 2" :y="point.valueY">
                  {{ point.value }}
                </text>
                <text class="chart-month" :x="point.x + barWidth / 2" y="332">
                  {{ point.shortLabel }}
                </text>
              </g>
            </g>

            <polyline v-if="chartKind !== 'bar'" class="chart-trend" :points="trendLinePoints" fill="none" />
            <g v-if="chartKind !== 'bar'">
              <circle
                v-for="point in plottedData"
                :key="`${point.label}-dot`"
                class="chart-dot"
                :cx="point.x + barWidth / 2"
                :cy="point.y"
                r="5"
              />
            </g>
          </svg>
        </article>

        <aside class="chart-editor" aria-label="Редактирование графика">
          <div class="pane-header">
            <span>Редактирование</span>
          </div>

          <div class="chart-form">
            <label>
              <span>Название</span>
              <input v-model="title" type="text" />
            </label>

            <label>
              <span>Описание</span>
              <textarea v-model="description" rows="3" />
            </label>

            <div class="chart-options">
              <label>
                <span>Тип</span>
                <select v-model="chartKind">
                  <option value="bar">Столбцы</option>
                  <option value="line">Линия</option>
                  <option value="combo">Столбцы + линия</option>
                </select>
              </label>

              <label>
                <span>Единицы</span>
                <input v-model="unit" type="text" />
              </label>
            </div>

            <div class="chart-values">
              <div class="chart-values__header">
                <span>Подпись</span>
                <span>Значение</span>
              </div>

              <div v-for="(point, index) in points" :key="point.id" class="chart-value-row">
                <input v-model="point.label" type="text" aria-label="Подпись точки" />
                <input v-model.number="point.value" min="0" type="number" aria-label="Значение точки" />
                <button class="button button--small button--danger" type="button" @click="removePoint(index)">
                  Удалить
                </button>
              </div>
            </div>

            <button class="button" type="button" @click="addPoint">
              Добавить строку
            </button>
          </div>

          <div class="chart-actions">
            <button class="button button--primary" type="button" @click="applyToDocument">
              Вставить в файл
            </button>
            <button class="button" type="button" :disabled="!editor.isDirty || editor.isLoading" @click="editor.save">
              Сохранить
            </button>
          </div>
        </aside>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

import { useEditorStore } from "../stores/editorStore";

type ChartKind = "bar" | "line" | "combo";

type ChartPoint = {
  id: number;
  label: string;
  value: number;
};

const blockStart = "[//]: # (markdown-workspace:chart:start)";
const blockEnd = "[//]: # (markdown-workspace:chart:end)";
const legacyBlockStart = "<!-- markdown-workspace:chart:start -->";
const legacyBlockEnd = "<!-- markdown-workspace:chart:end -->";

const editor = useEditorStore();
const title = ref("Прогресс проекта");
const description = ref("Короткий график по данным из текущего файла.");
const unit = ref("шт.");
const chartKind = ref<ChartKind>("combo");
const points = ref<ChartPoint[]>([
  { id: 1, label: "Пн", value: 4 },
  { id: 2, label: "Вт", value: 7 },
  { id: 3, label: "Ср", value: 5 },
  { id: 4, label: "Чт", value: 9 },
  { id: 5, label: "Пт", value: 12 },
]);

const chartHeight = 250;
const chartBottom = 304;
const chartLeft = 74;
const chartRight = 684;
const barWidth = 54;

const cleanPoints = computed(() => {
  const normalized = points.value
    .map((point, index) => ({
      label: point.label.trim() || `Точка ${index + 1}`,
      value: safeValue(Number(point.value)),
    }))
    .filter((point) => point.label);

  return normalized.length ? normalized : [{ label: "Нет данных", value: 0 }];
});

const values = computed(() => cleanPoints.value.map((point) => point.value));
const maxValue = computed(() => Math.max(10, ...values.value));
const yMax = computed(() => Math.ceil(maxValue.value / 10) * 10);
const yTicks = computed(() => [0, yMax.value / 2, yMax.value]);
const totalValue = computed(() => values.value.reduce((total, value) => total + value, 0));
const averageValue = computed(() => Math.round(totalValue.value / cleanPoints.value.length));
const unitLabel = computed(() => unit.value.trim() || "ед.");

const slotWidth = computed(() => {
  if (cleanPoints.value.length <= 1) {
    return 0;
  }

  return (chartRight - chartLeft - barWidth) / (cleanPoints.value.length - 1);
});

const yScale = (value: number): number => chartBottom - (value / yMax.value) * chartHeight;

const plottedData = computed(() =>
  cleanPoints.value.map((point, index) => {
    const y = yScale(point.value);
    const x = cleanPoints.value.length === 1
      ? chartLeft + (chartRight - chartLeft - barWidth) / 2
      : chartLeft + index * slotWidth.value;

    return {
      ...point,
      shortLabel: point.label.length > 8 ? `${point.label.slice(0, 7)}.` : point.label,
      x,
      y,
      valueY: Math.max(18, y - 10),
      height: chartBottom - y,
    };
  }),
);

const peak = computed(() =>
  cleanPoints.value.reduce((highest, point) => (point.value > highest.value ? point : highest), cleanPoints.value[0]),
);

const trendLinePoints = computed(() =>
  plottedData.value.map((point) => `${point.x + barWidth / 2},${point.y}`).join(" "),
);

const chartAriaLabel = computed(
  () => `${title.value || "График"}: пик ${peak.value.value} ${unitLabel.value} в "${peak.value.label}".`,
);

function safeValue(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function nextPointId(): number {
  return Math.max(0, ...points.value.map((point) => point.id)) + 1;
}

function addPoint(): void {
  points.value.push({
    id: nextPointId(),
    label: `Точка ${points.value.length + 1}`,
    value: 0,
  });
}

function removePoint(index: number): void {
  if (points.value.length <= 1) {
    points.value = [{ id: nextPointId(), label: "Точка 1", value: 0 }];
    return;
  }

  points.value.splice(index, 1);
}

function resetChart(): void {
  title.value = "Новый график";
  description.value = "";
  unit.value = "шт.";
  chartKind.value = "combo";
  points.value = [
    { id: 1, label: "Янв", value: 10 },
    { id: 2, label: "Фев", value: 16 },
    { id: 3, label: "Мар", value: 13 },
  ];
}

function escapeMermaidText(value: string): string {
  return value.replace(/"/g, "'");
}

function createMarkdownBlock(): string {
  const labels = cleanPoints.value.map((point) => `"${escapeMermaidText(point.label)}"`).join(", ");
  const data = cleanPoints.value.map((point) => point.value).join(", ");
  const caption = description.value.trim();
  const chartLines = [
    "```mermaid",
    "xychart-beta",
    `    title "${escapeMermaidText(title.value.trim() || "График")}"`,
    `    x-axis [${labels}]`,
    `    y-axis "${escapeMermaidText(unitLabel.value)}" 0 --> ${yMax.value}`,
  ];

  if (chartKind.value !== "line") {
    chartLines.push(`    bar [${data}]`);
  }

  if (chartKind.value !== "bar") {
    chartLines.push(`    line [${data}]`);
  }

  chartLines.push("```");

  return [
    blockStart,
    `## ${title.value.trim() || "График"}`,
    caption,
    "",
    ...chartLines,
    blockEnd,
  ]
    .filter((line, index, list) => line || list[index - 1] !== "")
    .join("\n");
}

function findChartBlock(content: string): { startIndex: number; endIndex: number; endMarker: string } | null {
  const startMarkers = [blockStart, legacyBlockStart];
  const endMarkers = [blockEnd, legacyBlockEnd];

  for (const startMarker of startMarkers) {
    const startIndex = content.indexOf(startMarker);

    if (startIndex < 0) {
      continue;
    }

    for (const endMarker of endMarkers) {
      const endIndex = content.indexOf(endMarker, startIndex + startMarker.length);

      if (endIndex > startIndex) {
        return { startIndex, endIndex, endMarker };
      }
    }
  }

  return null;
}

function applyToDocument(): void {
  const block = createMarkdownBlock();
  const content = editor.content;
  const existingBlock = findChartBlock(content);

  if (existingBlock) {
    const nextContent = `${content.slice(0, existingBlock.startIndex)}${block}${content.slice(
      existingBlock.endIndex + existingBlock.endMarker.length,
    )}`;
    editor.setContent(nextContent);
  } else {
    const separator = content.trim() ? "\n\n" : "";
    editor.setContent(`${content.trimEnd()}${separator}${block}\n`);
  }

  editor.statusMessage = "График вставлен в Markdown-файл";
}

function loadFromDocument(): void {
  const existingBlock = findChartBlock(editor.content);

  if (!existingBlock) {
    editor.statusMessage = "В текущем файле еще нет блока графика";
    return;
  }

  const block = editor.content.slice(existingBlock.startIndex, existingBlock.endIndex);
  const heading = block.match(/^##\s+(.+)$/m);
  const unitMatch = block.match(/^\|\s*Подпись\s*\|\s*Значение,\s*([^|]+)\|$/m);
  const tableRows = Array.from(block.matchAll(/^\|\s*([^|\n]+?)\s*\|\s*(\d+(?:\.\d+)?)\s*\|$/gm))
    .filter((match) => !match[1].includes("---") && !match[1].includes("Подпись"));
  const mermaidLabels = block.match(/x-axis\s+\[([^\]]+)\]/);
  const mermaidBars = block.match(/^\s*bar\s+\[([^\]]+)\]/m);
  const mermaidLine = block.match(/^\s*line\s+\[([^\]]+)\]/m);
  const mermaidUnit = block.match(/y-axis\s+"([^"]+)"/);
  const mermaidValues = mermaidBars?.[1] ?? mermaidLine?.[1] ?? "";

  title.value = heading?.[1]?.trim() || title.value;
  unit.value = unitMatch?.[1]?.trim() || mermaidUnit?.[1]?.trim() || unit.value;

  if (tableRows.length) {
    points.value = tableRows.map((match, index) => ({
      id: index + 1,
      label: match[1].trim(),
      value: safeValue(Number(match[2])),
    }));
  } else if (mermaidLabels?.[1] && mermaidValues) {
    const labels = Array.from(mermaidLabels[1].matchAll(/"([^"]+)"/g)).map((match) => match[1]);
    const values = mermaidValues.split(",").map((value) => safeValue(Number(value.trim())));

    points.value = labels.map((label, index) => ({
      id: index + 1,
      label,
      value: values[index] ?? 0,
    }));
  }

  chartKind.value = mermaidBars && mermaidLine ? "combo" : mermaidLine ? "line" : "bar";

  const descriptionMatch = block.match(/^##\s+.+\n([\s\S]*?)\n```mermaid/m);
  description.value = descriptionMatch?.[1]?.trim() ?? description.value;
  editor.statusMessage = "График загружен из Markdown-файла";
}

onMounted(loadFromDocument);
</script>
