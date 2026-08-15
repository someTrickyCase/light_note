// =====================================================================
// STATE · LOCALSTORAGE С МИГРАЦИЕЙ
// =====================================================================

import { emptyProject, STORAGE_KEY } from "./model.js";

export const storage = {
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return emptyProject();
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== 1) return emptyProject();
      // миграция полей (programmer → director, window → staff, +logo)
      const m = { ...emptyProject().meta, ...(parsed.meta || {}) };
      if ("programmer" in m) {
        m.director = m.director || m.programmer;
        delete m.programmer;
      }
      if (!("logo" in m)) m.logo = null;
      const tm = { ...emptyProject().times, ...(parsed.times || {}) };
      if ("window" in tm) {
        tm.staff = tm.staff || tm.window;
        delete tm.window;
      }
      // санитизация cues: добавляем info если нет
      const cues = Array.isArray(parsed.cues) ? parsed.cues.map((c) => ({
        id: c.id || uid(),
        num: c.num ?? "",
        name: c.name || "",
        info: c.info ?? "",
        trigger: c.trigger || "Go",
      })) : [];
      return { ...emptyProject(), ...parsed, meta: m, times: tm, cues };
    } catch (e) {
      console.warn("[storage] load failed:", e);
      return emptyProject();
    }
  },
  save(project) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
      return true;
    } catch (e) {
      console.warn("[storage] save failed:", e);
      const isQuota = e && (e.name === "QuotaExceededError" || /quota/i.test(String(e.message)));
      // callback на quota — будет установлен из App
      if (storage._onError) storage._onError(isQuota, e);
      return false;
    }
  },
  clear() { try { localStorage.removeItem(STORAGE_KEY); } catch {} },
  _onError: null,
};
