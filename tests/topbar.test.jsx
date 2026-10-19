import { afterEach, describe, expect, it, vi } from "vitest";
import "../src/styles/index.css";
import { Menu } from "../src/components/Menu.jsx";
import { ChoiceDialog } from "../src/components/ChoiceDialog.jsx";
import { isHtmlFile, useHtmlDrop } from "../src/utils/useHtmlDrop.js";
import { Topbar } from "../src/Topbar.jsx";
import { I18nProvider } from "../src/i18n/I18nProvider.jsx";
import { ProjectProvider, useProject } from "../src/state/ProjectProvider.jsx";
import { storage } from "../src/state/storage.js";
import { emptyProject } from "../src/state/model.js";
import { renderExportHTML } from "../src/utils/exportHtml.jsx";
import { dismissToast, getToastQueue } from "../src/utils/toast.js";
import { makeTranslator } from "../src/i18n/translate.js";
import { makePng } from "./helpers.js";
import { render, run, settle, waitFor } from "./react.jsx";

const { t, tn } = makeTranslator("ru");

afterEach(() => {
	vi.restoreAllMocks();
	for (const toast of getToastQueue()) { dismissToast(toast.id); }
});

const keydown = (element, key) => run(() => {
	element.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
});

describe("Menu", () => {
	function setup() {
		const calls = [];
		const items = [
			{ label: "One", onSelect: () => calls.push("one") },
			{ separator: true, id: "sep" },
			{ label: "Two", onSelect: () => calls.push("two") },
			{ label: "Three", onSelect: () => calls.push("three") },
		];
		const { container } = render(<Menu label="File" items={items} className="extra" />);
		const button = container.querySelector(".menu__button");
		const list = () => container.querySelector("[role=menu]");
		const focused = () => document.activeElement.textContent;
		return { container, button, list, focused, calls };
	}

	it("is closed at first; click opens it with focus on the first item", async () => {
		const { container, button, list, focused } = setup();
		expect(container.firstChild.className).toBe("menu extra");
		expect(button.getAttribute("aria-haspopup")).toBe("menu");
		expect(button.getAttribute("aria-expanded")).toBe("false");
		expect(list()).toBeNull();
		await run(() => button.click());
		expect(button.getAttribute("aria-expanded")).toBe("true");
		expect(button.getAttribute("aria-controls")).toBe(list().id);
		expect([...list().querySelectorAll("[role=menuitem]")].map((item) => item.textContent)).toEqual(["One", "Two", "Three"]);
		expect(list().querySelectorAll("[role=separator]")).toHaveLength(1);
		expect(focused()).toBe("One");
		await run(() => button.click());
		expect(list()).toBeNull();
	});

	it("choosing an item closes the menu and runs it", async () => {
		const { button, list, calls } = setup();
		await run(() => button.click());
		await run(() => list().querySelectorAll("[role=menuitem]")[1].click());
		expect(calls).toEqual(["two"]);
		expect(list()).toBeNull();
	});

	it("keyboard: ↓ on the button opens; ↑ ↓ Home End move and wrap; Esc closes back to the button", async () => {
		const { button, list, focused } = setup();
		await keydown(button, "a");
		expect(list()).toBeNull();
		await keydown(button, "ArrowDown");
		expect(focused()).toBe("One");
		await keydown(list(), "ArrowDown");
		expect(focused()).toBe("Two");
		await keydown(list(), "End");
		expect(focused()).toBe("Three");
		await keydown(list(), "ArrowDown");
		expect(focused()).toBe("One"); // по кругу
		await keydown(list(), "ArrowUp");
		expect(focused()).toBe("Three");
		await keydown(list(), "Home");
		expect(focused()).toBe("One");
		await keydown(list(), "x");
		expect(focused()).toBe("One");
		await keydown(list(), "Escape");
		expect(list()).toBeNull();
		expect(document.activeElement).toBe(button);
	});

	it("Tab or a click outside closes it; a click inside doesn't", async () => {
		const { button, list } = setup();
		await run(() => button.click());
		await keydown(list(), "Tab");
		expect(list()).toBeNull();
		await run(() => button.click());
		await run(() => { list().dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })); });
		expect(list()).not.toBeNull();
		await run(() => { document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })); });
		expect(list()).toBeNull();
	});

	it("headings are labels (not focusable); choices are radios that keep the menu open", async () => {
		const picked = [];
		const items = [
			{ heading: "Theme", id: "h" },
			{ label: "Dark", checked: true, onSelect: () => picked.push("dark") },
			{ label: "Light", checked: false, onSelect: () => picked.push("light") },
			{ label: "Act", onSelect: () => picked.push("act") },
		];
		const { container } = render(<Menu label="Menu" items={items} />);
		await run(() => container.querySelector(".menu__button").click());
		const heading = container.querySelector(".menu__heading");
		expect(heading.textContent).toBe("Theme");
		expect(heading.getAttribute("role")).toBe("presentation");
		const radios = [...container.querySelectorAll("[role=menuitemradio]")];
		expect(radios.map((radio) => [radio.textContent, radio.getAttribute("aria-checked"), radio.classList.contains("is-checked")]))
			.toEqual([["Dark", "true", true], ["Light", "false", false]]);
		expect(container.querySelector("[role=menuitem]").hasAttribute("aria-checked")).toBe(false);
		expect(document.activeElement.textContent).toBe("Dark"); // заголовок пропущен
		await keydown(container.querySelector("[role=menu]"), "ArrowUp");
		expect(document.activeElement.textContent).toBe("Act"); // по кругу, тоже мимо заголовка
		await run(() => radios[1].click());
		expect(picked).toEqual(["light"]);
		expect(container.querySelector("[role=menu]")).not.toBeNull(); // выбор не закрывает
		await run(() => container.querySelector("[role=menuitem]").click());
		expect(picked).toEqual(["light", "act"]);
		expect(container.querySelector("[role=menu]")).toBeNull(); // действие закрывает
	});
});

describe("ChoiceDialog", () => {
	const BODY = "Body text";
	function Harness({ open, onA = () => {}, onCancel = () => {} }) {
		return (
			<ChoiceDialog
				open={open} title="Replace?" cancelLabel="Cancel" onCancel={onCancel}
				choices={[{ label: "A", variant: "primary", onSelect: onA }, { label: "B", variant: "danger", onSelect: () => {} }]}
			>
				<p>{BODY}</p>
			</ChoiceDialog>
		);
	}

	it("closed: an empty <dialog>; open: modal with title, body, choices, cancel; focus on the first choice", async () => {
		const { container, rerender } = render(<Harness open={false} />);
		const dialog = container.querySelector("dialog");
		expect(dialog.open).toBe(false);
		expect(dialog.textContent).toBe("");
		rerender(<Harness open />);
		await settle();
		expect(dialog.open).toBe(true);
		expect(dialog.matches(":modal")).toBe(true);
		expect(dialog.querySelector("#choice-dialog-title").textContent).toBe("Replace?");
		expect(dialog.getAttribute("aria-labelledby")).toBe("choice-dialog-title");
		expect([...dialog.querySelectorAll("button")].map((button) => button.textContent)).toEqual(["A", "B", "Cancel"]);
		expect(document.activeElement.textContent).toBe("A");
		rerender(<Harness open={false} />);
		expect(dialog.open).toBe(false);
	});

	it("buttons call their handlers; Esc and Cancel call onCancel and leave closing to the owner", async () => {
		const onA = vi.fn();
		const onCancel = vi.fn();
		const { container } = render(<Harness open onA={onA} onCancel={onCancel} />);
		const dialog = container.querySelector("dialog");
		await run(() => dialog.querySelector("button").click());
		expect(onA).toHaveBeenCalledOnce();
		await run(() => { dialog.dispatchEvent(new Event("cancel", { cancelable: true })); });
		expect(onCancel).toHaveBeenCalledOnce();
		expect(dialog.open).toBe(true); // закрывает владелец через open={false}
		await run(() => [...dialog.querySelectorAll("button")].at(-1).click());
		expect(onCancel).toHaveBeenCalledTimes(2);
	});
});

describe("useHtmlDrop", () => {
	const drop = (target, files, { prevented = false } = {}) => {
		const transfer = new DataTransfer();
		for (const file of files) { transfer.items.add(file); }
		const event = new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: transfer });
		if (prevented) { event.preventDefault(); }
		target.dispatchEvent(event);
		return event;
	};
	function Probe({ onDrop }) {
		useHtmlDrop(onDrop);
		return null;
	}
	const html = new File(["<p>x</p>"], "show.HTML", { type: "" });
	const png = new File(["x"], "a.png", { type: "image/png" });

	it("isHtmlFile: by type or by extension", () => {
		expect(isHtmlFile(new File([""], "a", { type: "text/html" }))).toBe(true);
		expect(isHtmlFile(new File([""], "b.htm"))).toBe(true);
		expect(isHtmlFile(html)).toBe(true);
		expect(isHtmlFile(png)).toBe(false);
	});

	it("files dropped on the window: the first HTML, or null if none; the browser doesn't open them", () => {
		const onDrop = vi.fn();
		render(<Probe onDrop={onDrop} />);
		const event = drop(document.body, [png, html]);
		expect(onDrop).toHaveBeenLastCalledWith(html);
		expect(event.defaultPrevented).toBe(true);
		drop(document.body, [png]);
		expect(onDrop).toHaveBeenLastCalledWith(null);
	});

	it("dragover with files is allowed (needed for drop); text drags and handled drops are left alone", () => {
		const onDrop = vi.fn();
		render(<Probe onDrop={onDrop} />);
		const files = new DataTransfer();
		files.items.add(png);
		const over = new DragEvent("dragover", { bubbles: true, cancelable: true, dataTransfer: files });
		document.body.dispatchEvent(over);
		expect(over.defaultPrevented).toBe(true);
		const text = new DataTransfer();
		text.setData("text/plain", "hi");
		const textOver = new DragEvent("dragover", { bubbles: true, cancelable: true, dataTransfer: text });
		document.body.dispatchEvent(textOver);
		expect(textOver.defaultPrevented).toBe(false);
		document.body.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: text }));
		drop(document.body, [html], { prevented: true }); // уже обработал FileDrop
		expect(onDrop).not.toHaveBeenCalled();
	});

	it("uses the latest callback and stops listening after unmount", () => {
		const first = vi.fn();
		const second = vi.fn();
		const { rerender, unmount } = render(<Probe onDrop={first} />);
		rerender(<Probe onDrop={second} />);
		drop(document.body, [html]);
		expect(first).not.toHaveBeenCalled();
		expect(second).toHaveBeenCalledOnce();
		unmount();
		drop(document.body, [html]);
		expect(second).toHaveBeenCalledOnce();
	});
});

describe("Topbar: open / new / export", () => {
	const loaded = (overrides = {}) => ({ ...emptyProject(), ...overrides, meta: { ...emptyProject().meta, ...overrides.meta } });

	let current;
	function Probe() {
		current = useProject();
		return null;
	}
	async function mount(project) {
		vi.spyOn(storage, "load").mockResolvedValue(project);
		const save = vi.spyOn(storage, "save").mockImplementation(() => {});
		const view = render(
			<I18nProvider initialLocale="ru">
				<ProjectProvider>
					<Topbar />
					<Probe />
				</ProjectProvider>
			</I18nProvider>,
		);
		// пока идёт загрузка, useProject() отдаёт пустую заглушку. settle() сразу
		// открывает act — загрузка (промис мока) завершается внутри него.
		await settle();
		expect(current).toEqual(project);
		const menuItem = async (label) => {
			await run(() => view.container.querySelector(".menu__button").click());
			const item = [...view.container.querySelectorAll("[role=menuitem]")].find((element) => element.textContent === label);
			await run(() => item.click());
		};
		const dialog = () => view.container.querySelector(".choice-dialog");
		const choose = (label) => run(() => [...dialog().querySelectorAll("button")].find((button) => button.textContent === label).click());
		const pick = async (file) => {
			const input = view.container.querySelector("input[type=file]");
			const transfer = new DataTransfer();
			transfer.items.add(file);
			input.files = transfer.files;
			await run(() => { input.dispatchEvent(new Event("change", { bubbles: true })); });
		};
		return { ...view, menuItem, dialog, choose, pick, save };
	}
	function captureDownloads() {
		const names = [];
		vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function click() { names.push(this.download); });
		return names;
	}
	const exported = async (project, name = "show.html") => new File([await renderExportHTML(project)], name, { type: "text/html" });
	const toasts = () => getToastQueue().map((toast) => ({ tone: toast.tone, msg: toast.msg }));

	it("one menu in the header: import, export, theme, font, language — text only", async () => {
		const names = captureDownloads();
		const { container, menuItem } = await mount(loaded({ meta: { showName: "Гамлет" } }));
		expect(container.querySelectorAll(".topbar__actions button")).toHaveLength(1);
		const button = container.querySelector(".menu__button");
		expect(button.textContent).toBe(t("menu.main"));
		await run(() => button.click());
		const rows = [...container.querySelectorAll(".menu__list > *")].map((row) => `${row.getAttribute("role")}:${row.textContent}`);
		expect(rows).toEqual([
			`presentation:${t("menu.import")}`, `menuitem:${t("menu.new")}`, `menuitem:${t("menu.open")}`, "separator:",
			`presentation:${t("menu.exportGroup")}`, `menuitem:${t("menu.export")}`, `menuitem:${t("menu.print")}`, "separator:",
			`presentation:${t("menu.theme")}`,
			...["graphite", "midnight", "tungsten", "light", "paper"].map((id) => `menuitemradio:${t(`appearance.theme.${id}`)}`),
			"separator:", `presentation:${t("menu.font")}`,
			...["sans", "serif"].map((id) => `menuitemradio:${t(`appearance.font.${id}`)}`),
			"separator:", `presentation:${t("menu.language")}`,
			"menuitemradio:Русский", "menuitemradio:English", // всегда на своём языке
		]);
		await run(() => button.click());
		await menuItem(t("menu.export"));
		await waitFor(() => expect(names).toEqual(["Гамлет.html"]));
		const print = vi.spyOn(globalThis, "print").mockImplementation(() => {});
		await menuItem(t("menu.print"));
		expect(print).toHaveBeenCalledOnce();
	});

	it("'Open HTML…' clicks the hidden file input", async () => {
		const { container, menuItem } = await mount(loaded());
		const input = container.querySelector("input[type=file]");
		expect(input.accept).toBe(".html,.htm,text/html");
		const picker = vi.spyOn(input, "click").mockImplementation(() => {});
		await menuItem(t("menu.open"));
		expect(picker).toHaveBeenCalledOnce();
	});

	it("empty project: an opened file replaces it right away, with a success toast", async () => {
		const project = loaded({ meta: { showName: "Щелкунчик" }, plots: { base: makePng(30, 20), show: null } });
		const { pick, dialog, save } = await mount(emptyProject());
		await pick(await exported(project, "nut.html"));
		await waitFor(() => expect(current).toEqual(project));
		expect(dialog().open).toBe(false);
		expect(toasts()).toEqual([{ tone: "ok", msg: tn("open.ok", "nut.html") }]);
		expect(save).toHaveBeenLastCalledWith(project);
	});

	it("project with data: asks first; 'continue without saving' replaces", async () => {
		const opened = loaded({ meta: { showName: "Новое" } });
		const { pick, dialog, choose } = await mount(loaded({ meta: { showName: "Старое" } }));
		await pick(await exported(opened, "new.html"));
		await waitFor(() => expect(dialog().open).toBe(true));
		expect(dialog().textContent).toContain(tn("replace.text.open", "new.html", "Старое"));
		expect(current.meta.showName).toBe("Старое");
		await choose(t("replace.discard"));
		expect(current).toEqual(opened);
		expect(dialog().open).toBe(false);
	});

	it("'download current and continue' saves the old project as HTML first", async () => {
		const names = captureDownloads();
		const opened = loaded({ meta: { showName: "Новое" } });
		const { pick, dialog, choose } = await mount(loaded({ meta: { showName: "Старое" } }));
		await pick(await exported(opened));
		await waitFor(() => expect(dialog().open).toBe(true));
		await choose(t("replace.save"));
		await waitFor(() => expect(current).toEqual(opened));
		expect(names).toEqual(["Старое.html"]);
	});

	it("cancel keeps the current project", async () => {
		const old = loaded({ commentary: "keep me" });
		const { pick, dialog, choose } = await mount(old);
		await pick(await exported(loaded({ meta: { showName: "X" } })));
		await waitFor(() => expect(dialog().open).toBe(true));
		expect(dialog().textContent).toContain(t("replace.unnamed"));
		await choose(t("common.cancel"));
		expect(current).toEqual(old);
		expect(dialog().open).toBe(false);
	});

	it("'New project' on a project with data asks; on an empty project it just resets", async () => {
		const { menuItem, dialog, choose } = await mount(loaded({ meta: { showName: "Старое" } }));
		await menuItem(t("menu.new"));
		expect(dialog().open).toBe(true);
		expect(dialog().textContent).toContain(tn("replace.text.new", "Старое"));
		await choose(t("replace.discard"));
		expect(current).toEqual(emptyProject());
		expect(toasts()).toEqual([]); // без «Открыт проект…»
		await menuItem(t("menu.new"));
		expect(dialog().open).toBe(false);
	});

	it("a file that can't be opened: sticky error, the project and the dialog untouched", async () => {
		const old = loaded({ commentary: "keep me" });
		const { pick, dialog } = await mount(old);
		await pick(new File(["<html><body>hello</body></html>"], "other.html", { type: "text/html" }));
		await waitFor(() => expect(toasts()).toHaveLength(1));
		expect(getToastQueue()[0]).toMatchObject({ tone: "err", ttl: 0, msg: t("open.error.noData") });
		expect(dialog().open).toBe(false);
		expect(current).toEqual(old);
	});

	it("an unexpected read error is shown with its message", async () => {
		const { pick } = await mount(emptyProject());
		const file = new File(["x"], "bad.html", { type: "text/html" });
		vi.spyOn(file, "text").mockRejectedValue(new Error("disk gone"));
		await pick(file);
		await waitFor(() => expect(toasts()).toEqual([{ tone: "err", msg: tn("open.error.failed", "disk gone") }]));
		vi.spyOn(file, "text").mockRejectedValue("plain");
		await pick(file);
		await waitFor(() => expect(toasts().at(-1).msg).toBe(tn("open.error.failed", "plain")));
	});

	it("dropping an HTML on the window opens it; dropping something else explains what to do", async () => {
		const opened = loaded({ meta: { showName: "Drop" } });
		await mount(emptyProject());
		const transfer = new DataTransfer();
		transfer.items.add(await exported(opened));
		await run(() => { document.body.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: transfer })); });
		await waitFor(() => expect(current).toEqual(opened));
		const images = new DataTransfer();
		images.items.add(new File(["x"], "a.png", { type: "image/png" }));
		await run(() => { document.body.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: images })); });
		expect(toasts().at(-1)).toEqual({ tone: "err", msg: t("open.error.notHtml") });
	});

	it("a non-HTML file picked via 'Open HTML…' gets the 'not HTML' message, not 'no data'", async () => {
		const old = loaded({ commentary: "keep me" });
		const { pick } = await mount(old);
		await pick(new File(["x"], "photo.png", { type: "image/png" }));
		expect(toasts()).toEqual([{ tone: "err", msg: t("open.error.notHtml") }]);
		expect(current).toEqual(old);
	});

	it("the same file can be picked twice in a row (input is reset)", async () => {
		const { container, pick } = await mount(emptyProject());
		await pick(await exported(loaded({ meta: { showName: "A" } })));
		await waitFor(() => expect(current.meta.showName).toBe("A"));
		expect(container.querySelector("input[type=file]").value).toBe("");
	});
});
