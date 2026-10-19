// =====================================================================
// STATE · МОДЕЛЬ ДАННЫХ И РЕДЬЮСЕР
// =====================================================================

export const STORAGE_KEY = "tld.project.v1";
export const SCHEMA_VERSION = 1;

export function uid() {
  return `id-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`;
}

export function emptyProject() {
  return {
    version: SCHEMA_VERSION,
    meta: { showName: "", venue: "", date: "", ld: "", director: "", console: "", logo: null },
    times: { installation: "", focus: "", runtime: "", staff: [] },
    plots: { base: null, show: null },
    photos: [],
    fixtures: [],
    cues: [],
    commentary: "",
  };
}

// Проект пустой — как после «Новый»: заменять его можно без вопросов.
// version не сравниваем: пустой проект старой схемы тоже пустой.
const withoutVersion = (project) => JSON.stringify({ ...project, version: undefined });

export function isEmptyProject(project) {
  return withoutVersion(project) === withoutVersion(emptyProject());
}
