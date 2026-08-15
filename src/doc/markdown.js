// =====================================================================
// DOC · МИНИ-ПАРСЕР MARKDOWN (без зависимостей)
// Поддерживает: **bold**, _italic_, # h1, ## h2, ### h3, - list, 1. list,
// > quote, [text](url), `code`. Безопасный: HTML экранируется до обработки.
// =====================================================================

import { escapeHtml } from "../utils/files.js";

function mdInline(s) {
  let out = escapeHtml(s);
  // инлайн-код (до остального, чтобы не трогать содержимое)
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  // жирный
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // курсив
  out = out.replace(/_([^_]+)_/g, "<em>$1</em>");
  // ссылки [text](url)
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, txt, url) => {
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

export function renderMarkdown(src) {
  if (!src) return "";
  const lines = String(src).replace(/\r\n?/g, "\n").split("\n");
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // пустая строка — пропуск
    if (!line.trim()) { i++; continue; }

    // заголовки
    const h = line.match(BLOCK_RE.heading);
    if (h) {
      blocks.push(`<h${h[1].length}>${mdInline(h[2])}</h${h[1].length}>`);
      i++; continue;
    }

    // цитата (одна или несколько подряд)
    if (BLOCK_RE.quote.test(line)) {
      const buf = [];
      while (i < lines.length && BLOCK_RE.quote.test(lines[i])) {
        buf.push(lines[i].replace(BLOCK_RE.quote, "$1"));
        i++;
      }
      blocks.push(`<blockquote>${mdInline(buf.join(" "))}</blockquote>`);
      continue;
    }

    // маркированный список
    if (BLOCK_RE.ul.test(line)) {
      const buf = [];
      while (i < lines.length && BLOCK_RE.ul.test(lines[i])) {
        buf.push(lines[i].replace(BLOCK_RE.ul, "$1"));
        i++;
      }
      blocks.push("<ul>" + buf.map(x => `<li>${mdInline(x)}</li>`).join("") + "</ul>");
      continue;
    }

    // нумерованный список
    if (BLOCK_RE.ol.test(line)) {
      const buf = [];
      while (i < lines.length && BLOCK_RE.ol.test(lines[i])) {
        buf.push(lines[i].replace(BLOCK_RE.ol, "$1"));
        i++;
      }
      blocks.push("<ol>" + buf.map(x => `<li>${mdInline(x)}</li>`).join("") + "</ol>");
      continue;
    }

    // абзац — собираем строки пока не встретим пустую или начало блока
    const buf = [];
    while (i < lines.length && lines[i].trim() && !isAnyBlockPrefix(lines[i])) {
      buf.push(lines[i]);
      i++;
    }
    blocks.push(`<p>${mdInline(buf.join(" "))}</p>`);
  }
  return blocks.join("\n");
}
