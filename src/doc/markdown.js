// =====================================================================
// DOC · МИНИ-ПАРСЕР MARKDOWN (без зависимостей)
// Поддерживает: **bold**, _italic_, # h1, ## h2, ### h3, - list, 1. list,
// > quote, [text](url), `code`. Безопасный: HTML экранируется до обработки.
// =====================================================================

import { escapeHtml } from "../utils/files.js";

function mdInline(s) {
  let out = escapeHtml(s);
  // инлайн-код (до остального, чтобы не трогать содержимое)
  out = out.replaceAll(/`([^`]+)`/g, "<code>$1</code>");
  // жирный
  out = out.replaceAll(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // курсив
  out = out.replaceAll(/_([^_]+)_/g, "<em>$1</em>");
  // ссылки [text](url)
  out = out.replaceAll(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, txt, url) => {
    const safe = /^(https?:|mailto:|#|\/\/)/i.test(url) ? url : "#";
    return `<a href="${escapeHtml(safe)}" target="_blank" rel="noopener noreferrer">${txt}</a>`;
  });
  return out;
}

// Границы блочных элементов. Если строка матчит префикс без "хвоста"
// (например, "###" без пробела, или ">" один), это уже НЕ блок —
// а обычный символ текста. Раньше парсер зацикливался на таких случаях.
const BLOCK_RE = {
  heading: /^(#{1,3})\s+(.+)$/,
  quote:   /^>\s+(.+)$/,
  ul:      /^-\s+(.+)$/,
  ol:      /^\d+\.\s+(.+)$/,
};
const isAnyBlockPrefix = (s) =>
  BLOCK_RE.heading.test(s) || BLOCK_RE.quote.test(s) ||
  BLOCK_RE.ul.test(s)      || BLOCK_RE.ol.test(s);

// Собирает подряд идущие строки, пока test(line) истинно.
// Возвращает собранные строки (через map) и индекс первой несобранной.
function collect(lines, start, test, map = (line) => line) {
  const items = [];
  let index = start;
  while (index < lines.length && test(lines[index])) {
    items.push(map(lines[index]));
    index++;
  }
  return { items, next: index };
}

// Блоки, которые собираются из нескольких строк подряд.
const MULTILINE_BLOCKS = [
  { re: BLOCK_RE.quote, render: (items) => `<blockquote>${mdInline(items.join(" "))}</blockquote>` },
  { re: BLOCK_RE.ul, render: (items) => `<ul>${items.map((x) => `<li>${mdInline(x)}</li>`).join("")}</ul>` },
  { re: BLOCK_RE.ol, render: (items) => `<ol>${items.map((x) => `<li>${mdInline(x)}</li>`).join("")}</ol>` },
];

const isParagraphLine = (line) => Boolean(line.trim()) && !isAnyBlockPrefix(line);

// Разбирает один блок, начиная с lines[index]. Возвращает { html, next }.
function renderBlock(lines, index) {
  const line = lines[index];

  const h = line.match(BLOCK_RE.heading);
  if (h) {
    return { html: `<h${h[1].length}>${mdInline(h[2])}</h${h[1].length}>`, next: index + 1 };
  }

  const block = MULTILINE_BLOCKS.find(({ re }) => re.test(line));
  if (block) {
    const run = collect(lines, index, (l) => block.re.test(l), (l) => l.replace(block.re, "$1"));
    return { html: block.render(run.items), next: run.next };
  }

  // абзац — собираем строки пока не встретим пустую или начало блока
  const { items, next } = collect(lines, index, isParagraphLine);
  return { html: `<p>${mdInline(items.join(" "))}</p>`, next };
}

export function renderMarkdown(source) {
  if (!source) { return ""; }
  const lines = String(source).replaceAll(/\r\n?/g, "\n").split("\n");
  const blocks = [];
  let index = 0;
  while (index < lines.length) {
    if (lines[index].trim()) {
      const { html, next } = renderBlock(lines, index);
      blocks.push(html);
      index = next;
    } else {
      index++; // пустая строка — пропуск
    }
  }
  return blocks.join("\n");
}
