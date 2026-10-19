// =====================================================================
// UTILS · ЗАНЯТОЕ МЕСТО В БРАУЗЕРЕ
// =====================================================================
//
// Проект и картинки живут в IndexedDB. Лимит задаёт браузер (обычно это
// доля свободного места на диске — сотни МБ и больше), точные цифры
// отдаёт navigator.storage.estimate() (см. storage.estimate()).
// Классифицируем занятость в три уровня: ok / warn / err.

export const WARN_RATIO = 0.6;
export const ERR_RATIO = 0.85;

export const QUOTA_LEVELS = {
	ok:   { tone: "ok",   order: 0 },
	warn: { tone: "warn", order: 1 },
	err:  { tone: "err",  order: 2 },
};

// Приводим к человекочитаемому виду: 1234567 → "1.18 МБ".
// t — переводчик (единицы измерения живут в словаре).
export function formatBytes(n, t) {
	if (n < 1024) { return `${n} ${t("unit.b")}`; }
	if (n < 1024 * 1024) { return `${(n / 1024).toFixed(1)} ${t("unit.kb")}`; }
	if (n < 1024 * 1024 * 1024) { return `${(n / (1024 * 1024)).toFixed(2)} ${t("unit.mb")}`; }
	return `${(n / (1024 * 1024 * 1024)).toFixed(2)} ${t("unit.gb")}`;
}

// Классификация по занятому месту. quotaBytes = 0 — браузер не знает лимит → ok.
export function quotaLevel(usedBytes, quotaBytes) {
	if (!quotaBytes) { return "ok"; }
	const ratio = usedBytes / quotaBytes;
	if (ratio >= ERR_RATIO) { return "err"; }
	if (ratio >= WARN_RATIO) { return "warn"; }
	return "ok";
}
