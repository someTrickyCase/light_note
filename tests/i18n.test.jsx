import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/styles/index.css";
import App from "../src/App.jsx";
import { DICT, LOCALE_NAMES, SUPPORTED_LOCALES } from "../src/i18n/dict.js";
import { DEFAULT_LOCALE, readSavedLocale, useT } from "../src/i18n/I18nProvider.jsx";
import { makeTranslator } from "../src/i18n/translate.js";
import { storage } from "../src/state/storage.js";
import { emptyProject } from "../src/state/model.js";
import { renderExportHTML } from "../src/utils/exportHtml.jsx";
import { DATA_ELEMENT_ID } from "../src/utils/projectFile.js";
import { formatDate } from "../src/utils/formatDate.js";
import { dismissToast, getToastQueue } from "../src/utils/toast.js";
import { makePng, patch } from "./helpers.js";
import { render, run, settle } from "./react.jsx";

const KEY = "tld.locale.v1";
const CYRILLIC = /[А-Яа-яЁё]/;
const KEYS = Object.keys(DICT.ru);

beforeEach(() => localStorage.removeItem(KEY));
afterEach(() => {
	vi.restoreAllMocks();
	localStorage.removeItem(KEY);
	document.documentElement.lang = "ru";
	for (const toast of getToastQueue()) { dismissToast(toast.id); }
});

// Значение словаря как текст: функции вызываем с образцами (число и строка)
const sample = (value) => (typeof value === "function" ? [value(1, "X"), value(2, "X")].join(" | ") : value);

describe("dictionary", () => {
	it("Russian is the default and the first language", () => {
		expect(DEFAULT_LOCALE).toBe("ru");
		expect(SUPPORTED_LOCALES).toEqual(["ru", "en"]);
	});

	it("every language has exactly the Russian keys, same kind (text / function with the same arguments)", () => {
		for (const locale of SUPPORTED_LOCALES) {
			const dict = DICT[locale];
			expect(Object.keys(dict).toSorted(), locale).toEqual(KEYS.toSorted());
			for (const key of KEYS) {
				const shape = (value) => (typeof value === "function" ? `function/${value.length}` : typeof value);
				expect(shape(dict[key]), `${locale} · ${key}`).toBe(shape(DICT.ru[key]));
			}
		}
	});

	it("each language has its own name, written in that language", () => {
		expect(LOCALE_NAMES).toEqual({ ru: "Русский", en: "English" });
	});

	it("English has no Russian left in it", () => {
		const leftovers = KEYS.filter((key) => CYRILLIC.test(sample(DICT.en[key])));
		expect(leftovers).toEqual([]);
	});

	it("English counts: one and many", () => {
		const { tn } = makeTranslator("en");
		expect([tn("gallery.count", 1), tn("gallery.count", 3)]).toEqual(["1 photo", "3 photos"]);
		expect([tn("fixtures.total", 1), tn("fixtures.total", 12)]).toEqual(["Total: 1 unit", "Total: 12 units"]);
		expect([tn("staff.total", 1), tn("staff.total", 4)]).toEqual(["Total: 1 person", "Total: 4 people"]);
		expect([tn("cues.import.ok", 1), tn("cues.import.ok", 40)]).toEqual(["Imported 1 cue from MA2 XML", "Imported 40 cues from MA2 XML"]);
	});
});

describe("translator fallbacks", () => {
	it("an unknown language reads Russian; a missing key shows itself (a visible 'not translated')", () => {
		const { t, tn } = makeTranslator("fr");
		expect(t("menu.main")).toBe("Меню");
		expect(t("no.such.key")).toBe("no.such.key");
		expect(tn("no.such.key", 1)).toBe("no.such.key");
	});

	it("useT outside the provider: Russian and a harmless setLocale", async () => {
		let api;
		function Probe() {
			api = useT();
			return null;
		}
		render(<Probe />);
		expect([api.locale, api.t("menu.main")]).toEqual(["ru", "Меню"]);
		await run(() => api.setLocale("en"));
		expect(api.locale).toBe("ru");
	});
});

describe("saved language", () => {
	it("default Russian; a saved known language wins; anything else → Russian", () => {
		expect(readSavedLocale()).toBe("ru");
		localStorage.setItem(KEY, "en");
		expect(readSavedLocale()).toBe("en");
		localStorage.setItem(KEY, "fr");
		expect(readSavedLocale()).toBe("ru");
	});

	it("localStorage unavailable → Russian, no crash", () => {
		patch(Storage.prototype, "getItem", () => () => { throw new DOMException("denied", "SecurityError"); });
		expect(readSavedLocale()).toBe("ru");
	});
});

describe("formatDate", () => {
	it("an input date reads like a date, in the document's language", () => {
		expect(formatDate("2026-12-25", "ru")).toBe("25 декабря 2026 г.");
		expect(formatDate("2026-12-25", "en")).toBe("December 25, 2026");
		expect(formatDate("2026-01-01", "en")).toBe("January 1, 2026"); // UTC: без сдвига на день
	});

	it("anything that isn't a real yyyy-mm-dd stays as typed", () => {
		for (const value of ["2026-02-31", "2026-13-01", "весной", "25.12.2026", ""]) {
			expect(formatDate(value, "en")).toBe(value);
		}
	});
});

// Проект с латинскими данными: тогда любая кириллица на английском экране — недопереведённый интерфейс
const project = () => ({
	...emptyProject(),
	meta: { ...emptyProject().meta, showName: "Nutcracker", venue: "Globe", date: "2026-12-25", ld: "Kirk", director: "Ann", console: "grandMA2" },
	times: { installation: "4 h", focus: "2 h", runtime: "1:45", staff: [{ id: "s1", role: "Followspot", name: "", phone: "", qty: 2 }] },
	photos: [{ id: "p1", src: makePng(40, 30), tag: "Aura", caption: "back", order: 0, width: 40, height: 30 }],
	fixtures: [{ id: "f1", type: "Source Four", qty: 12, info: "FOH" }],
	cues: [{ id: "c1", num: "1", name: "Opening", info: "", cmd: "Go", fade: "3", trigger: "Go" }],
	commentary: "Notes",
});

describe("switching the language in the app", () => {
	async function mountApp() {
		vi.spyOn(storage, "load").mockResolvedValue(project());
		vi.spyOn(storage, "save").mockImplementation(() => {});
		const view = render(<App />);
		await settle();
		const pick = async (name) => {
			// выбор не закрывает меню — открываем, только если закрыто
			if (!view.container.querySelector("[role=menu]")) { await run(() => view.container.querySelector(".menu__button").click()); }
			const item = [...view.container.querySelectorAll("[role=menuitemradio]")].find((element) => element.textContent === name);
			await run(() => item.click());
		};
		return { ...view, pick };
	}
	// весь видимый текст + подписи для экранных дикторов и подсказки
	const allText = (root) => [
		root.textContent,
		...[...root.querySelectorAll("[placeholder], [aria-label], [title], [alt]")].flatMap((element) =>
			["placeholder", "aria-label", "title", "alt"].map((name) => element.getAttribute(name) ?? "")),
	];

	it("starts in Russian; English changes everything, the page language and title; it is remembered", async () => {
		const { container, pick } = await mountApp();
		expect(container.querySelector(".menu__button").textContent).toBe("Меню");
		expect(localStorage.getItem(KEY)).toBeNull(); // кто не выбирал — следует умолчанию
		expect(container.querySelector(".doc__byline").textContent).toContain("25 декабря 2026 г.");

		await pick("English");
		expect(container.querySelector(".menu__button").textContent).toBe("Menu");
		expect([...container.querySelectorAll("[role=menuitemradio][aria-checked=true]")].map((item) => item.textContent))
			.toContain("English"); // меню осталось открытым, отмечен новый язык
		expect(document.documentElement.lang).toBe("en");
		expect(document.title).toBe(DICT.en["app.title"]);
		expect(localStorage.getItem(KEY)).toBe("en");
		expect(container.querySelector(".doc__byline").textContent).toContain("December 25, 2026");
		const russianLeft = allText(container).filter((text) => CYRILLIC.test(text.replaceAll("Русский", "")));
		expect(russianLeft).toEqual([]);

		await pick("Русский");
		expect(document.documentElement.lang).toBe("ru");
		expect(container.querySelector(".menu__button").textContent).toBe("Меню");
	});

	it("no screen shows a raw dictionary key (= a missing translation)", async () => {
		const { container, pick } = await mountApp();
		for (const locale of SUPPORTED_LOCALES) {
			// eslint-disable-next-line no-await-in-loop -- языки переключаем по очереди, как человек
			await pick(LOCALE_NAMES[locale]);
			const words = new Set(allText(container).join(" ").split(/\s+/));
			expect(KEYS.filter((key) => words.has(key)), locale).toEqual([]);
		}
	});

	it("a broken saved choice can't break saving: the switch still works", async () => {
		patch(Storage.prototype, "setItem", () => () => { throw new DOMException("full", "QuotaExceededError"); });
		const { container, pick } = await mountApp();
		await pick("English");
		expect(container.querySelector(".menu__button").textContent).toBe("Menu");
	});
});

describe("export language", () => {
	it("Russian by default; English when asked: texts, <html lang>, title, date", async () => {
		const ru = await renderExportHTML(project());
		expect(ru).toMatch(/<html lang="ru"/);
		expect(ru).toContain(DICT.ru["doc.kick"]);
		expect(ru).toContain("25 декабря 2026 г.");

		const en = await renderExportHTML(project(), { locale: "en" });
		expect(en).toMatch(/<html lang="en"/);
		expect(en).toContain("<title>Nutcracker · technical documentation</title>");
		expect(en).toContain(DICT.en["doc.kick"]);
		expect(en).toContain("December 25, 2026");
		const visible = new DOMParser().parseFromString(en, "text/html").body;
		visible.querySelector(`#${DATA_ELEMENT_ID}`).remove(); // данные проекта — не текст интерфейса
		expect(visible.textContent).not.toMatch(CYRILLIC);
	});
});
