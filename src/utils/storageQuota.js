// =====================================================================
// UTILS · ЛИМИТ LOCALSTORAGE
// =====================================================================
//
// Большинство браузеров дают origin'у ~5 MB в localStorage.
// JPEG-фото в base64 — это ~1.33× от бинарного размера, поэтому
// 1920px JPEG ≈ 300-600 KB в JSON. Реалистичный потолок — 15-30 фото.
//
// Мы считаем текущий размер через Blob (точный способ) и
// классифицируем в три уровня: ok / warn / err.

export const QUOTA_BUDGET_BYTES = 5 * 1024 * 1024; // 5 MB — консервативная оценка
export const WARN_RATIO = 0.6;
export const ERR_RATIO = 0.85;

export const QUOTA_LEVELS = {
	ok:   { tone: "ok",   order: 0 },
	warn: { tone: "warn", order: 1 },
	err:  { tone: "err",  order: 2 },
};

// Размер строки в байтах (Blob умеет точно)
export function bytesOfString(s) {
	return new Blob([s]).size;
}

// Считаем размер проекта как если бы мы его сериализовали в JSON.
// (Это тот же путь, что и в storage.save — без лишних полей.)
export function projectSize(project) {
	return bytesOfString(JSON.stringify(project));
}

// Приводим к человекочитаемому виду: 1234567 → "1.18 МБ".
// t — переводчик (единицы измерения живут в словаре).
export function formatBytes(n, t) {
	if (n < 1024) { return `${n} ${t("unit.b")}`; }
	if (n < 1024 * 1024) { return `${(n / 1024).toFixed(1)} ${t("unit.kb")}`; }
	return `${(n / (1024 * 1024)).toFixed(2)} ${t("unit.mb")}`;
}

// Классификация по занятому месту
export function quotaLevel(usedBytes, budget = QUOTA_BUDGET_BYTES) {
	const ratio = usedBytes / budget;
	if (ratio >= ERR_RATIO) { return "err"; }
	if (ratio >= WARN_RATIO) { return "warn"; }
	return "ok";
}

// Уровень для всего проекта. Дорого (JSON.stringify с фото) — не вызывать на каждый рендер.
export function projectQuotaLevel(project) {
	return quotaLevel(projectSize(project));
}
