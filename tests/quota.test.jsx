import { afterEach, describe, expect, it } from "vitest";
import { LOW_SPACE_BYTES, formatBytes, freeBytes, isSpaceLow } from "../src/utils/storageQuota.js";
import { useSpaceWarning } from "../src/utils/useSpaceWarning.js";
import { getToastQueue, dismissToast } from "../src/utils/toast.js";
import { makeTranslator } from "../src/i18n/translate.js";
import { override } from "./helpers.js";
import { render, settle } from "./react.jsx";

const { t, tn } = makeTranslator("ru");
const KB = 1024;
const MB = KB * 1024;
const GB = MB * 1024;

afterEach(() => {
	for (const toast of getToastQueue()) { dismissToast(toast.id); }
});

describe("storageQuota", () => {
	it("formatBytes picks the unit", () => {
		expect(formatBytes(0, t)).toBe("0 Б");
		expect(formatBytes(1023, t)).toBe("1023 Б");
		expect(formatBytes(1536, t)).toBe("1.5 КБ");
		expect(formatBytes(5 * MB, t)).toBe("5.00 МБ");
		expect(formatBytes(2.5 * GB, t)).toBe("2.50 ГБ");
	});

	it("the warning line is 1 GB", () => {
		expect(LOW_SPACE_BYTES).toBe(GB);
	});

	it("freeBytes: what the browser still allows, never negative, null if unknown", () => {
		expect(freeBytes(300 * MB, GB)).toBe(724 * MB);
		expect(freeBytes(3 * GB, GB)).toBe(0);
		expect(freeBytes(5 * GB, 0)).toBeNull();
	});

	it("isSpaceLow: exact edge at 1 GB left", () => {
		expect(isSpaceLow(0, 100 * GB)).toBe(false);
		expect(isSpaceLow(99 * GB, 100 * GB)).toBe(false); // ровно 1 ГБ — ещё не мало
		expect(isSpaceLow(99 * GB + 1, 100 * GB)).toBe(true);
		expect(isSpaceLow(0, 500 * MB)).toBe(true); // маленький потолок — сразу мало
		expect(isSpaceLow(200 * GB, 100 * GB)).toBe(true);
	});

	it("unknown quota (0) never warns", () => {
		expect(isSpaceLow(10 * GB, 0)).toBe(false);
	});
});

describe("useSpaceWarning", () => {
	// управляемый navigator.storage
	function fakeStorage(initial) {
		const state = { ...initial, calls: 0 };
		override(navigator, "storage", {
			estimate: () => { state.calls += 1; return Promise.resolve({ usage: state.usage, quota: state.quota }); },
		});
		return state;
	}

	function Probe({ project }) {
		useSpaceWarning(project, t, tn);
		return null;
	}
	const warnings = () => getToastQueue().filter((toast) => toast.msg.startsWith("Место в браузере"));

	it("plenty of space → no warning", async () => {
		const browser = fakeStorage({ usage: 10 * MB, quota: 300 * GB });
		render(<Probe project={{}} />);
		await settle(20);
		expect(browser.calls).toBe(1); // первый замер — сразу при открытии
		expect(getToastQueue()).toEqual([]);
	});

	it("already low at startup → one sticky warning with the free amount", async () => {
		fakeStorage({ usage: 100 * GB - 700 * MB, quota: 100 * GB });
		render(<Probe project={{}} />);
		await settle(20);
		expect(getToastQueue()).toHaveLength(1);
		const [toast] = getToastQueue();
		expect(toast.msg).toBe(tn("storage.lowSpace", "700.00 МБ"));
		expect(toast.tone).toBe("warn");
		expect(toast.ttl).toBe(0); // висит, пока не закроют
	});

	it("drops below 1 GB while working → warns once, not on every save", async () => {
		const browser = fakeStorage({ usage: 10 * GB, quota: 12 * GB });
		const { rerender } = render(<Probe project={{ v: 0 }} />);
		await settle(20);
		expect(warnings()).toHaveLength(0);
		browser.usage = 11.5 * GB;
		rerender(<Probe project={{ v: 1 }} />);
		await settle(1000);
		expect(warnings()).toHaveLength(1);
		browser.usage = 11.8 * GB;
		rerender(<Probe project={{ v: 2 }} />);
		await settle(1000);
		expect(warnings()).toHaveLength(1);
	});

	it("closed by the user → stays closed while space is still low", async () => {
		const browser = fakeStorage({ usage: 11.5 * GB, quota: 12 * GB });
		const { rerender } = render(<Probe project={{ v: 0 }} />);
		await settle(20);
		dismissToast(warnings()[0].id);
		browser.usage = 11.6 * GB;
		rerender(<Probe project={{ v: 1 }} />);
		await settle(1000);
		expect(warnings()).toHaveLength(0);
	});

	it("space freed → warning removed; low again → warns again", async () => {
		const browser = fakeStorage({ usage: 11.5 * GB, quota: 12 * GB });
		const { rerender } = render(<Probe project={{ v: 0 }} />);
		await settle(20);
		expect(warnings()).toHaveLength(1);
		browser.usage = 2 * GB;
		rerender(<Probe project={{ v: 1 }} />);
		await settle(1000);
		expect(warnings()).toHaveLength(0);
		browser.usage = 11.9 * GB;
		rerender(<Probe project={{ v: 2 }} />);
		await settle(1000);
		expect(warnings()).toHaveLength(1);
		expect(warnings()[0].msg).toBe(tn("storage.lowSpace", formatBytes(0.1 * GB, t)));
	});

	it("after the first answer, changes are debounced: quick edits → one estimate", async () => {
		const browser = fakeStorage({ usage: 1, quota: 100 * GB });
		const { rerender } = render(<Probe project={{ v: 0 }} />);
		await settle(20);
		expect(browser.calls).toBe(1);
		for (let index = 1; index <= 5; index += 1) { rerender(<Probe project={{ v: index }} />); }
		await settle(300);
		expect(browser.calls).toBe(1); // ещё пауза
		await settle(700);
		expect(browser.calls).toBe(2);
	});

	it("browser can't tell the quota → never warns", async () => {
		fakeStorage({ usage: 50 * GB, quota: 0 });
		render(<Probe project={{}} />);
		await settle(20);
		expect(getToastQueue()).toEqual([]);
	});

	it("unmount before the first measure → estimate is never called", async () => {
		const browser = fakeStorage({ usage: 1, quota: GB });
		const { unmount } = render(<Probe project={{}} />);
		unmount();
		await settle(50);
		expect(browser.calls).toBe(0);
	});

	it("unmount while the browser is still answering → result is dropped", async () => {
		let finish;
		override(navigator, "storage", { estimate: () => new Promise((resolve) => { finish = resolve; }) });
		const { unmount } = render(<Probe project={{}} />);
		await settle(20);
		expect(finish).toBeTypeOf("function");
		unmount();
		finish({ usage: 99 * GB, quota: 100 * GB - 1 });
		await settle(50);
		expect(getToastQueue()).toEqual([]);
	});
});
