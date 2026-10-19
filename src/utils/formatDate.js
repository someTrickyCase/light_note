// =====================================================================
// UTILS · ДАТА ДЛЯ ДОКУМЕНТА
// =====================================================================
// <input type="date"> хранит «2026-12-25». В документе — по-человечески и на
// языке документа: «25 декабря 2026 г.», «December 25, 2026». Названия месяцев
// знает сам браузер (Intl), офлайн. Что-то другое (старый текст) — как есть.

export function formatDate(value, locale) {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
	if (!match) { return value; }
	const [year, month, day] = match.slice(1).map(Number);
	// UTC: иначе в часовых поясах западнее Гринвича дата съедет на день назад
	const date = new Date(Date.UTC(year, month - 1, day));
	if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) { return value; } // 2026-02-31 и т. п.
	return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}
