// =====================================================================
// STATE · РЕДЬЮСЕР
// Все мутации через диспатч — единая точка входа для изменений.
// =====================================================================

import { uid, emptyProject } from "./model.js";

export function projectReducer(state, action) {
  switch (action.type) {
    case "META":        return { ...state, meta: { ...state.meta, ...action.patch } };
    case "TIMES":       return { ...state, times: { ...state.times, ...action.patch } };

    case "STAFF_ADD":
      return { ...state, times: { ...state.times, staff: [...state.times.staff, { id: uid(), role: "", qty: 1 }] } };
    case "STAFF_UPDATE":
      return { ...state, times: { ...state.times, staff: state.times.staff.map(s => s.id === action.id ? { ...s, ...action.patch } : s) } };
    case "STAFF_DELETE":
      return { ...state, times: { ...state.times, staff: state.times.staff.filter(s => s.id !== action.id) } };
    case "COMMENTARY":  return { ...state, commentary: action.value };

    case "PLOT_SET":    return { ...state, plots: { ...state.plots, [action.which]: action.dataURL } };
    case "PLOT_CLEAR":  return { ...state, plots: { ...state.plots, [action.which]: null } };

    case "PHOTOS_ADD": {
      const startOrder = state.photos.length;
      const added = action.items.map((it, i) => ({
        id: uid(), src: it.src, tag: "", caption: "", order: startOrder + i,
      }));
      return { ...state, photos: [...state.photos, ...added] };
    }
    case "PHOTO_UPDATE":
      return { ...state, photos: state.photos.map(p => p.id === action.id ? { ...p, ...action.patch } : p) };
    case "PHOTO_DELETE":
      return { ...state, photos: state.photos.filter(p => p.id !== action.id) };
    case "PHOTO_REORDER": {
      const { fromId, toId } = action;
      const photos = [...state.photos];
      const fromIdx = photos.findIndex(p => p.id === fromId);
      const toIdx   = photos.findIndex(p => p.id === toId);
      if (fromIdx < 0 || toIdx < 0) return state;
      const [moved] = photos.splice(fromIdx, 1);
      photos.splice(toIdx, 0, moved);
      return { ...state, photos: photos.map((p, i) => ({ ...p, order: i })) };
    }

    case "FIX_ADD":   return { ...state, fixtures: [...state.fixtures, { id: uid(), type: "", qty: 1 }] };
    case "FIX_UPDATE":
      return { ...state, fixtures: state.fixtures.map(f => f.id === action.id ? { ...f, ...action.patch } : f) };
    case "FIX_DELETE":return { ...state, fixtures: state.fixtures.filter(f => f.id !== action.id) };

    case "CUE_ADD":   {
      const nextNum = state.cues.length > 0
        ? Math.max(...state.cues.map(c => Number(c.num) || 0)) + 1
        : 1;
      return { ...state, cues: [...state.cues, { id: uid(), num: nextNum, name: "", info: "", trigger: "Go" }] };
    }
    case "CUE_UPDATE":
      return { ...state, cues: state.cues.map(c => c.id === action.id ? { ...c, ...action.patch } : c) };
    case "CUE_DELETE":return { ...state, cues: state.cues.filter(c => c.id !== action.id) };
    case "CUES_REPLACE": {
      // заменяет весь список cues, сохраняя внутренний id для key
      const list = action.cues.map((c) => ({
        id: uid(),
        num: c.num,
        name: c.name || "",
        info: c.info || "",
        trigger: c.trigger || "Go",
      }));
      return { ...state, cues: list };
    }

    case "RESET":     return emptyProject();
    case "REPLACE":   return { ...emptyProject(), ...action.project };
    default: return state;
  }
}
