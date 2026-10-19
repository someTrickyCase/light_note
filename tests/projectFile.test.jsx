import { describe, expect, it } from "vitest";
import { renderExportHTML } from "../src/utils/exportHtml.jsx";
import { DATA_ELEMENT_ID, FILE_FORMAT, ProjectFileError, readProjectFromHTML, renderProjectData } from "../src/utils/projectFile.js";
import { SCHEMA_VERSION, emptyProject, isEmptyProject } from "../src/state/model.js";
import { imageKey } from "../src/utils/imageKey.js";
import { makePng } from "./helpers.js";

const PNGS = [makePng(40, 30, "#c00"), makePng(32, 18, "#0c0"), makePng(20, 30, "#00c"), makePng(16, 16, "#999")];

const fullProject = () => ({
	...emptyProject(),
	meta: { ...emptyProject().meta, showName: "Щелкунчик", venue: "МХТ", date: "2026-12-25", ld: "Kirk", director: "Н. Н.", console: "grandMA2", logo: PNGS[3] },
	times: { installation: "4 ч", focus: "2 ч", runtime: "1:45", staff: [{ id: "s1", role: "Светорежиссёр", name: "Кирк", phone: "+7" }] },
	plots: { base: PNGS[1], show: PNGS[2] },
	photos: [
		{ id: "p1", src: PNGS[0], tag: "Mac Aura", caption: "задний план", order: 0, width: 40, height: 30 },
		{ id: "p2", src: PNGS[2], tag: "", caption: "", order: 1, width: 20, height: 30 },
	],
	fixtures: [{ id: "f1", type: "Source Four 26°", qty: 12, info: "FOH" }],
	cues: [{ id: "c1", num: "1", name: "Пролог", info: "", cmd: "Go", fade: "3", trigger: "Go" }],
	commentary: "Финал: </script><script>window.__pwned = 1</script> & «кавычки» <!-- -->",
});

// Блок данных из готового HTML — как его увидит импорт
function dataOf(html) {
	const element = new DOMParser().parseFromString(html, "text/html").querySelector(`#${DATA_ELEMENT_ID}`);
	return JSON.parse(element.textContent);
}

const expectError = async (html, code) => {
	const error = await readProjectFromHTML(html).catch((error_) => error_);
	expect(error).toBeInstanceOf(ProjectFileError);
	expect(error.code).toBe(code);
};

// Минимальный «экспорт» с данным блоком и картинками
const fileWith = (data, images = "") =>
	`<!doctype html><html><body>${images}<script type="application/json" id="${DATA_ELEMENT_ID}">${JSON.stringify(data)}</script></body></html>`;

describe("export → open round trip", () => {
	it("gives back exactly the same project (texts, lists, all images)", async () => {
		const project = fullProject();
		const reopened = await readProjectFromHTML(await renderExportHTML(project));
		expect(reopened).toEqual(project);
	});

	it("an empty project round-trips to an empty project", async () => {
		const reopened = await readProjectFromHTML(await renderExportHTML(emptyProject()));
		expect(isEmptyProject(reopened)).toBe(true);
	});

	it("images are not duplicated: the data block holds references, the picture is in the document once", async () => {
		const html = await renderExportHTML(fullProject());
		const { project, format, app } = dataOf(html);
		expect({ app, format }).toEqual({ app: "light-note", format: FILE_FORMAT });
		expect(project.photos.map((photo) => photo.src)).toEqual([`__ref:${imageKey.photo("p1")}`, `__ref:${imageKey.photo("p2")}`]);
		expect(project.plots).toEqual({ base: `__ref:${imageKey.plot("base")}`, show: `__ref:${imageKey.plot("show")}` });
		expect(project.meta.logo).toBe(`__ref:${imageKey.logo}`);
		const base64 = PNGS[0].slice(PNGS[0].indexOf(",") + 1);
		expect(html.indexOf(base64)).toBeGreaterThan(-1);
		expect(html.indexOf(base64)).toBe(html.lastIndexOf(base64)); // ровно одно вхождение
	});

	it("user text with </script> can't break out of the data block", async () => {
		const html = await renderExportHTML(fullProject());
		const block = html.slice(html.indexOf(`id="${DATA_ELEMENT_ID}"`));
		expect(block.slice(0, block.indexOf("</script>"))).not.toContain("<");
		expect(dataOf(html).project.commentary).toBe(fullProject().commentary);
	});

	it("marks the file as made by Light Note", async () => {
		expect(await renderExportHTML(emptyProject())).toContain('<meta name="generator" content="Light Note">');
	});
});

describe("renderProjectData", () => {
	it("keeps an image inline when the document didn't show it", async () => {
		const project = { ...emptyProject(), plots: { base: PNGS[1], show: null } };
		const block = await renderProjectData(project, "<div>no images here</div>");
		const data = JSON.parse(new DOMParser().parseFromString(block, "text/html").querySelector("script").textContent);
		expect(data.project.plots.base).toBe(PNGS[1]);
		// и такой файл тоже открывается
		expect((await readProjectFromHTML(`<html><body>${block}</body></html>`)).plots.base).toBe(PNGS[1]);
	});
});

describe("readProjectFromHTML: files it refuses", () => {
	it("an HTML without the data block (old export, other site) → noData", async () => {
		await expectError("<!doctype html><html><body><img src=\"x.png\"><p>hello</p></body></html>", "noData");
		await expectError("", "noData");
	});

	it("broken JSON or a foreign data block → broken", async () => {
		await expectError(`<script type="application/json" id="${DATA_ELEMENT_ID}">{ nope</script>`, "broken");
		await expectError(fileWith({ app: "something-else", format: 1, project: {} }), "broken");
		await expectError(fileWith({ app: "light-note", format: 1, project: null }), "broken");
		await expectError(fileWith({ app: "light-note", format: 1 }), "broken");
		await expectError(fileWith(null), "broken");
	});

	it("made by a newer app (container format or project schema) → newer", async () => {
		await expectError(fileWith({ app: "light-note", format: FILE_FORMAT + 1, project: emptyProject() }), "newer");
		await expectError(fileWith({ app: "light-note", format: FILE_FORMAT, project: { ...emptyProject(), version: SCHEMA_VERSION + 1 } }), "newer");
	});

	it("the error carries a readable message too", () => {
		const error = new ProjectFileError("noData");
		expect(error.message).toBe("project file: noData");
		expect(error.name).toBe("ProjectFileError");
	});
});

describe("readProjectFromHTML: safety and repair", () => {
	it("never runs scripts from the file", async () => {
		const html = await renderExportHTML(fullProject());
		const evil = html.replace("<body>", "<body><script>window.__pwned = 1</script><img src=x onerror=\"window.__pwned = 2\">");
		await readProjectFromHTML(evil);
		await new Promise((resolve) => { setTimeout(resolve, 50); });
		expect(globalThis.__pwned).toBeUndefined();
	});

	it("only embedded images are accepted: links and javascript: become 'missing'", async () => {
		const data = {
			app: "light-note", format: 1,
			project: {
				...emptyProject(),
				// eslint-disable-next-line no-script-url -- проверяем, что такую ссылку импорт отбрасывает
				meta: { ...emptyProject().meta, logo: "javascript:alert(1)" },
				plots: { base: "https://example.com/plot.png", show: "__ref:plot:show" },
				photos: [{ id: "p1", src: "__ref:photo:p1", tag: "a" }, { id: "p2", src: "__ref:photo:p2", tag: "b" }],
			},
		};
		const images = `<img data-ln-ref="plot:show" src="https://evil.example/x.png"><img data-ln-ref="photo:p1" src="${PNGS[0]}">`;
		const project = await readProjectFromHTML(fileWith(data, images));
		expect(project.meta.logo).toBeNull();
		expect(project.plots).toEqual({ base: null, show: null });
		expect(project.photos.map((photo) => photo.src)).toEqual([PNGS[0], ""]); // p2: картинки нет в файле
	});

	it("the first picture with a reference wins (the same key twice)", async () => {
		const data = { app: "light-note", format: 1, project: { ...emptyProject(), plots: { base: "__ref:plot:base", show: null } } };
		const images = `<img data-ln-ref="plot:base" src="${PNGS[1]}"><img data-ln-ref="plot:base" src="${PNGS[2]}">`;
		expect((await readProjectFromHTML(fileWith(data, images))).plots.base).toBe(PNGS[1]);
	});

	it("repairs the project like a load does: bad entries dropped, ids added, sizes measured, version set", async () => {
		const data = {
			app: "light-note", format: 1,
			project: { meta: { programmer: "Old Name" }, photos: [null, { src: "__ref:x", tag: "no id" }], cues: [{ name: "Cue" }], fixtures: "nope" },
		};
		const project = await readProjectFromHTML(fileWith(data, `<img data-ln-ref="x" src="${PNGS[0]}">`));
		expect(project.version).toBe(SCHEMA_VERSION);
		expect(project.meta.director).toBe("Old Name");
		expect(project.fixtures).toEqual([]);
		expect(project.cues[0]).toMatchObject({ name: "Cue", trigger: "Go" });
		expect(project.photos).toHaveLength(1);
		expect(project.photos[0]).toMatchObject({ src: PNGS[0], tag: "no id", width: 40, height: 30 });
		expect(project.photos[0].id).toBeTruthy();
	});

	it("measures photos that come without a size", async () => {
		const data = { app: "light-note", format: 1, project: { ...emptyProject(), photos: [{ id: "p1", src: "__ref:photo:p1" }] } };
		const project = await readProjectFromHTML(fileWith(data, `<img data-ln-ref="photo:p1" src="${PNGS[0]}">`));
		expect(project.photos[0]).toMatchObject({ width: 40, height: 30 });
	});
});

describe("isEmptyProject", () => {
	it("empty means 'as after New', whatever the version", () => {
		expect(isEmptyProject(emptyProject())).toBe(true);
		expect(isEmptyProject({ ...emptyProject(), version: 0 })).toBe(true);
		expect(isEmptyProject({ ...emptyProject(), commentary: "x" })).toBe(false);
		expect(isEmptyProject({ ...emptyProject(), meta: { ...emptyProject().meta, showName: "A" } })).toBe(false);
	});
});
