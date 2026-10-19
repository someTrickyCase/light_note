import { describe, expect, it, vi } from "vitest";
import { escapeHtml, measureImage, readAsDataURL } from "../src/utils/files.js";
import { FileDrop } from "../src/components/FileDrop.jsx";
import { getToastQueue } from "../src/utils/toast.js";
import { makeTranslator } from "../src/i18n/translate.js";
import { dataURLToBlob, makePng } from "./helpers.js";
import { render, run, settle, waitFor } from "./react.jsx";

const { t, tn } = makeTranslator("ru");

const pngFile = (name, width, height, color) => {
	const blob = dataURLToBlob(makePng(width, height, color));
	return new File([blob], name, { type: "image/png" });
};

describe("files", () => {
	it("readAsDataURL keeps the bytes exactly", async () => {
		const png = makePng(20, 10);
		expect(await readAsDataURL(dataURLToBlob(png))).toBe(png);
	});

	it("readAsDataURL rejects when the reader fails", async () => {
		const file = pngFile("x.png", 2, 2);
		const original = FileReader.prototype.readAsDataURL;
		FileReader.prototype.readAsDataURL = function fail() {
			setTimeout(() => this.dispatchEvent(new ProgressEvent("error")));
		};
		try {
			await expect(readAsDataURL(file)).rejects.toBeDefined();
		} finally {
			FileReader.prototype.readAsDataURL = original;
		}
	});

	it("measureImage gives the pixel size", async () => {
		expect(await measureImage(makePng(1920, 1080))).toEqual({ width: 1920, height: 1080 });
		expect(await measureImage(makePng(30, 400))).toEqual({ width: 30, height: 400 });
	});

	it("measureImage rejects a file that is not an image", async () => {
		await expect(measureImage("data:image/png;base64,AAAA")).rejects.toThrow("image decode failed");
		await expect(measureImage("data:text/plain;base64,aGk=")).rejects.toThrow("image decode failed");
	});

	it("escapeHtml escapes all five characters", () => {
		expect(escapeHtml(`<a href="x">Tom & 'Jerry'</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;Tom &amp; &#39;Jerry&#39;&lt;/a&gt;");
		expect(escapeHtml(42)).toBe("42");
	});
});

describe("FileDrop", () => {
	// Кладём файлы в <input type=file> через DataTransfer — как это делает браузер
	function choose(input, files) {
		const transfer = new DataTransfer();
		for (const file of files) { transfer.items.add(file); }
		input.files = transfer.files;
		return run(() => { input.dispatchEvent(new Event("change", { bubbles: true })); });
	}

	it("gives the files back unchanged (no compression), with name and pixel size", async () => {
		const onFiles = vi.fn();
		const { container } = render(<FileDrop onFiles={onFiles} hint="hint" />);
		const big = pngFile("Mac Quantum #5.png", 3000, 2000, "#c00");
		const tall = pngFile("FOH.png", 600, 1800, "#00c");
		await choose(container.querySelector("input[type=file]"), [big, tall]);
		await waitFor(() => expect(onFiles).toHaveBeenCalledOnce());
		const items = onFiles.mock.calls[0][0];
		expect(items.map(({ name, width, height }) => ({ name, width, height }))).toEqual([
			{ name: "Mac Quantum #5.png", width: 3000, height: 2000 },
			{ name: "FOH.png", width: 600, height: 1800 },
		]);
		// байт в байт тот же файл: PNG остался PNG, размер не уменьшен
		expect(items[0].src).toBe(await readAsDataURL(big));
		expect(items[0].src.startsWith("data:image/png;base64,")).toBe(true);
		expect(container.textContent).toContain("hint");
	});

	it("shows 'busy' while reading and the children text otherwise", async () => {
		let release;
		const onFiles = vi.fn();
		const label = "Drop here";
		const { container } = render(<FileDrop onFiles={onFiles}>{label}</FileDrop>);
		expect(container.textContent).toContain(label);
		const original = FileReader.prototype.readAsDataURL;
		FileReader.prototype.readAsDataURL = function slow(blob) {
			release = () => original.call(this, blob);
		};
		try {
			await choose(container.querySelector("input"), [pngFile("a.png", 4, 4)]);
			expect(container.textContent).toContain(t("drop.busy"));
			await run(() => release());
			await waitFor(() => expect(onFiles).toHaveBeenCalled());
			await settle();
			expect(container.textContent).not.toContain(t("drop.busy"));
		} finally {
			FileReader.prototype.readAsDataURL = original;
		}
	});

	it("a broken file → error toast, onFiles not called", async () => {
		const onFiles = vi.fn();
		const { container } = render(<FileDrop onFiles={onFiles} />);
		const before = getToastQueue().length;
		await choose(container.querySelector("input"), [new File(["not an image"], "notes.png", { type: "image/png" })]);
		await waitFor(() => expect(getToastQueue().length).toBe(before + 1));
		const toast = getToastQueue().at(-1);
		expect(toast.tone).toBe("err");
		expect(toast.msg).toBe(tn("drop.error", "image decode failed"));
		expect(onFiles).not.toHaveBeenCalled();
	});

	it("drag & drop: highlights while dragging and accepts the dropped files", async () => {
		const onFiles = vi.fn();
		const { container } = render(<FileDrop onFiles={onFiles} />);
		const zone = container.querySelector(".drop");
		const transfer = new DataTransfer();
		transfer.items.add(pngFile("drop.png", 8, 6));
		await run(() => { zone.dispatchEvent(new DragEvent("dragover", { bubbles: true, cancelable: true, dataTransfer: transfer })); });
		expect(zone.classList.contains("is-drag")).toBe(true);
		await run(() => { zone.dispatchEvent(new DragEvent("dragleave", { bubbles: true })); });
		expect(zone.classList.contains("is-drag")).toBe(false);
		await run(() => { zone.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: transfer })); });
		await waitFor(() => expect(onFiles).toHaveBeenCalledOnce());
		expect(onFiles.mock.calls[0][0][0]).toMatchObject({ name: "drop.png", width: 8, height: 6 });
	});

	it("an empty selection does nothing", async () => {
		const onFiles = vi.fn();
		const { container } = render(<FileDrop onFiles={onFiles} />);
		await choose(container.querySelector("input"), []);
		await settle(50);
		expect(onFiles).not.toHaveBeenCalled();
	});

	it("click, Enter and Space open the file picker; other keys don't", async () => {
		const { container } = render(<FileDrop onFiles={vi.fn()} multiple={false} />);
		const input = container.querySelector("input");
		expect(input.multiple).toBe(false);
		const opened = vi.spyOn(input, "click").mockImplementation(() => {});
		const zone = container.querySelector(".drop");
		await run(() => zone.click());
		await run(() => { zone.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })); });
		await run(() => { zone.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true })); });
		await run(() => { zone.dispatchEvent(new KeyboardEvent("keydown", { key: "a", bubbles: true })); });
		expect(opened).toHaveBeenCalledTimes(3);
	});
});
