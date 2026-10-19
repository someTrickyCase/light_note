import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/styles/index.css";
import indexHtml from "../index.html?raw";
import { FONTS, PREFERENCES, THEMES, apply, applySaved, readSaved, useAppearance } from "../src/utils/appearance.js";
import { Topbar } from "../src/Topbar.jsx";
import { DEFAULT_LOCALE, I18nProvider } from "../src/i18n/I18nProvider.jsx";
import { SUPPORTED_LOCALES } from "../src/i18n/dict.js";
import { ProjectProvider } from "../src/state/ProjectProvider.jsx";
import { storage } from "../src/state/storage.js";
import { emptyProject } from "../src/state/model.js";
import { renderExportHTML } from "../src/utils/exportHtml.jsx";
import { makeTranslator } from "../src/i18n/translate.js";
import { patch } from "./helpers.js";
import { render, run, settle } from "./react.jsx";

const { t } = makeTranslator("ru");
const root = document.documentElement;
const THEME_KEY = PREFERENCES.theme.key;
const FONT_KEY = PREFERENCES.font.key;

function reset() {
	localStorage.removeItem(THEME_KEY);
	localStorage.removeItem(FONT_KEY);
	delete root.dataset.theme;
	delete root.dataset.font;
}
beforeEach(reset);
afterEach(() => {
	vi.restoreAllMocks();
	reset();
});

describe("saved appearance", () => {
	it("defaults: graphite, sans", () => {
		expect(THEMES[0]).toBe("graphite");
		expect(readSaved("theme")).toBe("graphite");
		expect(readSaved("font")).toBe("sans");
	});

	it("a saved choice wins; garbage falls back to the default", () => {
		for (const theme of THEMES) {
			localStorage.setItem(THEME_KEY, theme);
			expect(readSaved("theme")).toBe(theme);
		}
		localStorage.setItem(FONT_KEY, "serif");
		expect(readSaved("font")).toBe("serif");
		localStorage.setItem(THEME_KEY, "purple");
		localStorage.setItem(FONT_KEY, "comic");
		expect([readSaved("theme"), readSaved("font")]).toEqual(["graphite", "sans"]);
	});

	it("the old 'dark' (one dark theme) becomes graphite; old 'light' stays light", () => {
		localStorage.setItem(THEME_KEY, "dark");
		expect(readSaved("theme")).toBe("graphite");
		localStorage.setItem(THEME_KEY, "light");
		expect(readSaved("theme")).toBe("light");
	});

	it("localStorage unavailable (private mode) → defaults, no crash", () => {
		patch(Storage.prototype, "getItem", () => () => { throw new DOMException("denied", "SecurityError"); });
		expect([readSaved("theme"), readSaved("font")]).toEqual(["graphite", "sans"]);
	});

	it("apply / applySaved set <html data-theme data-font>", () => {
		apply("theme", "paper");
		apply("font", "serif");
		expect([root.dataset.theme, root.dataset.font]).toEqual(["paper", "serif"]);
		localStorage.setItem(THEME_KEY, "midnight");
		applySaved();
		expect([root.dataset.theme, root.dataset.font]).toEqual(["midnight", "sans"]);
	});
});

describe("useAppearance", () => {
	let api;
	function Probe() {
		api = useAppearance();
		return null;
	}

	it("starts from saved values and does NOT write defaults on load", () => {
		localStorage.setItem(FONT_KEY, "serif");
		render(<Probe />);
		expect([api.theme, api.font]).toEqual(["graphite", "serif"]);
		expect(localStorage.getItem(THEME_KEY)).toBeNull(); // кто не выбирал — следует умолчанию
	});

	it("setTheme / setFont apply to <html> and remember", async () => {
		render(<Probe />);
		await run(() => api.setTheme("tungsten"));
		await run(() => api.setFont("serif"));
		expect([api.theme, api.font]).toEqual(["tungsten", "serif"]);
		expect([root.dataset.theme, root.dataset.font]).toEqual(["tungsten", "serif"]);
		expect([localStorage.getItem(THEME_KEY), localStorage.getItem(FONT_KEY)]).toEqual(["tungsten", "serif"]);
	});

	it("still switches when localStorage refuses to save", async () => {
		patch(Storage.prototype, "setItem", () => () => { throw new DOMException("full", "QuotaExceededError"); });
		render(<Probe />);
		await run(() => api.setTheme("light"));
		expect([api.theme, root.dataset.theme]).toEqual(["light", "light"]);
	});
});

describe("theme and font in the header menu", () => {
	it("choices show what is selected, switch live and keep the menu open", async () => {
		vi.spyOn(storage, "load").mockResolvedValue(emptyProject());
		vi.spyOn(storage, "save").mockImplementation(() => {});
		const { container } = render(<I18nProvider initialLocale="ru"><ProjectProvider><Topbar /></ProjectProvider></I18nProvider>);
		await settle();
		await run(() => container.querySelector(".menu__button").click());
		const choice = (label) => [...container.querySelectorAll("[role=menuitemradio]")].find((item) => item.textContent === label);
		const checked = () => [...container.querySelectorAll("[role=menuitemradio][aria-checked=true]")].map((item) => item.textContent);
		expect(checked()).toEqual([t("appearance.theme.graphite"), t("appearance.font.sans"), "Русский"]);
		await run(() => choice(t("appearance.theme.midnight")).click());
		await run(() => choice(t("appearance.font.serif")).click());
		expect(checked()).toEqual([t("appearance.theme.midnight"), t("appearance.font.serif"), "Русский"]);
		expect([root.dataset.theme, root.dataset.font]).toEqual(["midnight", "serif"]);
		expect(container.querySelector("[role=menu]")).not.toBeNull();
		// в списке нет значков: только текст из словаря
		for (const item of container.querySelectorAll(".menu__item")) {
			expect(item.textContent).toMatch(/^[\s\wА-Яа-яЁё.…/]+$/);
		}
	});
});

describe("CSS: what themes and fonts change", () => {
	const token = (name) => getComputedStyle(root).getPropertyValue(name).trim();

	it("every theme is distinct; 'light' is the base :root", () => {
		const pages = THEMES.map((theme) => {
			apply("theme", theme);
			return token("--c-page");
		});
		expect(new Set(pages).size).toBe(THEMES.length);
		delete root.dataset.theme;
		expect(token("--c-page")).toBe(pages[THEMES.indexOf("light")]);
	});

	it("dark themes switch native controls to dark; light ones don't", () => {
		const dark = { graphite: true, midnight: true, tungsten: true, light: false, paper: false };
		for (const theme of THEMES) {
			apply("theme", theme);
			expect(getComputedStyle(root).colorScheme === "dark").toBe(dark[theme]);
		}
	});

	it("fonts: Arimo text, Oswald headings, Yeseva One title; serif swaps only the text", () => {
		const before = { display: token("--ff-display"), title: token("--ff-title"), mono: token("--ff-mono") };
		expect(token("--ff-text")).toMatch(/^"Arimo"/);
		expect(before.display).toMatch(/^"Oswald"/);
		expect(before.title).toMatch(/^"Yeseva One"/);
		apply("font", "serif");
		expect(token("--ff-text")).toMatch(/^"Old Standard TT".*serif$/);
		expect({ display: token("--ff-display"), title: token("--ff-title"), mono: token("--ff-mono") }).toEqual(before);
	});

	it("the show title uses Yeseva One in one real weight (no fake bold)", () => {
		const title = document.createElement("h1");
		title.className = "doc__title";
		document.body.append(title);
		expect(getComputedStyle(title).fontFamily).toMatch(/^"Yeseva One"/);
		expect(getComputedStyle(title).fontWeight).toBe("400");
		title.remove();
	});

	it("all four fonts are built in: they load without the network", async () => {
		const checks = ["Arimo", "Oswald", "Old Standard TT", "Yeseva One"].flatMap((family) =>
			["Light", "Свет"].map(async (text) => { // latin и cyrillic — отдельные файлы
				const faces = await document.fonts.load(`16px "${family}"`, text);
				return [`${family} · ${text}`, faces.length > 0];
			}));
		const missing = (await Promise.all(checks)).filter(([, loaded]) => !loaded).map(([name]) => name);
		expect(missing).toEqual([]);
		const bold = await document.fonts.load('700 16px "Old Standard TT"', "Свет");
		expect(bold.map((face) => face.weight)).toEqual(["700"]);
	});

	it("theme rules live inside @media screen (print is light); the font rule doesn't (print follows it)", () => {
		const rules = [...document.styleSheets].flatMap((sheet) => [...sheet.cssRules]);
		const flat = rules.flatMap((rule) => (rule instanceof CSSMediaRule
			? [...rule.cssRules].map((inner) => ({ inner, media: rule.media.mediaText }))
			: [{ inner: rule, media: "" }]));
		const media = (pattern) => flat.filter(({ inner }) => pattern.test(inner.selectorText ?? "")).map((rule) => rule.media);
		expect(media(/data-theme=/).length).toBeGreaterThanOrEqual(4);
		expect(new Set(media(/data-theme=/))).toEqual(new Set(["screen"]));
		expect(media(/data-font=/)).toEqual([""]);
	});

	async function showInIframe(html) {
		const iframe = document.createElement("iframe");
		document.body.append(iframe);
		await new Promise((resolve) => {
			iframe.addEventListener("load", resolve, { once: true });
			iframe.srcdoc = html;
		});
		const body = getComputedStyle(iframe.contentDocument.body);
		const result = { background: body.backgroundColor, font: body.fontFamily };
		iframe.remove();
		return result;
	}

	it("the export stays white whatever the app shows, and uses the chosen font", async () => {
		apply("theme", "tungsten");
		const sans = await renderExportHTML(emptyProject());
		expect(sans).not.toMatch(/<html[^>]*data-theme/); // правила тем в CSS есть, атрибута нет — не сработают
		expect(sans).toMatch(/<html[^>]*data-font="sans"/);
		expect(await showInIframe(sans)).toEqual({ background: "rgb(255, 255, 255)", font: expect.stringMatching(/^"?Arimo/) });
		const serif = await renderExportHTML(emptyProject(), { font: "serif" });
		expect(serif).toMatch(/<html[^>]*data-font="serif"/);
		expect(await showInIframe(serif)).toEqual({ background: "rgb(255, 255, 255)", font: expect.stringMatching(/^"Old Standard TT"/) });
	});
});

describe("contrast of token pairs (WCAG)", () => {
	// цвет токена → [r, g, b] через браузер (умеет и #hex, и rgba)
	function rgb(name) {
		const probe = document.createElement("i");
		probe.style.color = `var(${name})`;
		document.body.append(probe);
		const [r, g, b] = getComputedStyle(probe).color.match(/[\d.]+/g).map(Number);
		probe.remove();
		return [r, g, b];
	}
	const luminance = (channels) => {
		const [r, g, b] = channels.map((value) => {
			const c = value / 255;
			return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
		});
		return (0.2126 * r) + (0.7152 * g) + (0.0722 * b);
	};
	const ratio = (fg, bg) => {
		const [a, b] = [luminance(rgb(fg)), luminance(rgb(bg))].toSorted((x, y) => y - x);
		return (a + 0.05) / (b + 0.05);
	};
	// [текст, фон, минимум]: 4.5 — обычный текст, 3 — подсказки, крупное и значки
	const PAIRS = [
		["--c-ink", "--c-surface", 4.5], ["--c-ink", "--c-page", 4.5], ["--c-ink-2", "--c-surface", 4.5],
		["--c-soft", "--c-surface", 3], ["--c-on-accent", "--c-accent", 4.5], ["--c-on-strong", "--c-strong", 4.5],
		["--c-green-ink", "--c-green-bg", 4.5], ["--c-amber-ink", "--c-amber-bg", 4.5],
		["--c-err-ink", "--c-err-bg", 4.5], ["--c-info-ink", "--c-info-bg", 4.5],
		["--c-err", "--c-surface", 4.5], ["--c-accent", "--c-surface", 3],
		["--c-chrome-strong", "--c-chrome", 4.5], ["--c-chrome-meta", "--c-chrome", 4.5],
	];
	// Старые слабые места светлой темы (и экспорта) — docs/KNOWN_ISSUES.md. Исправите — уберите отсюда.
	const KNOWN_WEAK = { light: ["--c-on-accent on --c-accent", "--c-accent on --c-surface"] };

	for (const theme of THEMES) {
		it(`${theme}: text tokens are readable on their backgrounds`, () => {
			apply("theme", theme);
			const failing = PAIRS
				.filter(([fg, bg, min]) => ratio(fg, bg) < min)
				.map(([fg, bg]) => `${fg} on ${bg}`);
			expect(failing).toEqual(KNOWN_WEAK[theme] ?? []);
		});
	}
});

describe("index.html head script (no flash)", () => {
	const script = /<script>([\s\S]*?)<\/script>/.exec(indexHtml)[1];
	// Выполняет скрипт из <head> с поддельными localStorage и documentElement
	function runHeadScript(getItem) {
		const element = { dataset: {} };
		// eslint-disable-next-line no-new-func -- нарочно выполняем скрипт из <head>, чтобы проверить его поведение
		new Function("localStorage", "document", script)({ getItem }, { documentElement: element });
		return { ...element.dataset, lang: element.lang };
	}
	const DEFAULTS = { theme: "graphite", font: "sans", lang: "ru" };
	const saved = (values) => (key) => values[key] ?? null;

	it("knows the same keys, lists and defaults as utils/appearance.js and i18n/dict.js", () => {
		expect(script).toContain(`"${THEME_KEY}", ${JSON.stringify(THEMES).replaceAll(",", ", ")}, "graphite"`);
		expect(script).toContain(`"${FONT_KEY}", ${JSON.stringify(FONTS).replaceAll(",", ", ")}, "sans"`);
		expect(script).toContain(`"tld.locale.v1", ${JSON.stringify(SUPPORTED_LOCALES).replaceAll(",", ", ")}, "${DEFAULT_LOCALE}"`);
		expect(runHeadScript(() => null)).toEqual(DEFAULTS);
		for (const theme of THEMES) {
			expect(runHeadScript(saved({ [THEME_KEY]: theme, [FONT_KEY]: "serif", "tld.locale.v1": "en" }))).toEqual({ theme, font: "serif", lang: "en" });
		}
		expect(runHeadScript(saved({ [THEME_KEY]: "dark" })).theme).toBe("graphite");
		expect(runHeadScript(saved({ [THEME_KEY]: "garbage", [FONT_KEY]: "comic", "tld.locale.v1": "fr" }))).toEqual(DEFAULTS);
		expect(runHeadScript(() => { throw new Error("denied"); })).toEqual(DEFAULTS);
	});
});
