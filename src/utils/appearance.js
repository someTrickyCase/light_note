// =====================================================================
// UTILS · ОФОРМЛЕНИЕ: ТЕМА И ШРИФТ
// =====================================================================
// Атрибуты <html data-theme="…" data-font="…">, цвета и шрифты — в styles/tokens.css.
// Выбор пользователя хранится в localStorage и пишется ТОЛЬКО при выборе:
// кто не выбирал, следует умолчанию (графит, без засечек).
// Те же ключи и списки читает крошечный скрипт в <head> index.html — он ставит
// оформление ещё до первой отрисовки, чтобы страница не мигала. Менять вместе
// (tests/appearance.test.jsx выполняет тот скрипт).
// Экспорт и печать всегда светлые и со стандартным шрифтом (см. шапку tokens.css).

import { useState } from "react";

// Порядок = порядок в меню. Названия — в словаре: appearance.theme.<id>, appearance.font.<id>
export const THEMES = ["graphite", "midnight", "tungsten", "light", "paper"];
export const FONTS = ["sans", "serif"];

export const PREFERENCES = {
	theme: { key: "tld.theme.v1", values: THEMES, fallback: "graphite", attribute: "theme" },
	font: { key: "tld.font.v1", values: FONTS, fallback: "sans", attribute: "font" },
};

// Старые сохранённые значения → новые (до появления нескольких тем было dark/light)
const RENAMED = { dark: "graphite" };

export function readSaved(kind) {
	const { key, values, fallback } = PREFERENCES[kind];
	try {
		const saved = localStorage.getItem(key);
		const value = RENAMED[saved] ?? saved;
		return values.includes(value) ? value : fallback;
	} catch {
		return fallback; // localStorage недоступен (приватный режим, file:// в некоторых браузерах)
	}
}

export function apply(kind, value) {
	document.documentElement.dataset[PREFERENCES[kind].attribute] = value;
}

function save(kind, value) {
	try {
		localStorage.setItem(PREFERENCES[kind].key, value);
	} catch {
		// не удалось сохранить — выбор останется до перезагрузки
	}
}

// Поставить сохранённое оформление (main.jsx; обычно его уже поставил скрипт в <head>)
export function applySaved() {
	for (const kind of Object.keys(PREFERENCES)) { apply(kind, readSaved(kind)); }
}

function choose(kind, value) {
	apply(kind, value);
	save(kind, value);
}

// { theme, font, setTheme, setFont } — для меню в Topbar
export function useAppearance() {
	const [theme, setTheme] = useState(() => readSaved("theme"));
	const [font, setFont] = useState(() => readSaved("font"));
	return {
		theme,
		font,
		setTheme: (value) => {
			choose("theme", value);
			setTheme(value);
		},
		setFont: (value) => {
			choose("font", value);
			setFont(value);
		},
	};
}
