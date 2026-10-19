// =====================================================================
// UTILS · МЕСТО В БРАУЗЕРЕ
// =====================================================================
//
// Проект и картинки живут в IndexedDB — обычные файлы в профиле браузера
// на диске. Браузер не резервирует место заранее, а называет потолок
// (quota, обычно доля диска), сколько этому сайту можно занять.
// navigator.storage.estimate() (см. storage.estimate()) отдаёт занятое и потолок.
// Предупреждаем, когда до потолка осталось меньше LOW_SPACE_BYTES.

export const LOW_SPACE_BYTES = 1024 ** 3; // 1 ГБ

// Приводим к человекочитаемому виду: 1234567 → "1.18 МБ".
// t — переводчик (единицы измерения живут в словаре).
export function formatBytes(n, t) {
	if (n < 1024) { return `${n} ${t("unit.b")}`; }
	if (n < 1024 * 1024) { return `${(n / 1024).toFixed(1)} ${t("unit.kb")}`; }
	if (n < 1024 * 1024 * 1024) { return `${(n / (1024 * 1024)).toFixed(2)} ${t("unit.mb")}`; }
	return `${(n / (1024 * 1024 * 1024)).toFixed(2)} ${t("unit.gb")}`;
}

// Сколько ещё можно занять. quotaBytes = 0 — браузер не знает лимит → null.
export function freeBytes(usedBytes, quotaBytes) {
	if (!quotaBytes) { return null; }
	return Math.max(0, quotaBytes - usedBytes);
}

// Места мало: до потолка меньше 1 ГБ. Неизвестный лимит — не пугаем.
export function isSpaceLow(usedBytes, quotaBytes) {
	const free = freeBytes(usedBytes, quotaBytes);
	return free !== null && free < LOW_SPACE_BYTES;
}
