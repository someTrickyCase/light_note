import { afterEach, describe, expect, it, vi } from "vitest";
import "../src/styles/index.css";
import { exportDocument, renderExportHTML } from "../src/utils/exportHtml.jsx";
import { EXPORT_RUNTIME_JS } from "../src/utils/exportScript.js";
import { emptyProject } from "../src/state/model.js";
import { makeTranslator } from "../src/i18n/translate.js";
import { makePng } from "./helpers.js";

const { tn } = makeTranslator("ru");
const PNGS = [makePng(40, 30, "#c00"), makePng(32, 18, "#0c0"), makePng(20, 30, "#00c")];

const project = (overrides = {}) => ({
	...emptyProject(),
	meta: { ...emptyProject().meta, showName: "Hamlet" },
	photos: PNGS.map((source, index) => ({
		id: `p${index}`, src: source, tag: `Fixture ${index + 1}`, caption: index === 0 ? "front" : "", order: index, width: 40, height: 30,
	})),
	plots: { base: PNGS[1], show: null },
	...overrides,
});

const frames = [];
afterEach(() => { while (frames.length > 0) { frames.pop().remove(); } });

// Открывает экспорт в iframe — как скачанный файл, со своим скриптом
async function openExport(html) {
	const iframe = document.createElement("iframe");
	iframe.style.cssText = "width: 1000px; height: 700px";
	document.body.append(iframe);
	frames.push(iframe);
	await new Promise((resolve) => {
		iframe.addEventListener("load", resolve, { once: true });
		iframe.srcdoc = html;
	});
	return iframe.contentDocument;
}

const groupOf = (frameDocument, name) => frameDocument.querySelector(`[data-zoom-group="${CSS.escape(name)}"]`);
function state(group) {
	const dialog = group.querySelector(".lightbox");
	return {
		open: dialog.open,
		src: dialog.querySelector(".lightbox__img").getAttribute("src"),
		count: dialog.querySelector(".lightbox__count").textContent,
		title: dialog.querySelector(".lightbox__title").textContent,
		caption: dialog.querySelector(".lightbox__caption").textContent,
		label: dialog.getAttribute("aria-label"),
	};
}
const key = (dialog, name) => dialog.dispatchEvent(new KeyboardEvent("keydown", { key: name, bubbles: true, cancelable: true }));
function swipe(dialog, dx) {
	const win = dialog.ownerDocument.defaultView;
	dialog.dispatchEvent(new win.PointerEvent("pointerdown", { clientX: 500, bubbles: true }));
	dialog.dispatchEvent(new win.PointerEvent("pointerup", { clientX: 500 + dx, bubbles: true }));
	dialog.click();
}

describe("renderExportHTML", () => {
	it("is a standalone page: inline images, CSS, runtime script, no markers, carousel closed", () => {
		globalThis.__INJECTED_CSS__ = ".marker-css { color: red }";
		try {
			const html = renderExportHTML(project());
			expect(html.startsWith("<!doctype html>")).toBe(true);
			expect(html).toContain(".marker-css");
			expect(html).toContain(EXPORT_RUNTIME_JS);
			expect(html).not.toMatch(/__blob:|__idbRef:/);
			expect((html.match(/src="data:image\/png;base64,/g) || []).length).toBe(4); // 3 фото + 1 плот
			expect(html).toContain('data-zoom-group="gallery"');
			expect(html).toContain('data-zoom-group="plots"');
			expect(html).not.toMatch(/<dialog[^>]*\sopen/);
			expect(html).toContain(`<title>${tn("export.title", "Hamlet")}</title>`);
		} finally {
			delete globalThis.__INJECTED_CSS__;
		}
	});

	it("without the CSS snapshot, it collects the page's style sheets", () => {
		const html = renderExportHTML(project());
		expect(html).toContain(".doc__mosaic");
	});

	it("skips style sheets it may not read (cross-origin)", () => {
		const fake = { cssRules: null };
		Object.defineProperty(fake, "cssRules", { get() { throw new DOMException("no", "SecurityError"); } });
		const real = Object.getOwnPropertyDescriptor(Document.prototype, "styleSheets");
		Object.defineProperty(document, "styleSheets", { configurable: true, get: () => [fake, ...real.get.call(document)] });
		try {
			expect(renderExportHTML(project())).toContain(".doc__mosaic");
		} finally {
			delete document.styleSheets;
		}
	});

	it("escapes the show name in the title", () => {
		const html = renderExportHTML(project({ meta: { ...emptyProject().meta, showName: "<b>Bad</b>" } }));
		expect(html).toContain("&lt;b&gt;Bad&lt;/b&gt;");
		expect(html).not.toContain("<title><b>");
	});

	it("an empty project falls back to the app name", () => {
		expect(renderExportHTML(emptyProject())).toContain(`<title>${tn("export.title", "Light Note")}</title>`);
	});
});

describe("exported carousel (vanilla JS)", () => {
	it("opens the clicked photo, ‹ › / ← → wrap around, plots are a separate group", async () => {
		const frameDocument = await openExport(renderExportHTML(project()));
		const gallery = groupOf(frameDocument, "gallery");
		const dialog = gallery.querySelector(".lightbox");
		expect(state(gallery).open).toBe(false);

		gallery.querySelector(".doc__zoom").click();
		expect(state(gallery)).toEqual({ open: true, src: PNGS[0], count: "1 / 3", title: "Fixture 1", caption: "front", label: "Fixture 1" });
		dialog.querySelector(".lightbox__nav--prev").click();
		expect(state(gallery)).toMatchObject({ count: "3 / 3", src: PNGS[2], caption: "" });
		dialog.querySelector(".lightbox__nav--next").click();
		expect(state(gallery).count).toBe("1 / 3");
		key(dialog, "ArrowRight");
		expect(state(gallery).count).toBe("2 / 3");
		key(dialog, "ArrowLeft");
		key(dialog, "ArrowLeft");
		expect(state(gallery).count).toBe("3 / 3");
		key(dialog, "Tab");
		expect(state(gallery).count).toBe("3 / 3");
		gallery.querySelectorAll(".doc__zoom")[1].click(); // клик по другому фото, пока открыто
		expect(state(gallery).count).toBe("2 / 3");

		// у плотов своя карусель: один плот → без счётчика и без ‹ ›
		const plots = groupOf(frameDocument, "plots");
		expect(plots.querySelector(".lightbox__nav--prev").hidden).toBe(true);
		expect(gallery.querySelector(".lightbox__nav--prev").hidden).toBe(false);
	});

	it("swipe moves, a short move doesn't, and the click after a swipe doesn't close", async () => {
		const frameDocument = await openExport(renderExportHTML(project()));
		const gallery = groupOf(frameDocument, "gallery");
		const dialog = gallery.querySelector(".lightbox");
		gallery.querySelector(".doc__zoom").click();
		swipe(dialog, -120);
		expect(state(gallery)).toMatchObject({ open: true, count: "2 / 3" });
		swipe(dialog, 120);
		expect(state(gallery)).toMatchObject({ open: true, count: "1 / 3" });
		const win = frameDocument.defaultView;
		dialog.dispatchEvent(new win.PointerEvent("pointerup", { clientX: 900, bubbles: true })); // без pointerdown
		dialog.dispatchEvent(new win.PointerEvent("pointerdown", { clientX: 500, bubbles: true }));
		dialog.dispatchEvent(new win.PointerEvent("pointerup", { clientX: 530, bubbles: true }));
		expect(state(gallery).count).toBe("1 / 3");
	});

	it("closes with ✕ and with a backdrop click, but not with a click on the photo", async () => {
		const frameDocument = await openExport(renderExportHTML(project()));
		const gallery = groupOf(frameDocument, "gallery");
		const dialog = gallery.querySelector(".lightbox");
		gallery.querySelector(".doc__zoom").click();
		dialog.querySelector(".lightbox__close").click();
		expect(dialog.open).toBe(false);
		gallery.querySelector(".doc__zoom").click();
		dialog.querySelector(".lightbox__img").click();
		expect(dialog.open).toBe(true);
		dialog.click();
		expect(dialog.open).toBe(false);
	});

	it("a single photo: keys and swipes do nothing, and a long drag doesn't close it", async () => {
		const frameDocument = await openExport(renderExportHTML(project({ photos: project().photos.slice(0, 1) })));
		const gallery = groupOf(frameDocument, "gallery");
		const dialog = gallery.querySelector(".lightbox");
		gallery.querySelector(".doc__zoom").click();
		key(dialog, "ArrowRight");
		swipe(dialog, -200);
		expect(state(gallery)).toMatchObject({ open: true, count: "", title: "Fixture 1" });
	});

	it("works without <dialog>.showModal (old browsers): uses the open attribute", async () => {
		const stub = "<script>HTMLDialogElement.prototype.showModal = undefined; HTMLDialogElement.prototype.close = undefined;</script>";
		const frameDocument = await openExport(renderExportHTML(project()).replace("<head>", `<head>${stub}`));
		const gallery = groupOf(frameDocument, "gallery");
		const dialog = gallery.querySelector(".lightbox");
		gallery.querySelector(".doc__zoom").click();
		expect(dialog.hasAttribute("open")).toBe(true);
		dialog.querySelector(".lightbox__close").click();
		expect(dialog.hasAttribute("open")).toBe(false);
	});

	it("also starts when the script runs after the page has loaded", async () => {
		const html = renderExportHTML(project()).replace(`<script>${EXPORT_RUNTIME_JS}</script>`, "");
		const frameDocument = await openExport(html);
		expect(frameDocument.readyState).toBe("complete");
		const script = frameDocument.createElement("script");
		script.textContent = EXPORT_RUNTIME_JS;
		frameDocument.body.append(script);
		groupOf(frameDocument, "gallery").querySelector(".doc__zoom").click();
		expect(state(groupOf(frameDocument, "gallery")).open).toBe(true);
	});

	it("ignores a group without a carousel or without images", async () => {
		const html = renderExportHTML(project()).replace("<body>", '<body><div data-zoom-group="empty"><button class="doc__zoom"></button></div><div data-zoom-group="none"><dialog class="lightbox"></dialog></div>');
		const frameDocument = await openExport(html);
		const errors = [];
		frameDocument.defaultView.addEventListener("error", (event) => errors.push(event.message));
		frameDocument.querySelector('[data-zoom-group="empty"] .doc__zoom').click();
		groupOf(frameDocument, "gallery").querySelector(".doc__zoom").click();
		expect(errors).toEqual([]);
		expect(state(groupOf(frameDocument, "gallery")).open).toBe(true);
	});

	it("a tile without an <img> opens with an empty picture instead of crashing", async () => {
		const html = renderExportHTML(project({ plots: { base: null, show: null } })).replace(/(<button[^>]*class="doc__zoom"[^>]*>)<img[^>]*>/, "$1");
		const frameDocument = await openExport(html);
		const gallery = groupOf(frameDocument, "gallery");
		gallery.querySelector(".doc__zoom").click();
		expect(state(gallery)).toMatchObject({ open: true, src: "", title: "Fixture 1" });
	});
});

describe("exportDocument (download)", () => {
	function captureDownload() {
		const clicks = [];
		vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function click() {
			clicks.push({ href: this.href, download: this.download, inPage: document.body.contains(this) });
		});
		return clicks;
	}
	afterEach(() => vi.restoreAllMocks());

	it("downloads <showName>.html with the rendered page", async () => {
		const clicks = captureDownload();
		exportDocument(project({ meta: { ...emptyProject().meta, showName: "Гамлет / Hamlet: 2026" } }));
		expect(clicks).toHaveLength(1);
		expect(clicks[0].download).toBe("Гамлет_Hamlet_2026.html");
		expect(clicks[0].inPage).toBe(true);
		expect(document.querySelector("a[download]")).toBeNull(); // ссылка убрана после клика
		const text = await (await fetch(clicks[0].href)).text();
		expect(text).toContain('data-zoom-group="gallery"');
	});

	it("uses light-note.html without a show name, and revokes the URL later", async () => {
		vi.useFakeTimers();
		try {
			const revoke = vi.spyOn(URL, "revokeObjectURL");
			const clicks = captureDownload();
			exportDocument(emptyProject());
			expect(clicks[0].download).toBe("light-note.html");
			expect(revoke).not.toHaveBeenCalled();
			vi.advanceTimersByTime(1000);
			expect(revoke).toHaveBeenCalledWith(clicks[0].href);
		} finally {
			vi.useRealTimers();
		}
	});

	it("does nothing without a project", () => {
		const clicks = captureDownload();
		exportDocument(null);
		expect(clicks).toEqual([]);
	});
});
