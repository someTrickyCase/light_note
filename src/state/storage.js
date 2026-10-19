// =====================================================================
// STATE · LOCALSTORAGE С HYBRID IDB-ХРАНИЛИЩЕМ
// =====================================================================
// Метаданные — всегда в localStorage.
// Крупные бинарники (фото, плoты, логотип) — там же, пока есть запас.
// При переполнении localStorage автоматически переносим бинарники в
// IndexedDB, а в проекте заменяем их на маркеры "__idbRef:<id>".
// При load() восстанавливаем блобы из IDB обратно в src/dataURL поля.

import { uid, emptyProject, STORAGE_KEY } from "./model.js";
import * as idb from "./idb.js";

const PREFIX = "__idbRef:";

// dataURL "data:image/jpeg;base64,xxxxx" → { mime, blob }
function dataURLToBlob(dataURL) {
	if (!dataURL || typeof dataURL !== "string") { return null; }
	const m = /^data:([^;]+);base64,(.*)$/.exec(dataURL);
	if (!m) { return null; }
	const mime = m[1];
	// atob даёт «бинарную строку»: каждый символ — один байт (0–255)
	const bytes = Uint8Array.from(atob(m[2]), (char) => char.codePointAt(0));
	return { mime, blob: new Blob([bytes], { type: mime }) };
}

// Blob → dataURL "data:image/jpeg;base64,xxxxx"
function blobToDataURL(blob) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.addEventListener("load", () => resolve(reader.result));
		reader.addEventListener("error", () => reject(reader.error));
		reader.readAsDataURL(blob);
	});
}

// Стабильный id из существующего пути/имени файла + случайного суффикса.
// Используем имя файла (для фото) или "logo" / "plot:base" / "plot:show" как namespace.
function refIdFor(kind, key) {
	return `${kind}:${key}:${uid()}`;
}

const isRef = (value) => typeof value === "string" && value.startsWith(PREFIX);

// Одно бинарное поле → IDB. Возвращает маркер "__idbRef:<id>" или исходное
// значение, если переносить нечего (пусто, уже маркер, не dataURL).
async function offloadValue(value, kind, key) {
	if (!value || isRef(value)) { return value; }
	const parsed = dataURLToBlob(value);
	if (!parsed) { return value; }
	const refId = refIdFor(kind, key);
	await idb.putBlob(refId, parsed.blob, parsed.mime);
	return PREFIX + refId;
}

// Обратный путь для одного поля: маркер → dataURL из IDB.
// missing — что вернуть, если блоб потерян.
async function restoreValue(value, missing) {
	if (!isRef(value)) { return value; }
	const blob = await idb.getBlob(value.slice(PREFIX.length));
	return blob ? blobToDataURL(blob) : missing;
}

// Применяет fn ко всем бинарным полям проекта: photos[].src, plots.base/show, meta.logo.
// transform(value, kind, key, fallback) → Promise<newValue>. Поля обрабатываются параллельно.
async function mapBinaries(project, transform) {
	const photos = Array.isArray(project.photos)
		? await Promise.all(project.photos.map(async (photo, index) => {
			if (!photo || !photo.src) { return photo; }
			const source = await transform(photo.src, "photo", photo.id || String(index), "");
			return source === photo.src ? photo : { ...photo, src: source };
		}))
		: project.photos;

	const plots = project.plots
		? {
			...project.plots,
			...Object.fromEntries(await Promise.all(["base", "show"].map(async (which) => {
				const value = project.plots[which];
				return [which, value ? await transform(value, "plot", which, value) : value];
			}))),
		}
		: project.plots;

	const meta = project.meta?.logo
		? { ...project.meta, logo: await transform(project.meta.logo, "logo", "main", project.meta.logo) }
		: project.meta;

	return { ...project, photos, plots, meta };
}

// Переносит бинарники проекта в IDB, в проекте оставляет маркеры.
function moveBinariesToIDB(project) {
	return mapBinaries(project, (value, kind, key) => offloadValue(value, kind, key));
}

// Заменяет маркеры __idbRef:xxx на реальные dataURL из IDB.
// Потерянное фото → пустая строка; потерянный плот/логотип остаётся маркером.
export function resolveReferences(project) {
	if (!project) { return Promise.resolve(project); }
	return mapBinaries(project, (value, kind, key, missing) => restoreValue(value, missing));
}

// ---- миграции и санитизация сохранённого проекта ----

function migrateMeta(saved) {
	const meta = { ...emptyProject().meta, ...saved };
	if ("programmer" in meta) {
		meta.director = meta.director || meta.programmer;
		delete meta.programmer;
	}
	if (!("logo" in meta)) { meta.logo = null; }
	return meta;
}

function migrateTimes(saved) {
	const times = { ...emptyProject().times, ...saved };
	if (!Array.isArray(times.staff)) { times.staff = []; }
	return times;
}

const normalizeCue = (c) => ({
	id: c.id || uid(),
	num: c.num ?? "",
	name: c.name || "",
	info: c.info ?? "",
	cmd: c.cmd ?? "",
	fade: c.fade ?? "",
	trigger: c.trigger || "Go",
});

// санитизация fixtures: добавляем info если нет
const normalizeFixture = (f) => ({
	id: f.id || uid(),
	type: f.type || "",
	qty: Number(f.qty) || 1,
	info: f.info ?? "",
});

const normalizeList = (list, normalize) => (Array.isArray(list) ? list.map((item) => normalize(item)) : []);

function migrateProject(parsed) {
	return {
		...emptyProject(),
		...parsed,
		meta: migrateMeta(parsed.meta),
		times: migrateTimes(parsed.times),
		cues: normalizeList(parsed.cues, normalizeCue),
		fixtures: normalizeList(parsed.fixtures, normalizeFixture),
	};
}

const isQuotaError = (error) =>
	Boolean(error) && (error.name === "QuotaExceededError" || /quota/i.test(String(error.message)));

export const storage = {
	// Асинхронный: восстанавливает блобы из IDB перед возвратом.
	async load() {
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (!raw) { return emptyProject(); }
			const parsed = JSON.parse(raw);
			if (!parsed || parsed.version !== 1) { return emptyProject(); }
			return await resolveReferences(migrateProject(parsed));
		} catch (error) {
			console.warn("[storage] load failed:", error);
			return emptyProject();
		}
	},

	// Сохраняет проект. Если не влезает в localStorage — переносит
	// бинарники в IDB и пробует снова. Возвращает { ok, offloaded }.
	async save(project) {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
			return { ok: true, offloaded: false };
		} catch (error) {
			if (!isQuotaError(error)) {
				console.warn("[storage] save failed:", error);
				storage._onError?.(false, error);
				return { ok: false, offloaded: false };
			}
			return storage._offload(project, error);
		}
	},

	// Quota → переносим бинарники в IDB и сохраняем «облегчённый» проект
	async _offload(project, quotaError) {
		try {
			const slim = await moveBinariesToIDB(project);
			localStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
			storage._onError?.(true, quotaError, { offloaded: true });
			return { ok: true, offloaded: true };
		} catch (offloadError) {
			console.warn("[storage] offload failed:", offloadError);
			storage._onError?.(true, offloadError);
			return { ok: false, offloaded: false };
		}
	},

	clear() {
		try {
			localStorage.removeItem(STORAGE_KEY);
		} catch {
			// localStorage недоступен — очищать нечего
		}
		idb.clearBlobs().catch(() => {});
	},
	_onError: null,
};
