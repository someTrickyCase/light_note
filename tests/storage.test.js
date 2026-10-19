import { beforeEach, describe, expect, it, vi } from "vitest";
import { createStorage } from "../src/state/storage.js";
import { emptyProject } from "../src/state/model.js";
import {
	LEGACY_KEY, blobToDataURL, dataURLToBlob, dumpDB, makePng, override, patch, putRaw, resetBrowserStorage,
} from "./helpers.js";

beforeEach(async () => {
	await resetBrowserStorage();
	vi.spyOn(console, "warn").mockImplementation(() => {});
	return () => vi.restoreAllMocks();
});

const RED = makePng(40, 30, "#c00");
const BLUE = makePng(30, 40, "#00c");
const GREEN = makePng(50, 20, "#0a0");

function project(overrides = {}) {
	return { ...emptyProject(), ...overrides, meta: { ...emptyProject().meta, ...overrides.meta } };
}

const photo = (id, source, extra = {}) => ({ id, src: source, tag: "", caption: "", order: 0, ...extra });

// Свежее хранилище, уже загруженное (как после старта приложения)
async function loaded() {
	const storage = createStorage();
	const errors = [];
	storage.setErrorHandler((kind, error) => errors.push({ kind, error }));
	const loadedProject = await storage.load();
	return { storage, errors, loadedProject };
}

// Считает вызовы put по именам хранилищ
function countPuts() {
	const counts = { project: 0, blobs: 0 };
	patch(IDBObjectStore.prototype, "put", (original) => function put(...arguments_) {
		counts[this.name] += 1;
		return original.apply(this, arguments_);
	});
	return counts;
}

describe("storage: save + load round trip", () => {
	it("fresh start → empty project, nothing written yet", async () => {
		const { loadedProject, errors } = await loaded();
		expect(loadedProject).toEqual(emptyProject());
		expect(errors).toEqual([]);
		expect((await dumpDB()).project).toBeNull();
	});

	it("saves images as Blobs under stable keys and markers in JSON", async () => {
		const { storage } = await loaded();
		await storage.save(project({
			meta: { showName: "Hamlet", logo: GREEN },
			plots: { base: RED, show: null },
			photos: [photo("p1", BLUE)],
		}));
		const snapshot = await dumpDB();
		expect(snapshot.project.meta.logo).toBe("__blob:logo");
		expect(snapshot.project.plots).toEqual({ base: "__blob:plot:base", show: null });
		expect(snapshot.project.photos[0].src).toBe("__blob:photo:p1");
		expect(JSON.stringify(snapshot.project)).not.toContain("data:image");
		expect(Object.keys(snapshot.blobs).toSorted()).toEqual(["logo", "photo:p1", "plot:base"]);
		expect(snapshot.blobs["photo:p1"].blob).toBeInstanceOf(Blob);
		expect(snapshot.blobs["photo:p1"].mime).toBe("image/png");
		// Blob = сырые байты: меньше, чем base64-строка
		expect(snapshot.blobs["photo:p1"].bytes).toBeLessThan(BLUE.length);
	});

	it("a new storage instance loads back exactly what was saved", async () => {
		const original = project({
			meta: { showName: "Hamlet", logo: GREEN },
			plots: { base: RED, show: BLUE },
			photos: [photo("p1", BLUE, { tag: "Mac Quantum #5", width: 30, height: 40 }), photo("p2", RED, { width: 40, height: 30 })],
			cues: [{ id: "c1", num: 1, name: "Preset", info: "", cmd: "", fade: "3", trigger: "Go" }],
			commentary: "**bold**",
		});
		await (await loaded()).storage.save(original);
		const { loadedProject } = await loaded();
		expect(loadedProject).toEqual(original);
	});

	it("images survive byte for byte", async () => {
		const { storage } = await loaded();
		await storage.save(project({ photos: [photo("p1", RED)] }));
		const stored = (await dumpDB()).blobs["photo:p1"].blob;
		expect(await blobToDataURL(stored)).toBe(RED);
		expect(stored.size).toBe(dataURLToBlob(RED).size);
	});
});

describe("storage: only changed images are written (old KNOWN_ISSUES #1)", () => {
	it("typing 50 times re-writes the JSON but never the images", async () => {
		const { storage } = await loaded();
		const base = project({ plots: { base: RED, show: null }, photos: [photo("p1", BLUE)] });
		await storage.save(base);
		const counts = countPuts();
		for (let index = 0; index < 50; index += 1) {
			// eslint-disable-next-line no-await-in-loop -- каждое нажатие ждёт свою запись, как худший случай
			await storage.save({ ...base, meta: { ...base.meta, showName: "x".repeat(index) } });
		}
		expect(counts.blobs).toBe(0);
		expect(counts.project).toBe(50);
		expect(Object.keys((await dumpDB()).blobs)).toHaveLength(2);
	});

	it("after load, unchanged images are not re-written either", async () => {
		const first = await loaded();
		const saved = project({ photos: [photo("p1", BLUE)] });
		await first.storage.save(saved);
		const { storage, loadedProject } = await loaded();
		const counts = countPuts();
		await storage.save({ ...loadedProject, commentary: "changed" });
		expect(counts.blobs).toBe(0);
	});

	it("replacing an image overwrites the same key", async () => {
		const { storage } = await loaded();
		await storage.save(project({ plots: { base: RED, show: null } }));
		await storage.save(project({ plots: { base: BLUE, show: null } }));
		const snapshot = await dumpDB();
		expect(Object.keys(snapshot.blobs)).toEqual(["plot:base"]);
		expect(await blobToDataURL(snapshot.blobs["plot:base"].blob)).toBe(BLUE);
	});

	it("removing photo / plot / logo deletes their blobs", async () => {
		const { storage } = await loaded();
		await storage.save(project({
			meta: { logo: GREEN }, plots: { base: RED, show: BLUE }, photos: [photo("p1", RED), photo("p2", BLUE)],
		}));
		await storage.save(project({ plots: { base: RED, show: null }, photos: [photo("p2", BLUE)] }));
		expect(Object.keys((await dumpDB()).blobs).toSorted()).toEqual(["photo:p2", "plot:base"]);
		await storage.save(emptyProject()); // «Новый проект»
		expect((await dumpDB()).blobs).toEqual({});
	});
});

describe("storage: odd values", () => {
	it("non-base64 or non-string image values stay inline in JSON", async () => {
		const svg = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'/>";
		const { storage } = await loaded();
		await storage.save(project({
			plots: { base: svg, show: null },
			photos: [photo("p1", "https://x/y.jpg"), photo("p2", ""), photo("p3", 42)],
		}));
		const snapshot = await dumpDB();
		expect(snapshot.project.plots.base).toBe(svg);
		expect(snapshot.project.photos.map((p) => p.src)).toEqual(["https://x/y.jpg", "", 42]);
		expect(snapshot.blobs).toEqual({});
		// и так же загружаются обратно
		const { loadedProject } = await loaded();
		expect(loadedProject.plots.base).toBe(svg);
		expect(loadedProject.photos.map((p) => p.src)).toEqual(["https://x/y.jpg", "", 42]);
	});

	it("survives a project without photos array, plots or meta", async () => {
		const { storage, errors } = await loaded();
		await storage.save({ version: 1, photos: null });
		expect(errors).toEqual([]);
		expect((await dumpDB()).project).toEqual({ version: 1, photos: null });
	});

	it("lost blobs: photo → empty src, plot / logo → null", async () => {
		await (await loaded()).storage.save(project({
			meta: { logo: GREEN }, plots: { base: RED, show: null }, photos: [photo("p1", BLUE)],
		}));
		await putRaw(undefined, undefined, (t) => { t.objectStore("blobs").clear(); });
		const { loadedProject } = await loaded();
		expect(loadedProject.photos[0].src).toBe("");
		expect(loadedProject.plots.base).toBeNull();
		expect(loadedProject.meta.logo).toBeNull();
	});

	it("load deletes blobs that nothing refers to", async () => {
		await (await loaded()).storage.save(project({ photos: [photo("p1", RED)] }));
		await putRaw(undefined, undefined, (t) => {
			t.objectStore("blobs").put({ id: "photo:ghost", blob: dataURLToBlob(BLUE), mime: "image/png", bytes: 1 });
		});
		await loaded();
		await vi.waitFor(async () => {
			expect(Object.keys((await dumpDB()).blobs)).toEqual(["photo:p1"]);
		});
	});

	it("a failing cleanup does not break load", async () => {
		await (await loaded()).storage.save(project({ meta: { showName: "ok" } }));
		patch(IDBObjectStore.prototype, "getAllKeys", () => () => { throw new Error("boom"); });
		const { loadedProject, errors } = await loaded();
		expect(loadedProject.meta.showName).toBe("ok");
		expect(errors).toEqual([]);
		await vi.waitFor(() => expect(console.warn).toHaveBeenCalledWith("[storage] cleanup failed:", expect.any(Error)));
	});
});

describe("storage: save queue", () => {
	it("coalesces: 20 quick saves → first + last are written", async () => {
		const { storage } = await loaded();
		const counts = countPuts();
		let last;
		for (let index = 1; index <= 20; index += 1) {
			last = storage.save(project({ meta: { showName: `v${index}` } }));
		}
		await last;
		expect(counts.project).toBe(2);
		expect((await dumpDB()).project.meta.showName).toBe("v20");
	});

	it("all save() calls during one drain return the same promise", async () => {
		const { storage } = await loaded();
		const a = storage.save(project());
		const b = storage.save(project());
		expect(a).toBe(b);
		await a;
		expect(storage.save(project())).not.toBe(a); // новый цикл после завершения
	});

	it("a failed save reports 'error' and the next save retries the image", async () => {
		const { storage, errors } = await loaded();
		let fail = true;
		patch(IDBObjectStore.prototype, "put", (original) => function put(...arguments_) {
			if (fail) { throw new DOMException("nope", "UnknownError"); }
			return original.apply(this, arguments_);
		});
		const withPhoto = project({ photos: [photo("p1", RED)] });
		await storage.save(withPhoto);
		expect(errors).toHaveLength(1);
		expect(errors[0].kind).toBe("error");
		expect(errors[0].error.name).toBe("UnknownError");

		fail = false;
		await storage.save(withPhoto); // та же картинка: written не обновился → пишется снова
		expect(Object.keys((await dumpDB()).blobs)).toEqual(["photo:p1"]);
		expect(errors).toHaveLength(1);
	});

	it("QuotaExceededError → 'quota'", async () => {
		const { storage, errors } = await loaded();
		patch(IDBObjectStore.prototype, "put", () => () => { throw new DOMException("full", "QuotaExceededError"); });
		await storage.save(project({ photos: [photo("p1", RED)] }));
		expect(errors.map((error) => error.kind)).toEqual(["quota"]);
	});

	it("an error whose message mentions quota → 'quota' too", async () => {
		const { storage, errors } = await loaded();
		patch(IDBObjectStore.prototype, "put", () => () => { throw new Error("Storage quota reached"); });
		await storage.save(project());
		expect(errors.map((error) => error.kind)).toEqual(["quota"]);
	});

	it("errors without a handler only warn", async () => {
		const storage = createStorage();
		await storage.load();
		patch(IDBObjectStore.prototype, "put", () => () => { throw new Error("x"); });
		await expect(storage.save(project())).resolves.toBeUndefined();
		expect(console.warn).toHaveBeenCalledWith("[storage] save failed:", expect.any(Error));
	});

	it("setErrorHandler(null) switches reporting off", async () => {
		const { storage, errors } = await loaded();
		storage.setErrorHandler(null);
		patch(IDBObjectStore.prototype, "put", () => () => { throw new Error("x"); });
		await storage.save(project());
		expect(errors).toEqual([]);
	});
});

describe("storage: load safety", () => {
	it("load() runs once even when called twice (StrictMode)", async () => {
		const storage = createStorage();
		const getCalls = [];
		patch(IDBObjectStore.prototype, "get", (original) => function get(...arguments_) {
			getCalls.push(this.name);
			return original.apply(this, arguments_);
		});
		const [a, b] = await Promise.all([storage.load(), storage.load()]);
		expect(a).toBe(b);
		expect(getCalls).toEqual(["project"]);
	});

	it("unknown saved version → 'load' error, saving disabled, data untouched", async () => {
		await putRaw(2, (database) => {
			database.createObjectStore("blobs", { keyPath: "id" });
			database.createObjectStore("project");
		}, (t) => { t.objectStore("project").put({ version: 99, secret: "keep me" }, "current"); });
		const { storage, errors, loadedProject } = await loaded();
		expect(loadedProject).toEqual(emptyProject());
		expect(errors.map((error) => error.kind)).toEqual(["load"]);
		expect(errors[0].error.message).toContain("99");
		await storage.save(project({ meta: { showName: "overwrite?" } }));
		expect((await dumpDB()).project).toEqual({ version: 99, secret: "keep me" });
	});

	it("database that can't be opened → 'load' error, saving disabled", async () => {
		await putRaw(5, (database) => database.createObjectStore("x"), () => {});
		const { storage, errors } = await loaded();
		expect(errors.map((error) => error.kind)).toEqual(["load"]);
		expect(errors[0].error.name).toBe("VersionError");
		await expect(storage.save(project())).resolves.toBeUndefined();
	});

	it("loaded projects are sanitized (migrations run on every load)", async () => {
		await putRaw(2, (database) => {
			database.createObjectStore("blobs", { keyPath: "id" });
			database.createObjectStore("project");
		}, (t) => {
			t.objectStore("project").put({
				version: 1,
				meta: { showName: "S", programmer: "P" },
				times: { installation: "2h", staff: "bad" },
				photos: [null, { src: "", tag: "no id" }],
				cues: [{ num: 2 }, null],
				fixtures: [{ type: "Mac", qty: "3" }, { qty: "abc" }],
			}, "current");
		});
		const { loadedProject } = await loaded();
		expect(loadedProject.meta).toMatchObject({ showName: "S", director: "P", logo: null });
		expect(loadedProject.meta).not.toHaveProperty("programmer");
		expect(loadedProject.times).toMatchObject({ installation: "2h", staff: [] });
		expect(loadedProject.photos).toHaveLength(1);
		expect(loadedProject.photos[0].id).toMatch(/^id-/);
		expect(loadedProject.cues).toEqual([{ id: expect.stringMatching(/^id-/), num: 2, name: "", info: "", cmd: "", fade: "", trigger: "Go" }]);
		expect(loadedProject.fixtures.map((f) => [f.type, f.qty, f.info])).toEqual([["Mac", 3, ""], ["", 1, ""]]);
		expect(loadedProject.plots).toEqual({ base: null, show: null });
	});

	it("director wins over programmer when both exist", async () => {
		await (await loaded()).storage.save({ ...project(), meta: { ...project().meta, director: "D", programmer: "P" } });
		expect((await loaded()).loadedProject.meta.director).toBe("D");
	});
});

describe("storage: migration from localStorage (≤ v0.3)", () => {
	// Старая схема: проект в localStorage, часть картинок вынесена в IDB v1 по случайным id
	async function seedLegacy(legacyProject, blobs = {}) {
		await putRaw(1, (database) => database.createObjectStore("blobs", { keyPath: "id" }), (t) => {
			for (const [id, dataURL] of Object.entries(blobs)) {
				t.objectStore("blobs").put({ id, blob: dataURLToBlob(dataURL), mime: "image/png", bytes: 1 });
			}
		});
		localStorage.setItem(LEGACY_KEY, JSON.stringify(legacyProject));
	}

	const legacy = {
		version: 1,
		meta: { showName: "Legacy", programmer: "Kirk", logo: "__idbRef:logo:main:id-l" },
		times: { installation: "4h" },
		plots: { base: "__idbRef:plot:base:id-b", show: "__idbRef:plot:show:id-lost" },
		photos: [
			photo("p1", RED, { tag: "inline" }),
			photo("p2", "__idbRef:photo:p2:id-2", { tag: "offloaded" }),
			photo("p3", "__idbRef:photo:p3:id-lost", { tag: "lost" }),
		],
		cues: [{ num: 1, name: "Preset" }],
		commentary: "hi",
	};

	it("moves everything to the new layout and removes the old copy", async () => {
		await seedLegacy(legacy, { "logo:main:id-l": GREEN, "plot:base:id-b": BLUE, "photo:p2:id-2": BLUE, "photo:orphan:id-x": RED });
		const { loadedProject, errors } = await loaded();
		expect(errors).toEqual([]);
		expect(loadedProject.meta).toMatchObject({ showName: "Legacy", director: "Kirk", logo: GREEN });
		expect(loadedProject.plots).toEqual({ base: BLUE, show: null }); // потерянный плот → null
		expect(loadedProject.photos.map((p) => p.src)).toEqual([RED, BLUE, ""]); // потерянное фото → ""
		expect(localStorage.getItem(LEGACY_KEY)).toBeNull();

		const snapshot = await dumpDB();
		expect(Object.keys(snapshot.blobs).toSorted()).toEqual(["logo", "photo:p1", "photo:p2", "plot:base"]);
		expect(snapshot.project.meta.showName).toBe("Legacy");

		// и это загружается обычным путём
		expect((await loaded()).loadedProject).toEqual(loadedProject);
	});

	it("after migration the old blobs are not re-written on the next save", async () => {
		await seedLegacy(legacy, { "plot:base:id-b": BLUE });
		const { storage, loadedProject } = await loaded();
		const counts = countPuts();
		await storage.save({ ...loadedProject, commentary: "edited" });
		expect(counts.blobs).toBe(0);
	});

	it("a broken check keeps the old copy, and the next start retries", async () => {
		await seedLegacy(legacy, { "plot:base:id-b": BLUE });
		const restore = patch(IDBObjectStore.prototype, "put", (original) => function put(value, ...rest) {
			// портим JSON проекта при записи → проверка «прочитать и сравнить» не сойдётся
			return original.call(this, this.name === "project" ? { ...value, commentary: "corrupted" } : value, ...rest);
		});
		const first = await loaded();
		expect(first.errors.map((error) => error.kind)).toEqual(["load"]);
		expect(first.errors[0].error.message).toContain("migration check failed");
		expect(localStorage.getItem(LEGACY_KEY)).not.toBeNull();
		// сохранение выключено — испорченная копия не «чинится» поверх
		await first.storage.save(project());
		expect(localStorage.getItem(LEGACY_KEY)).not.toBeNull();

		IDBObjectStore.prototype.put = restore;
		const second = await loaded();
		expect(second.errors).toEqual([]);
		expect(second.loadedProject.commentary).toBe("hi");
		expect(localStorage.getItem(LEGACY_KEY)).toBeNull();
	});

	it("unknown legacy version → 'load' error, old copy kept", async () => {
		localStorage.setItem(LEGACY_KEY, JSON.stringify({ version: 7 }));
		const { errors } = await loaded();
		expect(errors[0].error.message).toContain("legacy");
		expect(localStorage.getItem(LEGACY_KEY)).not.toBeNull();
	});

	it("broken legacy JSON is ignored (starts empty, key stays for manual rescue)", async () => {
		localStorage.setItem(LEGACY_KEY, "{not json");
		const { loadedProject, errors } = await loaded();
		expect(errors).toEqual([]);
		expect(loadedProject).toEqual(emptyProject());
		expect(localStorage.getItem(LEGACY_KEY)).toBe("{not json");
	});

	it("legacy that is literally null/empty is treated as no legacy", async () => {
		localStorage.setItem(LEGACY_KEY, "");
		expect((await loaded()).loadedProject).toEqual(emptyProject());
	});
});

describe("storage: photo sizes for the mosaic (projects before v0.4)", () => {
	const seedSaved = (photos) => putRaw(2, (database) => {
		database.createObjectStore("blobs", { keyPath: "id" });
		database.createObjectStore("project");
	}, (t) => { t.objectStore("project").put({ ...project(), photos }, "current"); });

	it("measures photos that have no size yet", async () => {
		await seedSaved([photo("p1", RED), photo("p2", BLUE)]);
		const { loadedProject } = await loaded();
		expect(loadedProject.photos.map(({ width, height }) => [width, height])).toEqual([[40, 30], [30, 40]]);
	});

	it("the size is saved with the next save (images are not re-written)", async () => {
		await seedSaved([photo("p1", RED)]);
		const { storage, loadedProject } = await loaded();
		await storage.save(loadedProject);
		expect((await dumpDB()).project.photos[0]).toMatchObject({ width: 40, height: 30 });
	});

	it("keeps a size that is already there (no re-measure)", async () => {
		await seedSaved([photo("p1", RED, { width: 4000, height: 3000 })]);
		const { loadedProject } = await loaded();
		expect(loadedProject.photos[0]).toMatchObject({ width: 4000, height: 3000 });
	});

	it("a broken or empty picture stays without size, and load still works", async () => {
		await seedSaved([photo("p1", "data:image/png;base64,AAAA"), photo("p2", ""), photo("p3", GREEN, { width: 0, height: 0 })]);
		const { loadedProject, errors } = await loaded();
		expect(errors).toEqual([]);
		expect(loadedProject.photos[0]).not.toHaveProperty("width");
		expect(loadedProject.photos[1]).not.toHaveProperty("width");
		expect(loadedProject.photos[2]).toMatchObject({ width: 50, height: 20 }); // 0×0 = неизвестно → меряем
	});

	it("legacy migration also adds the sizes", async () => {
		localStorage.setItem(LEGACY_KEY, JSON.stringify({ ...project(), photos: [photo("p1", BLUE)] }));
		const { loadedProject, errors } = await loaded();
		expect(errors).toEqual([]);
		expect(loadedProject.photos[0]).toMatchObject({ width: 30, height: 40 });
		expect((await dumpDB()).project.photos[0]).toMatchObject({ width: 30, height: 40 });
	});
});

describe("storage: browser APIs", () => {
	it("asks the browser for persistent storage on load", async () => {
		const persist = vi.fn(() => Promise.resolve(true));
		override(navigator, "storage", { persist, estimate: navigator.storage.estimate.bind(navigator.storage) });
		await createStorage().load();
		expect(persist).toHaveBeenCalledOnce();
	});

	it("a refused or missing persist() is fine", async () => {
		override(navigator, "storage", { persist: () => Promise.reject(new Error("denied")) });
		expect((await loaded()).errors).toEqual([]);
		override(navigator, "storage", {});
		expect((await loaded()).errors).toEqual([]);
		override(navigator, "storage", undefined);
		expect((await loaded()).errors).toEqual([]);
	});

	it("estimate() returns real browser numbers", async () => {
		const { usedBytes, quotaBytes } = await createStorage().estimate();
		expect(quotaBytes).toBeGreaterThan(0);
		expect(usedBytes).toBeGreaterThanOrEqual(0);
	});

	it("estimate() fills missing fields with 0 and survives errors", async () => {
		override(navigator, "storage", { estimate: () => Promise.resolve({}) });
		expect(await createStorage().estimate()).toEqual({ usedBytes: 0, quotaBytes: 0 });
		override(navigator, "storage", { estimate: () => Promise.reject(new Error("no")) });
		expect(await createStorage().estimate()).toEqual({ usedBytes: 0, quotaBytes: 0 });
		override(navigator, "storage", undefined);
		expect(await createStorage().estimate()).toEqual({ usedBytes: 0, quotaBytes: 0 });
	});

	it("the app-wide instance exists and has the full API", async () => {
		const { storage } = await import("../src/state/storage.js");
		expect(Object.keys(storage).toSorted()).toEqual(["estimate", "load", "save", "setErrorHandler"]);
	});
});
