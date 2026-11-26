(function () {
"use strict";

// ================= Описание разделов =================
const NS = "http://schemas.malighting.de/grandma2/xml/MA";
const POWER = ["сеть 220 В", "диммер", "батарея / аккумулятор", "драйвер 12/24 В", "по DMX с пульта", "другое"];
// Нужна ли направка (наводка вручную на свету): правила по названию прибора.
// Сначала проверяются приборы без ручной направки, затем с ней; остальное — «уточнить».
const FOCUS = ["нужна", "не нужна", "уточнить"];
const FOCUS_NO = /hazer|haze|fog|smoke|генератор|bulb|лампа|накал|moving|easy ?move|robe|\bmac\b|quantum|sharpy|pixel|strip|лента/i;
const FOCUS_YES = /source ?four|ellips|profile|prof\b|fresnel|\bpc\b|curva|\bpar\b|wash|fine|zoom|spot|follow|прожектор|линза/i;
const focusGuess = n => FOCUS_NO.test(n) ? FOCUS[1] : FOCUS_YES.test(n) ? FOCUS[0] : FOCUS[2];
const TABS = [["gen", "Общее"], ["light", "Свет"], ["video", "Видео"], ["sound", "Звук"], ["mount", "Монтировка"]];
const PARTS = { light: "Световой раздел", video: "Видеораздел", sound: "Звуковой раздел", mount: "Монтировочный раздел" };

// колонки списка: [ключ, подпись, тип (text | number | area | sel), подсказка / варианты]
const BLOCKS = [
  { id: "gen", tab: "gen", title: "Общие сведения", kind: "fields", fields: [
    ["title", "Название спектакля", "text", "например, «Снежная королева»"],
    ["venue", "Площадка", "text", "театр, зал, город"],
    ["date", "Дата редакции", "date"],
    ["duration", "Хронометраж", "text", "например, 1 ч 45 мин"],
    ["director", "Режиссёр", "text", "ФИО"],
    ["designer", "Художник-постановщик", "text", "ФИО"],
    ["lightDesigner", "Художник по свету", "text", "ФИО"],
    ["soundDesigner", "Звукорежиссёр", "text", "ФИО"],
    ["lightConsole", "Пульт света", "text", "grandMA2, ETC Eos, …"],
    ["soundConsole", "Пульт звука", "text", "модель"],
    ["logo", "Логотип театра", "logo"]] },
  { id: "notes", tab: "gen", title: "Заметки", kind: "fields", fields: [
    ["notes", "Свободный текст (Markdown: **жирный**, *курсив*, - список)", "md", ""]] },

  { id: "lightTime", tab: "light", title: "Направка", kind: "fields", fields: [
    ["focusTime", "Время на направку", "text", "например, 3 ч 20 мин", "tile"],
    ["focusPeople", "Количество людей на направку", "number", "", "tile"],
    ["focusNotes", "Примечания к направке", "area", ""]] },
  { id: "lamps", tab: "light", title: "Используемые световые приборы", kind: "list", photos: true, lead: "qty", total: ["qty", "шт."], fixtureImport: true, cols: [
    ["name", "Прибор / модель", "text", "Source Four 26°, Mac Quantum, …"],
    ["qty", "Кол-во", "number"], ["focus", "Направка", "sel", FOCUS],
    ["ch", "Каналы", "text"], ["patch", "Патч (DMX)", "text"], ["pos", "Позиция", "text", "штанга, галерея, пол"],
    ["info", "Гобо, фильтр, примечания", "area"]] },
  { id: "plotStd", tab: "light", title: "Стандартный развес зала (plot)", kind: "gallery", hint: "Стандартный plot площадки без довешиваемого оборудования" },
  { id: "focus", tab: "light", title: "Направка приборов", kind: "list", photos: true, fromLamps: true, cols: [
    ["name", "Прибор", "text", "Mac Quantum #5"], ["ch", "Канал", "text"], ["pos", "Позиция", "text", "FOH, 2-я штанга"],
    ["target", "Куда направлен", "text"], ["info", "Зум, фокус, шторки, примечания", "area"]] },
  { id: "decor", tab: "light", title: "Декорации со световыми приборами", kind: "list", photos: true, lead: "qty", cols: [
    ["decor", "Декорация", "text"], ["lamp", "Прибор", "text"], ["qty", "Кол-во", "number"],
    ["power", "Источник питания", "sel", POWER], ["info", "Примечания", "area"]] },
  { id: "extra", tab: "light", title: "Доставляемые приборы (относительно стандартного развеса)", kind: "list", photos: true, lead: "qty", total: ["qty", "шт."], cols: [
    ["name", "Прибор", "text"], ["qty", "Кол-во", "number"], ["pos", "Позиция", "text"],
    ["power", "Источник питания", "sel", POWER], ["why", "Для чего", "text"], ["info", "Примечания", "area"]] },
  { id: "plotExtra", tab: "light", title: "Plot доставляемых приборов", kind: "gallery", hint: "Схема расстановки доставляемых приборов" },
  { id: "lightCues", tab: "light", title: "Световая партитура", kind: "cues", ma2: true, lead: "num", cols: [
    ["num", "№", "text"], ["name", "Реплика / момент", "text", "например, Открытие"],
    ["info", "Описание света", "area"], ["trigger", "Триггер", "text", "Go / Follow / Time"],
    ["fade", "Fade, с", "text"], ["cmd", "Cmd", "area"]] },

  { id: "videoTime", tab: "video", title: "Настройка видео", kind: "fields", fields: [
    ["setupTime", "Время настройки видео", "text", "например, 1 ч 30 мин", "tile"],
    ["setupPeople", "Количество людей на настройку", "number", "", "tile"],
    ["server", "Медиасервер / ПО", "text", "Resolume, QLab, Watchout, …"],
    ["videoNotes", "Примечания", "area"]] },
  { id: "vequip", tab: "video", title: "Видеооборудование", kind: "list", photos: true, lead: "qty", total: ["qty", "шт."], cols: [
    ["name", "Устройство / модель", "text", "проектор, LED-экран, монитор, …"], ["qty", "Кол-во", "number"],
    ["pos", "Позиция", "text"], ["res", "Разрешение / яркость", "text"],
    ["power", "Источник питания", "sel", POWER], ["info", "Объектив, коммутация, примечания", "area"]] },
  { id: "vplot", tab: "video", title: "Схема видео (plot)", kind: "gallery", hint: "Расположение проекторов, экранов, мониторов, трассы кабелей" },
  { id: "vcontent", tab: "video", title: "Видеоконтент", kind: "list", cols: [
    ["name", "Ролик / файл", "text"], ["fmt", "Формат / кодек", "text"], ["dur", "Длительность", "text"],
    ["out", "Куда выводится", "text", "экран, проектор, монитор"], ["info", "Примечания", "area"]] },
  { id: "videoCues", tab: "video", title: "Видеопартитура", kind: "cues", lead: "num", cols: [
    ["num", "№", "text"], ["name", "Реплика / момент", "text"],
    ["info", "Что показываем", "area"], ["src", "Источник (файл, слой)", "text"], ["trigger", "Триггер", "text", "Go / Follow / Time"], ["dur", "Длительность", "text"]] },
  { id: "mics", tab: "sound", title: "Используемые микрофоны", kind: "list", photos: true, lead: "n", cols: [
    ["n", "№ канала", "text"], ["mic", "Микрофон / модель", "text"], ["who", "Кто / где", "text"],
    ["kind", "Тип", "sel", ["радио (петличка)", "радио (ручной)", "проводной", "головной", "подвесной", "напольный"]],
    ["freq", "Частота / приёмник", "text"], ["info", "Примечания", "area"]] },
  { id: "mons", tab: "sound", title: "Дополнительные мониторы", kind: "list", photos: true, lead: "qty", total: ["qty", "шт."], cols: [
    ["place", "Место", "text"], ["qty", "Кол-во", "number"], ["type", "Тип", "text"],
    ["mix", "Микс / шина", "text"], ["info", "Примечания", "area"]] },
  { id: "soundCues", tab: "sound", title: "Звуковая партитура", kind: "cues", lead: "num", cols: [
    ["num", "№ Q", "text"], ["name", "Реплика / момент", "text"], ["info", "Источник (трек, файл, микрофон)", "area"],
    ["level", "Уровень", "text"], ["dur", "Длительность", "text"]] },
  { id: "soundGal", tab: "sound", title: "Схемы и фото (звук)", kind: "gallery", hint: "Схема микрофонов, мониторов, коммутации" },

  { id: "layout", tab: "mount", title: "Схемы расстановки декораций", kind: "gallery", hint: "Общая расстановка, смены картин" },
  { id: "items", tab: "mount", title: "Список декораций", kind: "list", photos: true, lead: "qty", total: ["qty", "поз."], cols: [
    ["name", "Декорация", "text"], ["qty", "Кол-во", "number"], ["size", "Размеры, м", "text"],
    ["weight", "Вес, кг", "text"], ["mat", "Материал", "text"], ["info", "Примечания", "area"]] },
  { id: "mountTime", tab: "mount", title: "Монтаж", kind: "fields", fields: [
    ["setup", "Время монтажа", "text", "например, 2 ч 30 мин", "tile"],
    ["strike", "Время демонтажа", "text", "например, 1 ч 30 мин", "tile"],
    ["mountPeople", "Количество людей на монтаж", "number", "", "tile"],
    ["mountNotes", "Примечания", "area"]] },
  { id: "mountCues", tab: "mount", title: "Монтировочная партитура", kind: "cues", lead: "num", cols: [
    ["num", "№", "text"], ["name", "Реплика / момент", "text", "например, конец 1 картины"],
    ["info", "Что делается (смена декораций)", "area"], ["people", "Количество людей", "number"],
    ["who", "Кто", "text", "монтировщики, актёры"], ["time", "Время, сек", "text"]] },
  { id: "crew", tab: "mount", title: "Люди для ведения спектакля", kind: "list", lead: "qty", total: ["qty", "чел."], cols: [
    ["role", "Должность / участок", "text"], ["qty", "Кол-во", "number"],
    ["duty", "Что делает", "text"], ["info", "Примечания", "area"]] },
];
BLOCKS.forEach((b, i) => (b.n = i + 1));
const BLOCK = Object.fromEntries(BLOCKS.map(b => [b.id, b]));

// ================= Состояние =================
let P = blank();
const UI = { tab: "gen", open: new Set(), search: {} };
function blank() { return { v: 1, f: {}, l: {}, gal: {} }; }
const uid = () => Math.random().toString(36).slice(2, 9);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const $ = (s, r = document) => r.querySelector(s);
const F = id => P.f[id] || (P.f[id] = {});
const L = id => P.l[id] || (P.l[id] = []);
const G = id => P.gal[id] || (P.gal[id] = []);

// ================= Хранение (IndexedDB) =================
function idb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open("passport2", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("kv");
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
async function dbLoad() {
  try {
    const db = await idb();
    return await new Promise((res, rej) => { const q = db.transaction("kv").objectStore("kv").get("p"); q.onsuccess = () => res(q.result || null); q.onerror = () => rej(q.error); });
  } catch (e) { return null; }
}
let saveTimer, saveState = "ok";
function touch() {
  setSaved("wait");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      const db = await idb(), tx = db.transaction("kv", "readwrite");
      tx.objectStore("kv").put(P, "p");
      tx.oncomplete = () => setSaved("ok"); tx.onerror = () => setSaved("err");
    } catch (e) { setSaved("err"); }
  }, 500);
  schedulePreview();
}
function setSaved(s) {
  saveState = s;
  const b = $("#saved"); if (!b) return;
  b.className = "bdg bdg--" + (s === "ok" ? "ok" : s === "wait" ? "warn" : "err");
  b.innerHTML = '<span class="bdg__dot"></span>' + (s === "ok" ? "Сохранено локально" : s === "wait" ? "Сохраняется…" : "Не сохранено");
}

// ================= Изображения =================
function readImage(file) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onerror = () => rej(fr.error);
    fr.onload = () => {
      const im = new Image();
      im.onerror = () => rej(new Error("не изображение: " + file.name));
      im.onload = () => {
        // до 4000 px и ~6 МБ — без потерь, крупнее — уменьшаем (JPEG 95%)
        const k = Math.min(1, 4000 / Math.max(im.width, im.height));
        if (k === 1 && fr.result.length < 8e6) return res({ src: fr.result, w: im.width, h: im.height });
        const c = document.createElement("canvas");
        c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
        const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height);
        res({ src: c.toDataURL("image/jpeg", .95), w: c.width, h: c.height });
      };
      im.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
}
async function readImages(files) {
  const out = [];
  for (const f of files) { try { out.push(await readImage(f)); } catch (e) { toast("err", "Не удалось обработать файл: " + e.message); } }
  return out;
}

// PDF → картинки (pdf.js встроен в страницу и подключается при первом использовании)
let pdfLib;
function loadPdfjs() {
  if (pdfLib) return pdfLib;
  (0, eval)($("#pdfjs-lib").textContent);
  pdfLib = window["pdfjs-dist/build/pdf"];
  pdfLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(new Blob([$("#pdfjs-worker").textContent], { type: "text/javascript" }));
  return pdfLib;
}
async function readPdf(file) {
  // pdf.js рисует через requestAnimationFrame, который не срабатывает в фоновой вкладке, — подменяем на таймер
  const raf = window.requestAnimationFrame;
  window.requestAnimationFrame = cb => setTimeout(() => cb(performance.now()), 0);
  try { return await readPdfPages(file); } finally { window.requestAnimationFrame = raf; }
}
async function readPdfPages(file) {
  const doc = await loadPdfjs().getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise, out = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n), v1 = page.getViewport({ scale: 1 });
    const vp = page.getViewport({ scale: Math.min(4, 4000 / Math.max(v1.width, v1.height)) });
    const c = document.createElement("canvas"); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
    const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height);
    await page.render({ canvasContext: x, viewport: vp }).promise;
    let src = c.toDataURL("image/png"); if (src.length > 8e6) src = c.toDataURL("image/jpeg", .95);
    out.push({ src, w: c.width, h: c.height });
  }
  return out;
}

// Импорт «Fixture Groups Report» (HTML из Capture): каналы → приборы с количеством и патчем
async function importFixtures(b, file) {
  try {
    const d = new DOMParser().parseFromString(await file.text(), "text/html"), groups = new Map();
    d.querySelectorAll("tr").forEach(tr => {
      const c = [...tr.children].map(x => x.textContent.trim());
      if (c.length !== 3 || !/^\d+$/.test(c[0])) return;
      if (!groups.has(c[1])) groups.set(c[1], []);
      groups.get(c[1]).push([+c[0], c[2]]);
    });
    if (!groups.size) return toast("err", "В файле нет таблицы приборов (Channel / Name / Patch Channel).");
    const head = [...(d.querySelector("table")?.querySelectorAll("td") || [])].map(x => x.textContent.trim()).filter(Boolean);
    const g = F("gen");
    if (!String(g.title || "").trim() && head[0]) g.title = head[0].replace(/\s*Fixture Groups Report\s*$/i, "").replace(/^спектакль\s*/i, "").replace(/^["«]|["»]$/g, "");
    if (!String(g.venue || "").trim() && head[1]) g.venue = head[1];
    const rows = L(b), st = { "нужна": 0, "не нужна": 0, "уточнить": 0 };
    for (const [name, list] of groups) {
      list.sort((a, c) => a[0] - c[0]);
      const upd = { qty: String(list.length), ch: list.map(x => x[0]).join(", "), patch: list.map(x => x[1]).join(", ") };
      const row = rows.find(r => r.name === name) || (rows.push({ id: uid(), name, focus: focusGuess(name) }), rows[rows.length - 1]);
      Object.assign(row, upd); if (!row.focus) row.focus = focusGuess(name);
      st[row.focus] = (st[row.focus] || 0) + list.length;
    }
    touch(); renderEditor();
    toast("ok", `Импортировано ${groups.size} типов приборов. Направка: ${st["нужна"]} шт. нужна, ${st["не нужна"]} не нужна, ${st["уточнить"]} уточнить`);
  } catch (e) { toast("err", "Ошибка чтения файла: " + e.message); }
}
// строки «Направки приборов» — по одной на канал каждого прибора, которому она нужна
function fillFocus(b) {
  const rows = L(b), have = new Set(rows.map(r => r.name + "|" + r.ch)); let n = 0;
  L("lamps").filter(l => l.focus !== "не нужна").forEach(l => {
    const chs = String(l.ch || "").split(/[,;\s]+/).filter(Boolean);
    (chs.length ? chs : [""]).forEach(ch => { if (!have.has(l.name + "|" + ch)) { rows.push({ id: uid(), name: l.name, ch }); n++; } });
  });
  touch(); renderEditor();
  toast(n ? "ok" : "warn", n ? `Добавлено строк направки: ${n}` : "Новых приборов для направки нет — сначала заполните список приборов.");
}

// ================= Редактор =================
function renderEditor() {
  const ed = $("#editor"), top = ed.scrollTop;
  let h = '<div class="tabs">' + TABS.map(([id, n]) => `<button class="chip${UI.tab === id ? " is-on" : ""}" data-act="tab" data-tab="${id}">${n}</button>`).join("") + "</div>";
  BLOCKS.filter(b => b.tab === UI.tab).forEach(b => { h += `<div class="editor__group">${editorBlock(b)}</div>`; });
  ed.innerHTML = h; ed.scrollTop = top;
}
function editorBlock(b) {
  let meta = "";
  if (b.kind === "list" || b.kind === "cues") meta = String(L(b.id).length);
  if (b.kind === "gallery") meta = String(G(b.id).length);
  let h = `<div class="editor__title"><span class="num">${b.n}</span>${esc(b.title)}<span class="editor__title-meta">${meta}</span></div><div class="editor__stack">`;
  if (b.kind === "fields") h += fieldsEditor(b);
  else if (b.kind === "gallery") h += galleryEditor(b);
  else h += listEditor(b);
  return h + "</div>";
}
function fieldsEditor(b) {
  const o = F(b.id);
  return b.fields.map(([k, l, t, ph]) => {
    if (t === "logo") {
      const lg = o.logo;
      return `<div class="field"><span class="field__label">${l}</span>` +
        (lg ? `<div class="logo-preview"><img class="logo-preview__img" src="${lg.src}"><button class="btn btn--danger btn--sm" data-act="logo-del">Удалить</button></div>`
          : `<label class="btn btn--ghost btn--sm" style="align-self:flex-start">Загрузить логотип<input type="file" accept="image/*" hidden data-act="logo"></label>`) +
        `<div class="field__hint">PNG / SVG · показывается вверху и в нижнем колонтитуле документа</div></div>`;
    }
    const a = `data-b="${b.id}" data-k="${k}" placeholder="${esc(ph || "")}"`;
    const v = esc(o[k]);
    const inp = t === "area" || t === "md" ? `<textarea class="textarea" ${a} style="min-height:${t === "md" ? 160 : 60}px">${v}</textarea>`
      : `<input class="input" type="${t === "number" ? "number" : t === "date" ? "date" : "text"}" ${a} value="${v}">`;
    return `<label class="field"><span class="field__label">${l}</span>${inp}</label>`;
  }).join("");
}
function galleryEditor(b) {
  const items = G(b.id);
  let h = `<div class="field__hint">${esc(b.hint || "")}</div>` +
    `<label class="drop" data-drop="${b.id}"><div class="drop__i">⬆</div>Перетащите файлы сюда или нажмите для выбора<div class="drop__hint field__hint">PDF / JPG / PNG · несколько файлов (каждая страница PDF станет картинкой)</div><input type="file" accept="image/*,.pdf,application/pdf" multiple data-act="gal-add" data-b="${b.id}"></label>`;
  if (items.length) {
    h += '<div class="photo-list">' + items.map((p, i) => `<div class="photo-card"><img class="photo-card__img" src="${p.src}">` +
      `<div class="photo-card__body"><input class="input" data-b="${b.id}" data-gi="${i}" data-k="tag" placeholder="Прибор / позиция" value="${esc(p.tag)}">` +
      `<input class="input" data-b="${b.id}" data-gi="${i}" data-k="cap" placeholder="Подпись (опционально)" value="${esc(p.cap)}">` +
      `<div class="photo-card__actions"><button class="btn btn--ghost btn--sm" data-act="gal-up" data-b="${b.id}" data-i="${i}" ${i ? "" : "disabled"}>↑</button>` +
      `<button class="btn btn--ghost btn--sm" data-act="gal-dn" data-b="${b.id}" data-i="${i}" ${i < items.length - 1 ? "" : "disabled"}>↓</button>` +
      `<button class="btn btn--danger btn--sm" data-act="gal-del" data-b="${b.id}" data-i="${i}">Удалить</button></div></div></div>`).join("") + "</div>";
  }
  return h;
}
function listEditor(b) {
  const rows = L(b.id), q = (UI.search[b.id] || "").toLowerCase();
  let h = "";
  if (b.kind === "cues" && rows.length > 5)
    h += `<input class="input cue-search" data-search="${b.id}" placeholder="Поиск (номер, название, описание)" value="${esc(UI.search[b.id] || "")}">`;
  const shown = rows.map((r, i) => [r, i]).filter(([r]) => !q || b.cols.some(c => String(r[c[0]] ?? "").toLowerCase().includes(q)));
  if (!rows.length) h += `<div class="empty"><div class="empty__t">Список пуст</div><div class="empty__p">Нажмите «Добавить», чтобы внести первую строку.</div></div>`;
  else h += '<div class="cue-list">' + shown.map(([r, i]) => rowHtml(b, r, i, rows.length)).join("") + "</div>";
  h += `<div class="tools"><button class="btn btn--ghost btn--sm" data-act="row-add" data-b="${b.id}">+ Добавить</button>`;
  if (b.fixtureImport) h += `<label class="btn btn--ghost btn--sm" title="Capture: Fixture Groups Report">Импорт приборов (HTML)<input type="file" accept=".htm,.html" hidden data-act="fixtures" data-b="${b.id}"></label>`;
  if (b.fromLamps) h += `<button class="btn btn--ghost btn--sm" data-act="focus-fill" data-b="${b.id}">Заполнить из списка приборов</button>`;
  if (b.ma2) h +=`<label class="btn btn--ghost btn--sm" title="Sequence → Export → XML">Импорт из MA2 XML<input type="file" accept=".xml" hidden data-act="ma2" data-b="${b.id}"></label>`;
  if (b.total) { const s = rows.reduce((a, r) => a + (parseFloat(r[b.total[0]]) || 0), 0); if (s) h += `<span class="total">Всего: ${s} ${b.total[1]}</span>`; }
  return h + "</div>";
}
function rowHtml(b, r, i, n) {
  const open = UI.open.has(r.id);
  const main = r[b.cols[0][0]] ?? "", second = b.cols[1] && b.lead !== b.cols[1][0] ? r[b.cols[1][0]] : "";
  const lead = b.lead ? r[b.lead] : i + 1;
  let h = `<div class="lrow${open ? " is-open" : ""}"><button class="lrow__head" data-act="toggle" data-id="${r.id}"><span class="lrow__lead">${esc(lead || i + 1)}</span>` +
    `<span class="lrow__prev">${esc(b.lead === b.cols[0][0] ? (r[b.cols[1][0]] || r[b.cols[2] ? b.cols[2][0] : ""] || "") : main) || "<i>— без названия —</i>"}${second && b.lead !== b.cols[0][0] ? ` <i>· ${esc(second)}</i>` : ""}</span><span class="lrow__chev">${open ? "▾" : "▸"}</span></button>`;
  if (open) {
    h += '<div class="lrow__body"><div class="lrow__grid">' + b.cols.map(([k, l, t, o], ci) => {
      const a = `data-b="${b.id}" data-id="${r.id}" data-k="${k}"`;
      const wide = t === "area" || (ci === 0 && b.cols.length > 2) || k === "name";
      let inp;
      if (t === "area") inp = `<textarea class="textarea" ${a}>${esc(r[k])}</textarea>`;
      else if (t === "sel") inp = `<input class="input" list="dl-${b.id}-${k}" ${a} value="${esc(r[k])}"><datalist id="dl-${b.id}-${k}">${o.map(x => `<option value="${esc(x)}">`).join("")}</datalist>`;
      else inp = `<input class="input" type="${t === "number" ? "number" : "text"}" ${a} placeholder="${esc(o || "")}" value="${esc(r[k])}">`;
      return `<label class="field${wide ? " is-wide" : ""}"><span class="field__label">${l}</span>${inp}</label>`;
    }).join("") + "</div>";
    if (b.photos) {
      h += '<div class="lrow__photos">' + (r.photos || []).map((p, j) => `<span class="thumb"><img src="${p.src}" data-act="ph-view" data-b="${b.id}" data-id="${r.id}" data-j="${j}"><button title="Удалить фото" data-act="ph-del" data-b="${b.id}" data-id="${r.id}" data-j="${j}">×</button></span>`).join("") +
        `<label class="btn btn--ghost btn--sm">+ фото<input type="file" accept="image/*" multiple hidden data-act="ph-add" data-b="${b.id}" data-id="${r.id}"></label></div>`;
    }
    h += `<div class="lrow__actions"><button class="btn btn--ghost btn--sm" data-act="row-up" data-b="${b.id}" data-id="${r.id}" ${i ? "" : "disabled"}>↑</button>` +
      `<button class="btn btn--ghost btn--sm" data-act="row-dn" data-b="${b.id}" data-id="${r.id}" ${i < n - 1 ? "" : "disabled"}>↓</button>` +
      `<button class="btn btn--danger btn--sm" data-act="row-del" data-b="${b.id}" data-id="${r.id}">Удалить</button></div></div>`;
  }
  return h + "</div>";
}

// ================= События редактора =================
const rowOf = (b, id) => L(b).find(r => r.id === id);
function move(arr, i, d) { const j = i + d; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; }

function onInput(e) {
  const t = e.target;
  if (t.dataset.search) { UI.search[t.dataset.search] = t.value; const pos = t.selectionStart; renderEditor(); const n = $(`[data-search="${t.dataset.search}"]`); n.focus(); n.setSelectionRange(pos, pos); return; }
  const { b, k, id, gi } = t.dataset;
  if (!b || !k) return;
  if (gi !== undefined) G(b)[+gi][k] = t.value;
  else if (id) { const r = rowOf(b, id); if (r) r[k] = t.value; }
  else F(b)[k] = t.value;
  touch();
}
async function onChange(e) {
  const t = e.target, act = t.dataset.act;
  if (!act || t.type !== "file") return;
  const files = [...t.files]; t.value = "";
  if (!files.length) return;
  if (act === "logo") { const [im] = await readImages(files); if (im) { F("gen").logo = im; touch(); renderEditor(); } }
  else if (act === "gal-add") { addGallery(t.dataset.b, files); }
  else if (act === "ph-add") { const r = rowOf(t.dataset.b, t.dataset.id); const ims = await readImages(files); if (r) { (r.photos = r.photos || []).push(...ims); touch(); renderEditor(); } }
  else if (act === "ma2") importMa2(t.dataset.b, files[0]);
  else if (act === "fixtures") importFixtures(t.dataset.b, files[0]);
}
async function addGallery(b, files) {
  toast("ok", "Обработка…");
  for (const f of files) {
    const base = f.name.replace(/\.[^.]+$/, "");
    try {
      const ims = /\.pdf$/i.test(f.name) || f.type === "application/pdf" ? await readPdf(f) : await readImages([f]);
      ims.forEach((im, i) => G(b).push({ ...im, cap: ims.length > 1 ? `${base} — стр. ${i + 1}` : base, tag: "" }));
    } catch (e) { toast("err", `Не удалось обработать ${f.name}: ${e.message}`); }
  }
  touch(); renderEditor();
}
function onClick(e) {
  const t = e.target.closest("[data-act]"); if (!t || t.tagName === "INPUT") return;
  const { act, b, id } = t.dataset, i = +t.dataset.i;
  if (act === "focus-fill") return fillFocus(b);
  if (act === "ph-view") { const p = rowOf(b, id).photos[+t.dataset.j]; LB = [{ src: p.src, cap: "" }]; return openLb(0); }
  if (act === "tab") { UI.tab = t.dataset.tab; renderEditor(); $("#editor").scrollTop = 0; return; }
  if (act === "toggle") { UI.open.has(id) ? UI.open.delete(id) : UI.open.add(id); renderEditor(); return; }
  if (act === "row-add") { const r = { id: uid() }; const rows = L(b); const bl = BLOCK[b];
    if (bl.kind === "cues" && rows.length) { const nn = parseFloat(rows[rows.length - 1].num); if (!isNaN(nn)) r.num = String(Math.floor(nn) + 1); }
    rows.push(r); UI.open.add(r.id); touch(); renderEditor(); return; }
  if (act === "row-del") { const rows = L(b); rows.splice(rows.findIndex(r => r.id === id), 1); touch(); renderEditor(); return; }
  if (act === "row-up" || act === "row-dn") { const rows = L(b); move(rows, rows.findIndex(r => r.id === id), act === "row-up" ? -1 : 1); touch(); renderEditor(); return; }
  if (act === "ph-del") { rowOf(b, id).photos.splice(+t.dataset.j, 1); touch(); renderEditor(); return; }
  if (act === "gal-del") { G(b).splice(i, 1); touch(); renderEditor(); return; }
  if (act === "gal-up" || act === "gal-dn") { move(G(b), i, act === "gal-up" ? -1 : 1); touch(); renderEditor(); return; }
  if (act === "logo-del") { delete F("gen").logo; touch(); renderEditor(); return; }
}
function onDrop(e) {
  const z = e.target.closest("[data-drop]"); if (!z) return;
  e.preventDefault(); z.classList.remove("is-drag");
  if (e.type === "drop") addGallery(z.dataset.drop, [...e.dataTransfer.files]);
}

// ================= Импорт MA2 XML =================
async function importMa2(b, file) {
  try {
    const xml = new DOMParser().parseFromString(await file.text(), "application/xml");
    if (xml.querySelector("parsererror")) return toast("err", "Невалидный XML");
    const get = (e, n) => e.getElementsByTagNameNS(NS, n);
    const cues = [];
    for (const c of get(xml, "Cue")) {
      if (c.getAttribute("xsi:nil") === "true") continue;
      const nm = get(c, "Number")[0]; if (!nm) continue;
      const num = Number(nm.getAttribute("number")); if (isNaN(num)) continue;
      let info = ""; const ii = get(c, "InfoItems")[0], inf = ii && get(ii, "Info")[0];
      if (inf) info = [...inf.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).filter(Boolean).join(" ");
      let cmd = ""; for (const p of get(c, "CuePart")) { const m = get(p, "macro_text")[0]; if (m && m.textContent.trim()) { cmd = m.textContent.trim(); break; } }
      const part = get(c, "CuePart")[0], fb = part && part.getAttribute("basic_fade");
      const tr = get(c, "Trigger")[0], tt = tr && tr.getAttribute("type");
      cues.push({ id: uid(), num: String(num), name: "", info, cmd, fade: fb ? String(Number(fb)) : "", trigger: !tt ? "Go" : tt === "Time" ? ("Time " + (tr.getAttribute("data_f") || "")).trim() : tt, _n: num });
    }
    if (!cues.length) return toast("err", "В XML не найдено ни одного <Cue>. Нужен экспорт sequence, а не fixture library.");
    cues.sort((a, c) => a._n - c._n); cues.forEach(c => delete c._n);
    if (L(b).length && confirm("В списке уже есть сцены. Заменить их импортированными? (Отмена — добавить в конец)")) P.l[b] = cues; else L(b).push(...cues);
    touch(); renderEditor(); toast("ok", `Импортировано ${cues.length} сцен из MA2 XML`);
  } catch (e) { toast("err", "Ошибка чтения файла: " + e.message); }
}

// ================= Предпросмотр документа =================
let LB = [], previewTimer;
function schedulePreview() { clearTimeout(previewTimer); previewTimer = setTimeout(renderPreview, 250); }
const nl = s => esc(s).replace(/\n/g, "<br>");
function md(src) {
  const inl = t => t.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>").replace(/`(.+?)`/g, "<code>$1</code>");
  let out = "", list = null, para = [];
  const flushP = () => { if (para.length) out += "<p>" + inl(para.join("<br>")) + "</p>"; para = []; };
  const flushL = () => { if (list) out += "<ul>" + list.map(x => "<li>" + inl(x) + "</li>").join("") + "</ul>"; list = null; };
  for (const ln of esc(src).split("\n")) {
    let m;
    if (!ln.trim()) { flushP(); flushL(); }
    else if ((m = ln.match(/^(#{1,3}) (.*)/))) { flushP(); flushL(); out += `<h${m[1].length}>${inl(m[2])}</h${m[1].length}>`; }
    else if ((m = ln.match(/^[-*] (.*)/))) { flushP(); (list = list || []).push(m[1]); }
    else if ((m = ln.match(/^&gt; ?(.*)/))) { flushP(); flushL(); out += `<blockquote>${inl(m[1])}</blockquote>`; }
    else { flushL(); para.push(ln); }
  }
  flushP(); flushL(); return out;
}
function img(p, cls) { LB.push({ src: p.src, cap: [p.tag, p.cap].filter(Boolean).join(" · ") }); return `<img class="${cls}" src="${p.src}" data-lb="${LB.length - 1}" style="aspect-ratio:${p.w || 1}/${p.h || 1}">`; }

function docBlock(b) {
  if (b.kind === "fields") {
    const o = F(b.id), has = b.fields.filter(f => f[2] !== "logo" && String(o[f[0]] ?? "").trim());
    if (!has.length) return "";
    const tiles = has.filter(f => f[4] === "tile"), rest = has.filter(f => f[4] !== "tile");
    let h = "";
    if (tiles.length) h += '<div class="doc__times">' + tiles.map(f => `<div class="doc__time"><div class="doc__time-l">${esc(f[1])}</div><div class="doc__time-v">${esc(o[f[0]])}</div></div>`).join("") + "</div>";
    if (b.id === "notes") return `<div class="doc__commentary">${md(o.notes)}</div>`;
    if (rest.length) h += '<table class="doc__table"><tbody>' + rest.map(f => `<tr><th style="width:34%">${esc(f[1])}</th><td class="pre">${esc(o[f[0]])}</td></tr>`).join("") + "</tbody></table>";
    return h;
  }
  if (b.kind === "gallery") {
    const g = G(b.id); if (!g.length) return "";
    // схемы и plot — каждая картинка на всю ширину страницы
    return '<div class="doc__plots">' + g.map(p => `<figure class="doc__plot-full">${img(p, "doc__plot-img")}` +
      (p.tag || p.cap ? `<figcaption class="doc__tile-cap">${p.tag ? `<span class="doc__tile-tag">${esc(p.tag)}</span>` : ""}${p.cap ? `<span>${esc(p.cap)}</span>` : ""}</figcaption>` : "") + "</figure>").join("") + "</div>";
  }
  const rows = L(b.id).filter(r => b.cols.some(c => String(r[c[0]] ?? "").trim()) || (r.photos || []).length);
  if (!rows.length) return "";
  // пустые столбцы в документ не выводим
  const cols = b.cols.filter(c => rows.some(r => String(r[c[0]] ?? "").trim()));
  const idx = b.kind !== "cues"; // в партитурах свой столбец с номером
  let h = '<table class="doc__table"><thead><tr>' + (idx ? "<th>№</th>" : "") + cols.map(c => `<th${c[2] === "number" ? ' class="doc__num"' : ""}>${esc(c[1])}</th>`).join("") + "</tr></thead>";
  const span = cols.length + (idx ? 1 : 0);
  rows.forEach((r, i) => {
    const n = (r.photos || []).length;
    // фото строки — отдельной строкой на всю ширину таблицы, в натуральных пропорциях
    h += `<tbody class="doc__grp"><tr>` + (idx ? `<td>${i + 1}</td>` : "") + cols.map(c => `<td class="${c[2] === "number" ? "doc__num" : c[2] === "area" ? "pre" : ""}">${esc(r[c[0]])}</td>`).join("") + "</tr>" +
      (n ? `<tr class="doc__photos"><td colspan="${span}"><div class="doc__pgrid doc__pgrid--${Math.min(n, 2)}">${r.photos.map(p => img(p, "doc__photo")).join("")}</div></td></tr>` : "") + "</tbody>";
  });
  if (b.total) { const s = rows.reduce((a, r) => a + (parseFloat(r[b.total[0]]) || 0), 0); if (s) h += `<tfoot><tr><td colspan="${span}">Всего: ${s} ${b.total[1]}</td></tr></tfoot>`; }
  return h + "</table>";
}
function docHtml() {
  LB = [];
  const g = F("gen"), val = k => String(g[k] ?? "").trim();
  const by = [["Режиссёр", "director"], ["Художник", "designer"], ["Свет", "lightDesigner"], ["Звук", "soundDesigner"], ["Пульт света", "lightConsole"], ["Пульт звука", "soundConsole"], ["Хронометраж", "duration"], ["Редакция", "date"]]
    .filter(([, k]) => val(k)).map(([l, k]) => `<div class="doc__byline-row"><span class="doc__byline-k">${l}</span><span class="doc__byline-v">${esc(k === "date" ? fmtDate(g[k]) : g[k])}</span></div>`).join("");
  let h = '<div class="doc__head">' + (g.logo ? `<img class="doc__logo" src="${g.logo.src}">` : "") + '<div class="doc__kick">паспорт спектакля</div><div class="doc__show-label">Спектакль</div>' +
    `<h1 class="doc__title">${val("title") ? "«" + esc(g.title) + "»" : "Без названия"}</h1>` +
    (val("venue") ? `<div class="doc__byline-row doc__byline-row--venue"><span class="doc__byline-k">Площадка</span><span class="doc__byline-v">${esc(g.venue)}</span></div>` : "") +
    (by ? `<div class="doc__byline">${by}</div>` : "") + "</div>";
  let part = null, any = false;
  BLOCKS.filter(b => b.id !== "gen" && b.id !== "notes").forEach(b => {
    const body = docBlock(b); if (!body) return;
    if (b.tab !== part) { part = b.tab; h += `<h2 class="doc__part">${PARTS[b.tab]}</h2>`; }
    h += `<section class="doc__sec2${b.kind === "gallery" ? " doc__sec2--plot" : ""}"><h3 class="doc__h3">${esc(b.title)}</h3>${body}</section>`; any = true;
  });
  const notes = docBlock(BLOCK.notes);
  if (notes) { h += `<h2 class="doc__part">Заметки</h2>${notes}`; any = true; }
  if (!any) h += '<p class="doc__empty-hint">Документ пуст — заполняйте разделы слева.</p>';
  h += '<div class="doc__foot"><span class="doc__foot-name">' + esc(val("title")) + " · паспорт спектакля</span>" + (g.logo ? `<img class="doc__foot-logo" src="${g.logo.src}">` : "") + "</div>";
  return h;
}
function fmtDate(s) { const m = String(s).match(/^(\d{4})-(\d\d)-(\d\d)$/); return m ? `${m[3]}.${m[2]}.${m[1]}` : s; }
function renderPreview() {
  $("#doc").innerHTML = docHtml();
  const t = String(F("gen").title || "").trim();
  document.title = t ? `Паспорт спектакля · ${t}` : "Паспорт спектакля";
  $("#meta").textContent = t || "без названия";
}

// ================= Лайтбокс =================
let lbI = 0;
function openLb(i) {
  lbI = i; const d = $("#lb"), x = LB[i]; if (!x) return;
  $("#lb-img").src = x.src; $("#lb-cap").textContent = x.cap + (LB.length > 1 ? `  ${i + 1} / ${LB.length}` : "");
  $("#lb-prev").hidden = $("#lb-next").hidden = LB.length < 2;
  if (!d.open) d.showModal();
}

// ================= Файлы проекта =================
const slug = () => (F("gen").title || "паспорт").replace(/[\\/:*?"<>|]+/g, "").trim() || "паспорт";
function download(name, text, type) {
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function exportHtml() {
  renderPreview();
  const c = document.documentElement.cloneNode(true);
  c.querySelector("#root").innerHTML = "";
  c.querySelectorAll("#project-data,.toaster,dialog").forEach(n => n.remove());
  const s = document.createElement("script"); s.type = "application/json"; s.id = "project-data";
  s.textContent = JSON.stringify({ app: "passport", format: 1, project: P }).replace(/</g, "\\u003c");
  c.querySelector("body").appendChild(s);
  download(`Паспорт ${slug()}.html`, "<!DOCTYPE html>\n" + c.outerHTML, "text/html");
}
function adopt(p) {
  if (!p || typeof p !== "object") throw new Error("нет данных проекта");
  P = { v: 1, f: p.f || {}, l: p.l || {}, gal: p.gal || {} };
  UI.open.clear(); UI.search = {}; touch(); renderEditor(); renderPreview();
}
async function openFile(file) {
  try {
    const text = await file.text();
    if (/\.json$/i.test(file.name)) { const j = JSON.parse(text); return adopt(j.project || j), toast("ok", `Открыт проект из «${file.name}»`); }
    const n = new DOMParser().parseFromString(text, "text/html").querySelector("#project-data");
    if (!n) return toast("err", "В этом файле нет данных проекта. Открыть можно только HTML, скачанный из этой программы.");
    adopt(JSON.parse(n.textContent).project); toast("ok", `Открыт проект из «${file.name}»`);
  } catch (e) { toast("err", "Не удалось открыть файл: " + e.message); }
}

// ================= Интерфейс =================
function toast(kind, msg) {
  const w = $(".toaster"), d = document.createElement("div");
  d.className = "toaster__item toast toast--" + kind;
  d.innerHTML = `<span class="toast__i">${kind === "ok" ? "✓" : "!"}</span><span class="toaster__msg">${esc(msg)}</span>`;
  w.appendChild(d); setTimeout(() => d.remove(), 5000);
}
const THEMES = [["graphite", "Графит"], ["midnight", "Полночь"], ["tungsten", "Вольфрам"], ["light", "Светлая"], ["paper", "Бумага"]];
const FONTS = [["sans", "Без засечек"], ["serif", "С засечками"]];
function pref(key, val) { try { localStorage.setItem(key, val); } catch (e) { /* без хранилища тема не запоминается */ } }
function menuHtml() {
  const cur = document.documentElement.dataset;
  return `<div class="menu__list" hidden>` +
    `<div class="menu__heading">Проект</div><button class="menu__item" data-m="new">Новый проект</button>` +
    `<label class="menu__item">Открыть HTML / JSON…<input type="file" accept=".html,.json" hidden data-m-open></label>` +
    `<button class="menu__item" data-m="html">Скачать HTML</button><button class="menu__item" data-m="json">Скачать JSON</button><button class="menu__item" data-m="print">Печать / PDF</button>` +
    `<div class="menu__sep"></div><div class="menu__heading">Тема</div>` + THEMES.map(([k, n]) => `<button class="menu__item${cur.theme === k ? " is-checked" : ""}" data-theme="${k}">${n}</button>`).join("") +
    `<div class="menu__sep"></div><div class="menu__heading">Шрифт</div>` + FONTS.map(([k, n]) => `<button class="menu__item${cur.font === k ? " is-checked" : ""}" data-font="${k}">${n}</button>`).join("") + "</div>";
}
function shell() {
  $("#root").innerHTML = `<div class="app"><header class="topbar"><span class="topbar__logo">Паспорт<b>·</b>спектакля</span><span class="topbar__sep"></span>` +
    `<span class="topbar__meta" id="meta"></span><span class="topbar__spacer"></span><span id="saved" class="bdg bdg--ok"></span>` +
    `<div class="topbar__actions"><div class="menu" id="menu"><button class="btn btn--ghost btn--sm" data-m="menu">Меню ▾</button>${menuHtml()}</div>` +
    `<button class="btn btn--primary btn--sm" data-m="print">Печать / PDF</button></div></header>` +
    `<div class="work"><aside class="editor" id="editor"></aside><div class="preview-wrap"><div class="preview-frame"><div class="doc" id="doc"></div></div></div></div></div>` +
    `<div class="toaster"></div>` +
    `<dialog class="lightbox" id="lb"><img class="lightbox__img" id="lb-img"><div class="lightbox__cap" id="lb-cap"></div>` +
    `<button class="lightbox__close" id="lb-x">×</button><button class="lightbox__nav lightbox__nav--prev" id="lb-prev">‹</button><button class="lightbox__nav lightbox__nav--next" id="lb-next">›</button></dialog>`;
  setSaved(saveState);
}
function onTop(e) {
  const t = e.target.closest("[data-m],[data-theme],[data-font]"); if (!t) { $("#menu .menu__list").hidden = true; return; }
  const m = t.dataset.m, list = $("#menu .menu__list");
  if (m === "menu") { list.hidden = !list.hidden; return; }
  if (t.dataset.theme) { document.documentElement.dataset.theme = t.dataset.theme; pref("tld.theme.v1", t.dataset.theme); }
  else if (t.dataset.font) { document.documentElement.dataset.font = t.dataset.font; pref("tld.font.v1", t.dataset.font); }
  else if (m === "new") { if (confirm("Начать новый проект? Текущий будет удалён из браузера — сначала скачайте его как HTML.")) { P = blank(); UI.open.clear(); touch(); renderEditor(); renderPreview(); } }
  else if (m === "html") exportHtml();
  else if (m === "json") download(`Паспорт ${slug()}.json`, JSON.stringify({ app: "passport", format: 1, project: P }), "application/json");
  else if (m === "print") { renderPreview(); window.print(); }
  if (t.dataset.theme || t.dataset.font) { list.outerHTML = menuHtml(); $("#menu .menu__list").hidden = false; } else if (m !== "print") list.hidden = true;
}

async function init() {
  const emb = $("#project-data");
  shell();
  if (emb) { try { P = { ...blank(), ...JSON.parse(emb.textContent).project }; } catch (e) { /* повреждённые данные игнорируем */ } emb.remove(); }
  else { const d = await dbLoad(); if (d) P = { ...blank(), ...d }; }
  setSaved("ok"); renderEditor(); renderPreview();
  const top = $(".topbar"), ed = $("#editor");
  top.addEventListener("click", onTop);
  top.addEventListener("change", e => { if (e.target.matches("[data-m-open]")) { const f = e.target.files[0]; e.target.value = ""; if (f) openFile(f); } });
  ed.addEventListener("input", onInput); ed.addEventListener("change", onChange); ed.addEventListener("click", onClick);
  ["dragover", "dragenter"].forEach(n => ed.addEventListener(n, e => { const z = e.target.closest("[data-drop]"); if (z) { e.preventDefault(); z.classList.add("is-drag"); } }));
  ed.addEventListener("dragleave", e => { const z = e.target.closest("[data-drop]"); if (z) z.classList.remove("is-drag"); });
  ed.addEventListener("drop", onDrop);
  $("#doc").addEventListener("click", e => { const i = e.target.dataset && e.target.dataset.lb; if (i !== undefined) openLb(+i); });
  $("#lb-x").onclick = () => $("#lb").close();
  $("#lb-prev").onclick = e => { e.stopPropagation(); openLb((lbI + LB.length - 1) % LB.length); };
  $("#lb-next").onclick = e => { e.stopPropagation(); openLb((lbI + 1) % LB.length); };
  $("#lb").addEventListener("click", e => { if (e.target.id === "lb" || e.target.id === "lb-img") $("#lb").close(); });
  document.addEventListener("keydown", e => { if (!$("#lb").open) return; if (e.key === "ArrowLeft") $("#lb-prev").click(); if (e.key === "ArrowRight") $("#lb-next").click(); });
  window.addEventListener("beforeunload", e => { if (saveState === "wait") { e.preventDefault(); e.returnValue = ""; } });
}
document.addEventListener("DOMContentLoaded", init);
})();
