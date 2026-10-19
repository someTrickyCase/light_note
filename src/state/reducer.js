// =====================================================================
// STATE · РЕДЬЮСЕР
// Все мутации через диспатч — единая точка входа для изменений.
// Каждый тип экшена — маленький обработчик в таблице HANDLERS.
// =====================================================================

import { uid, emptyProject } from "./model.js";

// Извлекает имя из имени файла для авто-заполнения поля "название".
// "Mac_Quantum_05.jpg" → "Mac Quantum 05"
function guessTag(filename) {
  if (!filename) { return ""; }
  const base = filename.replace(/\.[^.]+$/, "");
  return base.replaceAll(/[_-]+/g, " ").trim();
}

// ---- общие помощники для списков с id ----

const patchById = (list, id, patch) => list.map((item) => (item.id === id ? { ...item, ...patch } : item));
const removeById = (list, id) => list.filter((item) => item.id !== id);

// Переставляет элемент fromId на место toId. null — если id не найдены.
function moveById(list, fromId, toId) {
  const fromIndex = list.findIndex((item) => item.id === fromId);
  const toIndex = list.findIndex((item) => item.id === toId);
  if (fromIndex === -1 || toIndex === -1) { return null; }
  const next = [...list];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

const newCue = (cueNumber) => ({ id: uid(), num: cueNumber, name: "", info: "", cmd: "", fade: "", trigger: "Go" });

// ---- обработчики по слайсам ----

const withStaff = (state, staff) => ({ ...state, times: { ...state.times, staff } });
const withPlot = (state, which, value) => ({ ...state, plots: { ...state.plots, [which]: value } });

const HANDLERS = new Map(Object.entries({
  META: (state, a) => ({ ...state, meta: { ...state.meta, ...a.patch } }),
  TIMES: (state, a) => ({ ...state, times: { ...state.times, ...a.patch } }),
  COMMENTARY: (state, a) => ({ ...state, commentary: a.value }),

  STAFF_ADD: (state) => withStaff(state, [...state.times.staff, { id: uid(), role: "", qty: 1 }]),
  STAFF_UPDATE: (state, a) => withStaff(state, patchById(state.times.staff, a.id, a.patch)),
  STAFF_DELETE: (state, a) => withStaff(state, removeById(state.times.staff, a.id)),

  PLOT_SET: (state, a) => withPlot(state, a.which, a.dataURL),
  PLOT_CLEAR: (state, a) => withPlot(state, a.which, null),

  PHOTOS_ADD: (state, a) => {
    const startOrder = state.photos.length;
    const added = a.items.map((it, index) => ({
      id: uid(), src: it.src, tag: guessTag(it.name), caption: "", order: startOrder + index,
    }));
    return { ...state, photos: [...state.photos, ...added] };
  },
  PHOTO_UPDATE: (state, a) => ({ ...state, photos: patchById(state.photos, a.id, a.patch) }),
  PHOTO_DELETE: (state, a) => ({ ...state, photos: removeById(state.photos, a.id) }),
  PHOTOS_CLEAR: (state) => ({ ...state, photos: [] }),
  PHOTO_REORDER: (state, a) => {
    const photos = moveById(state.photos, a.fromId, a.toId);
    return photos ? { ...state, photos: photos.map((p, index) => ({ ...p, order: index })) } : state;
  },

  FIX_ADD: (state) => ({ ...state, fixtures: [...state.fixtures, { id: uid(), type: "", qty: 1, info: "" }] }),
  FIX_UPDATE: (state, a) => ({ ...state, fixtures: patchById(state.fixtures, a.id, a.patch) }),
  FIX_DELETE: (state, a) => ({ ...state, fixtures: removeById(state.fixtures, a.id) }),
  FIX_REORDER: (state, a) => {
    const fixtures = moveById(state.fixtures, a.fromId, a.toId);
    return fixtures ? { ...state, fixtures } : state;
  },

  CUE_ADD: (state) => {
    const nextNumber = state.cues.length > 0
      ? Math.max(...state.cues.map((c) => Number(c.num) || 0)) + 1
      : 1;
    return { ...state, cues: [...state.cues, newCue(nextNumber)] };
  },
  CUE_UPDATE: (state, a) => ({ ...state, cues: patchById(state.cues, a.id, a.patch) }),
  CUE_DELETE: (state, a) => ({ ...state, cues: removeById(state.cues, a.id) }),
  // заменяет весь список cues, генерируя новый внутренний id для key
  CUES_REPLACE: (state, a) => ({
    ...state,
    cues: a.cues.map((c) => ({
      ...newCue(c.num),
      name: c.name || "",
      info: c.info || "",
      cmd: c.cmd || "",
      fade: c.fade || "",
      trigger: c.trigger || "Go",
    })),
  }),

  RESET: () => emptyProject(),
  REPLACE: (state, a) => ({ ...emptyProject(), ...a.project }),
}));

export function projectReducer(state, action) {
  const handler = HANDLERS.get(action.type);
  return handler ? handler(state, action) : state;
}
