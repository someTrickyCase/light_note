// =====================================================================
// STATE · ХРАНЕНИЕ ПРОЕКТА В INDEXEDDB
// =====================================================================
// В памяти (React state) картинки — обычные dataURL, поэтому превью и
// экспорт работают с ними напрямую. При сохранении:
//   JSON проекта → idb "project"; каждая картинка → idb "blobs" как Blob
//   по стабильному ключу (photo:<id>, plot:base, plot:show, logo),
//   а в JSON вместо неё маркер "__blob:<key>".
// Картинка пишется только если изменилась, удалённые — стираются.
//
// Раньше (до v0.4) проект жил в localStorage, а картинки при переполнении
// переносились в IDB с маркером "__idbRef:<id>". load() один раз переносит
// такой проект в новый формат и только после проверки удаляет старый ключ.

import { uid, emptyProject, STORAGE_KEY, SCHEMA_VERSION } from "./model.js";
import * as idb from "./idb.js";
import { measureImage } from "../utils/files.js";

const BLOB_PREFIX = "__blob:";
const LEGACY_PREFIX = "__idbRef:";

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

const hasPrefix = (value, prefix) => typeof value === "string" && value.startsWith(prefix);

// Применяет transform ко всем бинарным полям проекта: photos[].src, plots.base/show, meta.logo.
// transform(value, key, missing) → newValue | Promise<newValue>; key — стабильный ключ в IDB,
// missing — что подставить, если картинка потеряна. Поля обрабатываются параллельно.
async function mapBinaries(project, transform) {
	const photos = Array.isArray(project.photos)
		? await Promise.all(project.photos.map(async (photo) => {
			if (!photo?.src) { return photo; }
			const source = await transform(photo.src, `photo:${photo.id}`, "");
			return source === photo.src ? photo : { ...photo, src: source };
		}))
		: project.photos;

	const plots = project.plots
		? {
			...project.plots,
			...Object.fromEntries(await Promise.all(["base", "show"].map(async (which) => {
				const value = project.plots[which];
				return [which, value ? await transform(value, `plot:${which}`, null) : value];
			}))),
		}
		: project.plots;

	const meta = project.meta?.logo
		? { ...project.meta, logo: await transform(project.meta.logo, "logo", null) }
		: project.meta;

	return { ...project, photos, plots, meta };
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

// id фото — часть ключа картинки в IDB, поэтому он обязателен
const normalizePhoto = (photo) => ({ ...photo, id: photo.id || uid() });

const normalizeList = (list, normalize) =>
	(Array.isArray(list) ? list.filter(Boolean).map((item) => normalize(item)) : []);

function migrateProject(parsed) {
	return {
		...emptyProject(),
		...parsed,
		meta: migrateMeta(parsed.meta),
		times: migrateTimes(parsed.times),
		photos: normalizeList(parsed.photos, normalizePhoto),
		cues: normalizeList(parsed.cues, normalizeCue),
		fixtures: normalizeList(parsed.fixtures, normalizeFixture),
	};
}

// Фото до v0.4 не знают свой размер, а мозаике галереи нужно соотношение сторон.
// Меряем один раз при загрузке (размер сохранится со следующим сохранением).
// Не получилось (битая картинка) — без размера, галерея возьмёт запасное соотношение.
async function addPhotoSizes(project) {
	const photos = await Promise.all(project.photos.map(async (photo) => {
		if (!photo.src || (photo.width > 0 && photo.height > 0)) { return photo; }
		try {
			const { width, height } = await measureImage(photo.src);
			return { ...photo, width, height };
		} catch {
			return photo;
		}
	}));
	return { ...project, photos };
}

const isQuotaError = (error) =>
	Boolean(error) && (error.name === "QuotaExceededError" || /quota/i.test(String(error.message)));

// ---- миграция из localStorage (до v0.4) ----

function readLegacy() {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		return raw ? JSON.parse(raw) : null;
	} catch {
		return null;
	}
}

// старые маркеры "__idbRef:<id>" → dataURL из IDB (блобы старого offload'а)
function resolveLegacyReferences(project) {
	return mapBinaries(project, async (value, _key, missing) => {
		if (!hasPrefix(value, LEGACY_PREFIX)) { return value; }
		const blob = await idb.getBlob(value.slice(LEGACY_PREFIX.length));
		return blob ? blobToDataURL(blob) : missing;
	});
}

// Просим браузер не вытеснять данные при нехватке места на диске.
// Бэкапа нет, поэтому это важно. Браузер может отказать — не критично.
function requestPersistence() {
	navigator.storage?.persist?.().catch(() => {});
}

// ---- хранилище ----

// Фабрика: всё состояние (что записано, очередь, ошибки) живёт внутри
// замыкания, а не в модуле. Приложению нужен один экземпляр (storage ниже),
// тестам — свежий на каждый тест.
export function createStorage() {
	// Что уже лежит в IDB: ключ → dataURL. Сравниваем по === — для той же
	// строки это мгновенно, так неизменённые картинки не перекодируются.
	let written = new Map();
	let pending = null; // последний проект, который ещё не записан
	let running = null; // текущий цикл записи
	let loadPromise = null;
	let loadFailed = false;
	let onError = null; // (kind: "quota" | "error" | "load", error) → void, см. setErrorHandler

	async function writeProject(project) {
		const next = new Map();
		const puts = [];
		const slim = await mapBinaries(project, (value, key) => {
			if (written.get(key) === value) {
				next.set(key, value);
				return BLOB_PREFIX + key;
			}
			const parsed = dataURLToBlob(value);
			if (!parsed) { return value; } // не base64-dataURL — остаётся прямо в JSON
			puts.push({ id: key, blob: parsed.blob, mime: parsed.mime });
			next.set(key, value);
			return BLOB_PREFIX + key;
		});
		const deletes = [...written.keys()].filter((key) => !next.has(key));
		await idb.writeProject(slim, puts, deletes);
		// eslint-disable-next-line require-atomic-updates -- записи идут строго по одной (drain / load), гонки нет
		written = next;
	}

	// Маркеры "__blob:<key>" → dataURL из IDB; заполняет written.
	// Потерянное фото → пустая строка, потерянный плот/логотип → null.
	async function restoreBlobs(saved) {
		const restored = new Map();
		const project = await mapBinaries(saved, async (value, _key, missing) => {
			if (!hasPrefix(value, BLOB_PREFIX)) { return value; }
			const key = value.slice(BLOB_PREFIX.length);
			const blob = await idb.getBlob(key);
			if (!blob) { return missing; }
			const dataURL = await blobToDataURL(blob);
			restored.set(key, dataURL);
			return dataURL;
		});
		written = restored;
		return project;
	}

	// Удаляет картинки, на которые проект больше не ссылается
	// (остатки старого offload'а, следы прерванных сохранений).
	async function collectGarbage() {
		const keys = await idb.listBlobKeys();
		await idb.deleteBlobs(keys.filter((key) => !written.has(key)));
	}

	async function migrateFromLocalStorage(legacy) {
		const project = await addPhotoSizes(await resolveLegacyReferences(migrateProject(legacy)));
		written = new Map();
		await writeProject(project);

		// Проверка: читаем назад и сравниваем. Старый ключ удаляем только если всё совпало.
		const check = await restoreBlobs(await idb.getProject());
		if (JSON.stringify(check) !== JSON.stringify(project)) {
			throw new Error("migration check failed: saved project differs");
		}
		localStorage.removeItem(STORAGE_KEY);
		await collectGarbage();
		return project;
	}

	// Пишет проекты по очереди. Пока идёт запись, новые save() только заменяют
	// pending — после неё пишется лишь последняя версия (coalescing).
	async function drain() {
		while (pending) {
			const project = pending;
			pending = null;
			try {
				// eslint-disable-next-line no-await-in-loop -- записи намеренно последовательные
				await writeProject(project);
			} catch (error) {
				console.warn("[storage] save failed:", error);
				onError?.(isQuotaError(error) ? "quota" : "error", error);
			}
		}
		running = null;
	}

	async function loadOnce() {
		requestPersistence();
		try {
			// Старый ключ удаляется только после успешной миграции,
			// значит, если он есть — миграция ещё не сделана (или прервалась).
			const legacy = readLegacy();
			if (legacy) {
				if (legacy.version !== SCHEMA_VERSION) {
					throw new Error(`unknown legacy project version: ${legacy.version}`);
				}
				return await migrateFromLocalStorage(legacy);
			}
			const saved = await idb.getProject();
			if (!saved) { return emptyProject(); }
			if (saved.version !== SCHEMA_VERSION) {
				throw new Error(`unknown project version: ${saved.version}`);
			}
			// сначала санитизация (битые записи, фото без id), потом картинки
			const project = await addPhotoSizes(await restoreBlobs(migrateProject(saved)));
			collectGarbage().catch((error) => console.warn("[storage] cleanup failed:", error));
			return project;
		} catch (error) {
			console.warn("[storage] load failed:", error);
			loadFailed = true;
			onError?.("load", error);
			return emptyProject();
		}
	}

	return {
		// Загружает проект из IDB (или переносит старый из localStorage).
		// Выполняется один раз: StrictMode в dev вызывает эффект дважды, а две
		// параллельные миграции подрались бы за written.
		// Если прочитать не удалось — сохранение отключается, чтобы пустой
		// проект не перезаписал настоящий.
		load() {
			loadPromise ??= loadOnce();
			return loadPromise;
		},

		// Ставит проект в очередь на запись. Возвращает Promise, который
		// завершается, когда очередь пуста (ошибки уходят в обработчик из setErrorHandler).
		save(project) {
			if (loadFailed) { return Promise.resolve(); }
			pending = project;
			running ??= drain();
			return running;
		},

		// Сколько места занято и сколько доступно браузером: { usedBytes, quotaBytes }.
		// quotaBytes = 0, если браузер не умеет считать.
		async estimate() {
			try {
				const { usage = 0, quota = 0 } = await navigator.storage.estimate();
				return { usedBytes: usage, quotaBytes: quota };
			} catch {
				return { usedBytes: 0, quotaBytes: 0 };
			}
		},

		// Куда сообщать об ошибках загрузки/сохранения (App.jsx → тосты). null — отключить.
		setErrorHandler(handler) {
			onError = handler;
		},
	};
}

export const storage = createStorage();
