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
	if (!dataURL || typeof dataURL !== "string") return null;
	const m = /^data:([^;]+);base64,(.*)$/.exec(dataURL);
	if (!m) return null;
	const mime = m[1];
	const bin = atob(m[2]);
	const bytes = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
	return { mime, blob: new Blob([bytes], { type: mime }) };
}

// Blob → dataURL "data:image/jpeg;base64,xxxxx"
function blobToDataURL(blob, mime) {
	return new Promise((resolve, reject) => {
		const r = new FileReader();
		r.onload = () => resolve(r.result);
		r.onerror = () => reject(r.error);
		r.readAsDataURL(blob);
	});
}

// Стабильный id из существующего пути/имени файла + случайного суффикса.
// Используем имя файла (для фото) или "logo" / "plot:base" / "plot:show" как namespace.
function refIdFor(kind, key) {
	return `${kind}:${key}:${uid()}`;
}

// Рекурсивно обходит проект, вытаскивая бинарники из полей photos[].src,
// plots.base/show и meta.logo. Возвращает новый проект + список перенесённых блобов.
async function moveBinariesToIDB(project, alreadyRefs) {
	let next = project;
	const moved = []; // {kind, refId, blob, mime, restore(fieldPath)}

	// photos
	if (Array.isArray(next.photos)) {
		const newPhotos = [];
		for (let i = 0; i < next.photos.length; i++) {
			const ph = next.photos[i];
			if (!ph || !ph.src) { newPhotos.push(ph); continue; }
			if (typeof ph.src === "string" && ph.src.startsWith(PREFIX)) {
				// уже в IDB, оставляем
				newPhotos.push(ph);
				continue;
			}
			const parsed = dataURLToBlob(ph.src);
			if (!parsed) { newPhotos.push(ph); continue; }
			const refId = refIdFor("photo", ph.id || String(i));
			await idb.putBlob(refId, parsed.blob, parsed.mime);
			moved.push({ refId, blob: parsed.blob, mime: parsed.mime });
			newPhotos.push({ ...ph, src: PREFIX + refId });
		}
		next = { ...next, photos: newPhotos };
	}

	// plots: { base, show }
	if (next.plots && (next.plots.base || next.plots.show)) {
		const newPlots = { ...next.plots };
		for (const which of ["base", "show"]) {
			const v = newPlots[which];
			if (!v) continue;
			if (typeof v === "string" && v.startsWith(PREFIX)) continue;
			const parsed = dataURLToBlob(v);
			if (!parsed) continue;
			const refId = refIdFor("plot", which);
			await idb.putBlob(refId, parsed.blob, parsed.mime);
			moved.push({ refId, blob: parsed.blob, mime: parsed.mime });
			newPlots[which] = PREFIX + refId;
		}
		next = { ...next, plots: newPlots };
	}

	// meta.logo
	if (next.meta && next.meta.logo && typeof next.meta.logo === "string" && !next.meta.logo.startsWith(PREFIX)) {
		const parsed = dataURLToBlob(next.meta.logo);
		if (parsed) {
			const refId = refIdFor("logo", "main");
			await idb.putBlob(refId, parsed.blob, parsed.mime);
			moved.push({ refId, blob: parsed.blob, mime: parsed.mime });
			next = { ...next, meta: { ...next.meta, logo: PREFIX + refId } };
		}
	}

	return { project: next, moved };
}

// Обратный путь: проходим проект и заменяем __idbRef:xxx на реальные dataURL из IDB.
export async function resolveRefs(project) {
	if (!project) return project;
	let next = project;

	// photos
	if (Array.isArray(next.photos)) {
		const newPhotos = [];
		for (let i = 0; i < next.photos.length; i++) {
			const ph = next.photos[i];
			if (!ph || typeof ph.src !== "string" || !ph.src.startsWith(PREFIX)) {
				newPhotos.push(ph);
				continue;
			}
			const refId = ph.src.slice(PREFIX.length);
			const blob = await idb.getBlob(refId);
			if (!blob) { newPhotos.push({ ...ph, src: "" }); continue; } // блоб потерян — пусто
			const dataURL = await blobToDataURL(blob);
			newPhotos.push({ ...ph, src: dataURL });
		}
		next = { ...next, photos: newPhotos };
	}

	// plots
	if (next.plots && (next.plots.base || next.plots.show)) {
		const newPlots = { ...next.plots };
		for (const which of ["base", "show"]) {
			const v = newPlots[which];
			if (!v || typeof v !== "string" || !v.startsWith(PREFIX)) continue;
			const refId = v.slice(PREFIX.length);
			const blob = await idb.getBlob(refId);
			if (blob) newPlots[which] = await blobToDataURL(blob);
		}
		next = { ...next, plots: newPlots };
	}

	// logo
	if (next.meta && next.meta.logo && typeof next.meta.logo === "string" && next.meta.logo.startsWith(PREFIX)) {
		const refId = next.meta.logo.slice(PREFIX.length);
		const blob = await idb.getBlob(refId);
		if (blob) next = { ...next, meta: { ...next.meta, logo: await blobToDataURL(blob) } };
	}

	return next;
}

export const storage = {
	// Асинхронный: восстанавливает блобы из IDB перед возвратом.
	async load() {
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (!raw) return emptyProject();
			const parsed = JSON.parse(raw);
			if (!parsed || parsed.version !== 1) return emptyProject();
			const m = { ...emptyProject().meta, ...(parsed.meta || {}) };
			if ("programmer" in m) {
				m.director = m.director || m.programmer;
				delete m.programmer;
			}
			if (!("logo" in m)) m.logo = null;
			const tm = { ...emptyProject().times, ...(parsed.times || {}) };
			if (!Array.isArray(tm.staff)) tm.staff = [];
			const cues = Array.isArray(parsed.cues) ? parsed.cues.map((c) => ({
				id: c.id || uid(),
				num: c.num ?? "",
				name: c.name || "",
				info: c.info ?? "",
				trigger: c.trigger || "Go",
			})) : [];
			const base = { ...emptyProject(), ...parsed, meta: m, times: tm, cues };
			return await resolveRefs(base);
		} catch (e) {
			console.warn("[storage] load failed:", e);
			return emptyProject();
		}
	},

	// Сохраняет проект. Если не влезает в localStorage — переносит
	// бинарники в IDB и пробует снова. Возвращает { ok, offloaded }.
	async save(project) {
		const raw = JSON.stringify(project);
		try {
			localStorage.setItem(STORAGE_KEY, raw);
			return { ok: true, offloaded: false };
		} catch (e) {
			const isQuota =
				e && (e.name === "QuotaExceededError" || /quota/i.test(String(e.message)));
			if (!isQuota) {
				console.warn("[storage] save failed:", e);
				if (storage._onError) storage._onError(false, e);
				return { ok: false, offloaded: false };
			}
			// Quota → переносим бинарники в IDB
			try {
				const { project: slim } = await moveBinariesToIDB(project);
				localStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
				console.info("[storage] offloaded binaries to IDB");
				if (storage._onError) storage._onError(true, e, { offloaded: true });
				return { ok: true, offloaded: true };
			} catch (e2) {
				console.warn("[storage] offload failed:", e2);
				if (storage._onError) storage._onError(true, e2);
				return { ok: false, offloaded: false };
			}
		}
	},

	clear() {
		try { localStorage.removeItem(STORAGE_KEY); } catch {}
		idb.clearBlobs().catch(() => {});
	},
	_onError: null,
};
