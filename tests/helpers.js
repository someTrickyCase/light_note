// Общие помощники для тестов в настоящем браузере.

import { afterEach } from "vitest";

export const DB_NAME = "tld";
export const LEGACY_KEY = "tld.project.v1";

// Удаляет базу. Открытые соединения приложения закроются сами
// (обработчик versionchange в idb.js), поэтому blocked не ждём вечно.
export function deleteDB() {
	return new Promise((resolve, reject) => {
		const request = indexedDB.deleteDatabase(DB_NAME);
		request.addEventListener("success", () => resolve());
		request.addEventListener("error", () => reject(request.error));
	});
}

export async function resetBrowserStorage() {
	localStorage.clear();
	await deleteDB();
}

// Открывает базу напрямую (мимо idb.js). version — для подготовки старых схем.
export function openRaw(version, upgrade) {
	return new Promise((resolve, reject) => {
		const request = version ? indexedDB.open(DB_NAME, version) : indexedDB.open(DB_NAME);
		request.addEventListener("upgradeneeded", () => upgrade?.(request.result));
		request.addEventListener("success", () => resolve(request.result));
		request.addEventListener("error", () => reject(request.error));
	});
}

// Снимок того, что реально лежит в IndexedDB.
export async function dumpDB() {
	const database = await openRaw();
	const names = [...database.objectStoreNames];
	const out = { version: database.version, stores: names, project: null, blobs: {} };
	if (names.length === 0) { database.close(); return out; }
	await new Promise((resolve, reject) => {
		const t = database.transaction(names, "readonly");
		if (names.includes("project")) {
			const request = t.objectStore("project").get("current");
			request.addEventListener("success", () => { out.project = request.result ?? null; });
		}
		if (names.includes("blobs")) {
			const request = t.objectStore("blobs").getAll();
			request.addEventListener("success", () => {
				for (const record of request.result) { out.blobs[record.id] = record; }
			});
		}
		t.addEventListener("complete", resolve);
		t.addEventListener("error", () => reject(t.error));
	});
	database.close();
	return out;
}

export async function putRaw(version, upgrade, fill) {
	const database = await openRaw(version, upgrade);
	await new Promise((resolve, reject) => {
		const t = database.transaction([...database.objectStoreNames], "readwrite");
		fill(t);
		t.addEventListener("complete", resolve);
		t.addEventListener("error", () => reject(t.error));
	});
	database.close();
}

// Настоящий PNG через canvas — декодируется браузером.
export function makePng(width = 40, height = 30, color = "#c00") {
	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const context = canvas.getContext("2d");
	context.fillStyle = color;
	context.fillRect(0, 0, width, height);
	return canvas.toDataURL("image/png");
}

export function dataURLToBlob(dataURL) {
	const [head, body] = dataURL.split(",");
	const mime = /data:([^;]+)/.exec(head)[1];
	return new Blob([Uint8Array.from(atob(body), (c) => c.codePointAt(0))], { type: mime });
}

export function blobToDataURL(blob) {
	return new Promise((resolve) => {
		const reader = new FileReader();
		reader.addEventListener("load", () => resolve(reader.result));
		reader.readAsDataURL(blob);
	});
}

export const tick = (ms = 0) => new Promise((resolve) => { setTimeout(resolve, ms); });

// Временная подмена метода (например IDBObjectStore.prototype.put).
// Всё подменённое возвращается на место после каждого теста.
const restores = [];
export function patch(target, name, makeReplacement) {
	const original = target[name];
	target[name] = makeReplacement(original);
	restores.push(() => { target[name] = original; });
	return original;
}

// Подмена свойства через defineProperty (navigator.storage — getter на прототипе).
export function override(target, name, value) {
	Object.defineProperty(target, name, { value, configurable: true, writable: true });
	restores.push(() => { delete target[name]; });
}

afterEach(() => {
	while (restores.length > 0) { restores.pop()(); }
});
