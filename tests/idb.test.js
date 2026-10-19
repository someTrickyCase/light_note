import { beforeEach, describe, expect, it } from "vitest";
import * as idb from "../src/state/idb.js";
import { dumpDB, patch, putRaw, resetBrowserStorage, deleteDB } from "./helpers.js";

const blob = (text, type = "image/png") => new Blob([text], { type });

beforeEach(resetBrowserStorage);

describe("idb: schema", () => {
	it("creates v2 with project + blobs stores on first open", async () => {
		expect(await idb.getProject()).toBeNull();
		const snapshot = await dumpDB();
		expect(snapshot.version).toBe(2);
		expect(snapshot.stores.toSorted()).toEqual(["blobs", "project"]);
	});

	it("upgrades v1 (blobs only) to v2 and keeps old blobs", async () => {
		await putRaw(1, (database) => database.createObjectStore("blobs", { keyPath: "id" }), (t) => {
			t.objectStore("blobs").put({ id: "old", blob: blob("x"), mime: "image/png", bytes: 1 });
		});
		expect(await idb.listBlobKeys()).toEqual(["old"]);
		const snapshot = await dumpDB();
		expect(snapshot.version).toBe(2);
		expect(snapshot.stores).toContain("project");
	});

	it("open fails for a newer database version, and works again after it is gone", async () => {
		await putRaw(3, (database) => database.createObjectStore("future"), () => {});
		await expect(idb.getProject()).rejects.toMatchObject({ name: "VersionError" });
		await deleteDB();
		// кэш промиса сброшен после ошибки → повторное открытие работает
		expect(await idb.getProject()).toBeNull();
	});

	it("closes its connection when another tab deletes or upgrades the snapshot", async () => {
		await idb.getProject(); // соединение открыто
		await deleteDB(); // без versionchange-обработчика здесь был бы blocked навсегда
		expect(await idb.listBlobKeys()).toEqual([]); // и после этого открывается заново
	});
});

describe("idb: data", () => {
	it("writeProject stores JSON, puts and deletes blobs in one go", async () => {
		await idb.writeProject({ a: 1 }, [
			{ id: "k1", blob: blob("one"), mime: "image/jpeg" },
			{ id: "k2", blob: blob("two") },
		]);
		await idb.writeProject({ a: 2 }, [], ["k2"]);
		const snapshot = await dumpDB();
		expect(snapshot.project).toEqual({ a: 2 });
		expect(Object.keys(snapshot.blobs)).toEqual(["k1"]);
		expect(snapshot.blobs.k1).toMatchObject({ id: "k1", mime: "image/jpeg", bytes: 3 });
		expect(await (await idb.getBlob("k1")).text()).toBe("one");
	});

	it("mime falls back to blob.type, then to octet-stream", async () => {
		await idb.writeProject({}, [
			{ id: "typed", blob: blob("a", "image/webp") },
			{ id: "untyped", blob: new Blob(["b"]) },
		]);
		const snapshot = await dumpDB();
		expect(snapshot.blobs.typed.mime).toBe("image/webp");
		expect(snapshot.blobs.untyped.mime).toBe("application/octet-stream");
	});

	it("getBlob of an unknown key → null", async () => {
		expect(await idb.getBlob("nope")).toBeNull();
	});

	it("deleteBlobs removes the given keys; empty list is a no-op", async () => {
		await idb.writeProject({}, [{ id: "a", blob: blob("1") }, { id: "b", blob: blob("2") }, { id: "c", blob: blob("3") }]);
		await idb.deleteBlobs([]);
		await idb.deleteBlobs(["a", "c"]);
		expect(await idb.listBlobKeys()).toEqual(["b"]);
	});

	it("is atomic: if a put throws, nothing of the write is applied", async () => {
		await idb.writeProject({ v: "old" }, [{ id: "keep", blob: blob("1") }]);
		let calls = 0;
		patch(IDBObjectStore.prototype, "put", (original) => function put(...arguments_) {
			calls += 1;
			if (calls === 2) { throw new DOMException("disk full", "QuotaExceededError"); }
			return original.apply(this, arguments_);
		});
		await expect(idb.writeProject({ v: "new" }, [{ id: "x", blob: blob("1") }, { id: "y", blob: blob("2") }], ["keep"]))
			.rejects.toMatchObject({ name: "QuotaExceededError" });
		const snapshot = await dumpDB();
		expect(snapshot.project).toEqual({ v: "old" });
		expect(Object.keys(snapshot.blobs)).toEqual(["keep"]);
	});

	it("an aborted transaction without t.error still rejects with a real Error", async () => {
		patch(IDBObjectStore.prototype, "put", (original) => function put(...arguments_) {
			const request = original.apply(this, arguments_);
			this.transaction.abort(); // abort() → t.error === null
			return request;
		});
		await expect(idb.writeProject({ v: 1 })).rejects.toThrow("IndexedDB transaction aborted");
	});

	it("rejects when the transaction fails at the request level", async () => {
		// keyPath "id" + запись без id → DataError синхронно внутри work()
		await expect(idb.writeProject({}, [{ id: undefined, blob: blob("1") }])).rejects.toMatchObject({ name: "DataError" });
		expect(await idb.listBlobKeys()).toEqual([]);
	});
});
