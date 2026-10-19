import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { ERR_RATIO, WARN_RATIO, formatBytes, quotaLevel } from "../src/utils/storageQuota.js";
import { QuotaLights } from "../src/components/QuotaLights.jsx";
import { useQuotaWatch } from "../src/utils/useQuotaWatch.js";
import { getToastQueue, dismissToast } from "../src/utils/toast.js";
import { makeTranslator } from "../src/i18n/translate.js";
import { override } from "./helpers.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const { t } = makeTranslator("ru");
const KB = 1024;
const MB = KB * 1024;
const GB = MB * 1024;

let root;
let container;
function render(element) {
	container = document.createElement("div");
	document.body.append(container);
	root = createRoot(container);
	act(() => root.render(element));
}
afterEach(() => {
	act(() => root?.unmount());
	container?.remove();
	root = null;
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

	it("quotaLevel thresholds (exact edges)", () => {
		expect(quotaLevel(0, 100)).toBe("ok");
		expect(quotaLevel(WARN_RATIO * 100 - 1, 100)).toBe("ok");
		expect(quotaLevel(WARN_RATIO * 100, 100)).toBe("warn");
		expect(quotaLevel(ERR_RATIO * 100 - 1, 100)).toBe("warn");
		expect(quotaLevel(ERR_RATIO * 100, 100)).toBe("err");
		expect(quotaLevel(500, 100)).toBe("err");
	});

	it("unknown quota (0) is always ok", () => {
		expect(quotaLevel(10 * GB, 0)).toBe("ok");
	});
});

describe("QuotaLights", () => {
	const titles = () => [...container.querySelectorAll(".quota-dot")].map((dot) => dot.title);

	it("lights the active level and shows used / quota / %", () => {
		render(<QuotaLights level="warn" usedBytes={700 * MB} quotaBytes={GB} />);
		const active = container.querySelector(".quota-dot.is-active");
		expect(active.className).toContain("quota-dot--warn");
		expect(active.title).toContain("700.00 МБ / 1.00 ГБ (68%)");
		expect(container.querySelectorAll(".quota-dot")).toHaveLength(3);
		expect(titles().filter((title) => title.includes("%"))).toHaveLength(1);
		expect(container.querySelector(".quota-lights").getAttribute("aria-label")).toBe(t("quota.aria"));
	});

	it("caps the percent at 100", () => {
		render(<QuotaLights level="err" usedBytes={3 * GB} quotaBytes={GB} />);
		expect(container.querySelector(".is-active").title).toContain("(100%)");
	});

	it("unknown quota: shows only the used amount", () => {
		render(<QuotaLights level="ok" usedBytes={2 * KB} quotaBytes={0} />);
		const title = container.querySelector(".is-active").title;
		expect(title.endsWith("· 2.0 КБ")).toBe(true);
		expect(title).not.toContain("%");
	});
});

describe("useQuotaWatch", () => {
	// управляемый navigator.storage.estimate
	function fakeEstimate(initial) {
		const state = { ...initial, calls: 0 };
		override(navigator, "storage", {
			estimate: () => { state.calls += 1; return Promise.resolve({ usage: state.usage, quota: state.quota }); },
		});
		return state;
	}

	let seen;
	function Probe({ project }) {
		seen = useQuotaWatch(project, t);
		return null;
	}
	const rerender = (project) => act(() => root.render(<Probe project={project} />));
	// ждём внутри act: обновления state из таймера/промиса применяются без предупреждений React
	const settle = (ms = 1000) => act(() => new Promise((resolve) => { setTimeout(resolve, ms); }));
	const toastMessages = () => getToastQueue().map((toast) => toast.msg);

	it("starts at ok/0, then reports the browser numbers after a pause", async () => {
		const estimate = fakeEstimate({ usage: 10 * MB, quota: GB });
		render(<Probe project={{ a: 1 }} />);
		expect(seen).toEqual({ level: "ok", usedBytes: 0, quotaBytes: 0 });
		expect(estimate.calls).toBe(0); // не на каждую букву — после паузы
		await settle();
		expect(seen.usedBytes).toBe(10 * MB);
		expect(seen).toEqual({ level: "ok", usedBytes: 10 * MB, quotaBytes: GB });
	});

	it("debounces: quick changes → one estimate", async () => {
		const estimate = fakeEstimate({ usage: 1, quota: 100 });
		render(<Probe project={{ v: 0 }} />);
		for (let index = 1; index <= 5; index += 1) { rerender({ v: index }); }
		await settle();
		expect(estimate.calls).toBe(1);
		await settle();
		expect(estimate.calls).toBe(1);
	});

	it("toasts once when it gets worse (ok→warn→err), not when it gets better", async () => {
		const estimate = fakeEstimate({ usage: 10, quota: 100 });
		render(<Probe project={{ v: 0 }} />);
		await settle();
		expect(seen.usedBytes).toBe(10);
		expect(toastMessages()).toEqual([]);

		estimate.usage = 70;
		rerender({ v: 1 });
		await settle();
		expect(seen.level).toBe("warn");
		expect(toastMessages()).toEqual([t("quota.toast.warn")]);
		expect(getToastQueue()[0].tone).toBe("warn");

		estimate.usage = 90;
		rerender({ v: 2 });
		await settle();
		expect(seen.level).toBe("err");
		expect(toastMessages()).toEqual([t("quota.toast.warn"), t("quota.toast.err")]);

		estimate.usage = 20;
		rerender({ v: 3 });
		await settle();
		expect(seen.level).toBe("ok");
		expect(toastMessages()).toHaveLength(2);
	});

	it("storage already full at startup → one err toast after the first estimate", async () => {
		fakeEstimate({ usage: 99, quota: 100 });
		render(<Probe project={{}} />);
		await settle();
		expect(seen.level).toBe("err");
		// первый рендер (ok, 0 байт) не тостит; переход ok → err после estimate — тостит один раз
		expect(toastMessages()).toEqual([t("quota.toast.err")]);
	});

	it("unmount before the pause ends → estimate is never called", async () => {
		const estimate = fakeEstimate({ usage: 1, quota: 100 });
		render(<Probe project={{}} />);
		act(() => root.unmount());
		root = null;
		await settle(1200);
		expect(estimate.calls).toBe(0);
	});

	it("unmount while estimate is in flight → result is dropped", async () => {
		let finish;
		override(navigator, "storage", { estimate: () => new Promise((resolve) => { finish = resolve; }) });
		render(<Probe project={{}} />);
		await settle();
		expect(finish).toBeTypeOf("function");
		const before = seen;
		act(() => root.unmount());
		root = null;
		finish({ usage: 99, quota: 100 });
		await settle(50);
		expect(seen).toBe(before);
	});
});
