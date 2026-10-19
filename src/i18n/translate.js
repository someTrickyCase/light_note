// =====================================================================
// I18N · ПЕРЕВОДЧИК БЕЗ REACT
// =====================================================================
// Нужен там, где нет контекста: экспорт (заголовок HTML) и утилиты.
// I18nProvider строит t/tn через эту же функцию — поведение одно.

import { DICT } from "./dict.js";

export function makeTranslator(locale) {
	const dict = DICT[locale] || DICT.ru;
	// плоский словарь: отсутствующий ключ возвращается как есть — сигнал «не переведено»
	const t = (key) => dict[key] ?? key;
	const tn = (key, ...arguments_) => {
		const value = t(key);
		return typeof value === "function" ? value(...arguments_) : value;
	};
	return { t, tn };
}
