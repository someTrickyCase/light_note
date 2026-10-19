// =====================================================================
// STATE · IndexedDB ДЛЯ БИНАРНЫХ ДАННЫХ (ФОТО И ПЛОТЫ)
// =====================================================================
// Лёгкая обёртка над IndexedDB без внешних зависимостей.
// Хранит Blob-объекты по строковому ключу. API: put / get / delete /
// listKeys / estimateBytes / clear. Все методы возвращают Promise.

const DB_NAME = "tld";
const DB_VERSION = 1;
const STORE = "blobs"; // object store: { id: string, blob: Blob, mime: string, bytes: number }

let _databasePromise = null;

function openDB() {
	if (_databasePromise) { return _databasePromise; }
	_databasePromise = new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);
		request.addEventListener("upgradeneeded", (event) => {
			const database = event.target.result;
			if (!database.objectStoreNames.contains(STORE)) {
				database.createObjectStore(STORE, { keyPath: "id" });
			}
		});
		request.addEventListener("success", () => resolve(request.result));
		request.addEventListener("error", () => reject(request.error));
	});
	return _databasePromise;
}

function tx(mode, function_) {
	return openDB().then(
		(database) =>
			new Promise((resolve, reject) => {
				const t = database.transaction(STORE, mode);
				const store = t.objectStore(STORE);
				let result;
				try {
					result = function_(store);
				} catch (error) {
					reject(error);
					return;
				}
				t.addEventListener("complete", () => resolve(result && result.value !== undefined ? result.value : result));
				t.addEventListener("error", () => reject(t.error));
				t.addEventListener("abort", () => reject(t.error));
			}),
	);
}

export function putBlob(id, blob, mime) {
	if (!blob) { return Promise.resolve(); }
	const bytes = blob.size || 0;
	return tx("readwrite", (store) => {
		store.put({ id, blob, mime: mime || blob.type || "application/octet-stream", bytes });
	});
}

export async function getBlob(id) {
	return tx("readonly", (store) => {
		return new Promise((resolve, reject) => {
			const request = store.get(id);
			request.addEventListener("success", () => resolve(request.result ? request.result.blob : null));
			request.addEventListener("error", () => reject(request.error));
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
	} catch {
		// ignore — fallback ниже
	}
	return tx("readonly", (store) => {
		return new Promise((resolve, reject) => {
			const request = store.openCursor();
			let total = 0;
			request.addEventListener("success", () => {
				const current = request.result;
				if (current) {
					total += current.value.bytes || 0;
					current.continue();
				} else {
					resolve(total);
				}
			});
			request.addEventListener("error", () => reject(request.error));
		});
	});
}

export async function clearBlobs() {
	return tx("readwrite", (store) => {
		store.clear();
	});
}
