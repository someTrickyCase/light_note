// =====================================================================
// STATE · IndexedDB ДЛЯ БИНАРНЫХ ДАННЫХ (ФОТО И ПЛОТЫ)
// =====================================================================
// Лёгкая обёртка над IndexedDB без внешних зависимостей.
// Хранит Blob-объекты по строковому ключу. API: put / get / delete /
// listKeys / estimateBytes / clear. Все методы возвращают Promise.

const DB_NAME = "tld";
const DB_VERSION = 1;
const STORE = "blobs"; // object store: { id: string, blob: Blob, mime: string, bytes: number }

let _dbPromise = null;

function openDB() {
	if (_dbPromise) return _dbPromise;
	_dbPromise = new Promise((resolve, reject) => {
		const req = indexedDB.open(DB_NAME, DB_VERSION);
		req.onupgradeneeded = (e) => {
			const db = e.target.result;
			if (!db.objectStoreNames.contains(STORE)) {
				db.createObjectStore(STORE, { keyPath: "id" });
			}
		};
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
	return _dbPromise;
}

function tx(mode, fn) {
	return openDB().then(
		(db) =>
			new Promise((resolve, reject) => {
				const t = db.transaction(STORE, mode);
				const store = t.objectStore(STORE);
				let result;
				try {
					result = fn(store);
				} catch (err) {
					reject(err);
					return;
				}
				t.oncomplete = () => resolve(result && result.value !== undefined ? result.value : result);
				t.onerror = () => reject(t.error);
				t.onabort = () => reject(t.error);
			}),
	);
}

export async function putBlob(id, blob, mime) {
	if (!blob) return;
	const bytes = blob.size || 0;
	return tx("readwrite", (store) => {
		store.put({ id, blob, mime: mime || blob.type || "application/octet-stream", bytes });
	});
}

export async function getBlob(id) {
	return tx("readonly", (store) => {
		return new Promise((resolve, reject) => {
			const req = store.get(id);
			req.onsuccess = () => resolve(req.result ? req.result.blob : null);
			req.onerror = () => reject(req.error);
		});
	});
}

export async function deleteBlob(id) {
	return tx("readwrite", (store) => {
		store.delete(id);
	});
}

// Возвращает массив ключей, у которых размер > 0.
// Используется для estimateBytes (быстрее, чем считать navigator.storage.estimate).
export async function estimateBytes() {
	try {
		if (navigator.storage && typeof navigator.storage.estimate === "function") {
			const est = await navigator.storage.estimate();
			return Number(est.usage || 0);
		}
	} catch (_) {
		// ignore — fallback ниже
	}
	return tx("readonly", (store) => {
		return new Promise((resolve, reject) => {
			const req = store.openCursor();
			let total = 0;
			req.onsuccess = () => {
				const cur = req.result;
				if (cur) {
					total += cur.value.bytes || 0;
					cur.continue();
				} else {
					resolve(total);
				}
			};
			req.onerror = () => reject(req.error);
		});
	});
}

export async function clearBlobs() {
	return tx("readwrite", (store) => {
		store.clear();
	});
}
