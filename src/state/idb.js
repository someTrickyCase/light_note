// =====================================================================
// STATE · IndexedDB: ПРОЕКТ + БИНАРНЫЕ ДАННЫЕ
// =====================================================================
// Лёгкая обёртка над IndexedDB без внешних зависимостей. Два хранилища:
//   project — JSON проекта под ключом "current" (картинки заменены маркерами)
//   blobs   — картинки как Blob по стабильному ключу: photo:<id>, plot:base, logo
// Все методы возвращают Promise.

const DB_NAME = "tld";
// v1 — только blobs (offload из localStorage), v2 — добавлен project
const DB_VERSION = 2;
const PROJECT_STORE = "project";
const BLOB_STORE = "blobs"; // { id: string, blob: Blob, mime: string, bytes: number }
const PROJECT_KEY = "current";

let _databasePromise = null;

function openDB() {
	if (_databasePromise) { return _databasePromise; }
	_databasePromise = new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);
		request.addEventListener("upgradeneeded", () => {
			const database = request.result;
			if (!database.objectStoreNames.contains(BLOB_STORE)) {
				database.createObjectStore(BLOB_STORE, { keyPath: "id" });
			}
			if (!database.objectStoreNames.contains(PROJECT_STORE)) {
				database.createObjectStore(PROJECT_STORE);
			}
		});
		request.addEventListener("success", () => {
			const database = request.result;
			// Другая вкладка (новая версия приложения) хочет обновить или удалить базу —
			// закрываемся, иначе она будет ждать вечно. Следующий вызов откроет заново.
			database.addEventListener("versionchange", () => {
				database.close();
				_databasePromise = null;
			});
			resolve(database);
		});
		request.addEventListener("error", () => {
			_databasePromise = null; // дать шанс открыть снова
			reject(request.error);
		});
	});
	return _databasePromise;
}

// Запускает транзакцию по stores. work(store1, store2, ...) может вернуть
// функцию-«результат», которая вызывается после complete — так читаем
// значения request.result только когда транзакция точно завершилась.
async function tx(stores, mode, work) {
	const database = await openDB();
	return new Promise((resolve, reject) => {
		const t = database.transaction(stores, mode);
		let getResult;
		try {
			getResult = work(...stores.map((name) => t.objectStore(name)));
		} catch (error) {
			t.abort();
			reject(error);
			return;
		}
		t.addEventListener("complete", () => resolve(getResult ? getResult() : undefined));
		// после abort() t.error бывает null — отдаём настоящую ошибку, тосту нужен message
		const fail = () => reject(t.error ?? new Error("IndexedDB transaction aborted"));
		t.addEventListener("error", fail);
		t.addEventListener("abort", fail);
	});
}

export function getProject() {
	return tx([PROJECT_STORE], "readonly", (store) => {
		const request = store.get(PROJECT_KEY);
		return () => request.result ?? null;
	});
}

// Одна транзакция на всё: JSON проекта + новые/изменённые картинки + удаление
// лишних. Либо применяется всё, либо ничего (atomic) — проект не может
// сослаться на картинку, которая не записалась.
// puts: [{ id, blob, mime }], deletes: [id]
export function writeProject(project, puts = [], deletes = []) {
	return tx([PROJECT_STORE, BLOB_STORE], "readwrite", (projectStore, blobStore) => {
		for (const { id, blob, mime } of puts) {
			blobStore.put({ id, blob, mime: mime || blob.type || "application/octet-stream", bytes: blob.size || 0 });
		}
		for (const id of deletes) { blobStore.delete(id); }
		projectStore.put(project, PROJECT_KEY);
	});
}

export function getBlob(id) {
	return tx([BLOB_STORE], "readonly", (store) => {
		const request = store.get(id);
		return () => request.result?.blob ?? null;
	});
}

export function listBlobKeys() {
	return tx([BLOB_STORE], "readonly", (store) => {
		const request = store.getAllKeys();
		return () => request.result;
	});
}

export function deleteBlobs(ids) {
	if (ids.length === 0) { return Promise.resolve(); }
	return tx([BLOB_STORE], "readwrite", (store) => {
		for (const id of ids) { store.delete(id); }
	});
}
