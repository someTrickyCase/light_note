import { describe, expect, it, vi } from "vitest";
import { page } from "@vitest/browser/context";
import "../src/styles/index.css";
import { DocGallery, aspectRatio } from "../src/doc/DocGallery.jsx";
import { DocPlots } from "../src/doc/DocPlots.jsx";
import { Lightbox, SWIPE_PX } from "../src/components/Lightbox.jsx";
import { projectReducer } from "../src/state/reducer.js";
import { emptyProject } from "../src/state/model.js";
import { makeTranslator } from "../src/i18n/translate.js";
import { makePng } from "./helpers.js";
import { render, run, settle } from "./react.jsx";

const { t } = makeTranslator("ru");

const SHAPES = [[1600, 1200], [1920, 1080], [1000, 1500], [1200, 1200], [2400, 1000], [1080, 1920], [1600, 1200]];
const PNGS = SHAPES.map(([w, h], index) => makePng(Math.round(w / 20), Math.round(h / 20), `hsl(${index * 50} 60% 50%)`));

function photos(count = SHAPES.length) {
	return SHAPES.slice(0, count).map(([width, height], index) => ({
		id: `p${index}`, src: PNGS[index], tag: `Fixture ${index + 1}`, caption: index === 1 ? "front wash" : "", order: index, width, height,
	}));
}
const withPhotos = (list) => ({ ...emptyProject(), photos: list });

const dialogOf = (container) => container.querySelector("dialog.lightbox");
const view = (dialog) => ({
	open: dialog.open,
	src: dialog.querySelector(".lightbox__img").getAttribute("src"),
	count: dialog.querySelector(".lightbox__count").textContent,
	title: dialog.querySelector(".lightbox__title").textContent,
	caption: dialog.querySelector(".lightbox__caption").textContent,
});
const press = (dialog, key) => run(() => { dialog.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true })); });
const pointer = (dialog, type, clientX) => run(() => {
	dialog.dispatchEvent(new PointerEvent(type, { clientX, clientY: 300, bubbles: true, pointerId: 1 }));
});
async function swipe(dialog, dx) {
	await pointer(dialog, "pointerdown", 500);
	await pointer(dialog, "pointerup", 500 + dx);
	await run(() => dialog.click()); // браузер шлёт click после pointerup
}

describe("aspectRatio", () => {
	it("is width / height, rounded to 4 digits", () => {
		expect(aspectRatio({ width: 1920, height: 1080 })).toBe(1.7778);
		expect(aspectRatio({ width: 1000, height: 1500 })).toBe(0.6667);
	});
	it("falls back to 4:3 when the size is unknown or broken", () => {
		for (const photo of [{}, { width: 0, height: 100 }, { width: 100 }, { width: -1, height: -1 }]) {
			expect(aspectRatio(photo)).toBe(1.3333);
		}
	});
});

describe("mosaic layout (real CSS)", () => {
	// Сгруппировать картинки плиток по строкам (по top)
	function rows(container) {
		const byTop = new Map();
		for (const img of container.querySelectorAll(".doc__tile img")) {
			const box = img.getBoundingClientRect();
			const top = Math.round(box.top);
			if (!byTop.has(top)) { byTop.set(top, []); }
			byTop.get(top).push({ box, ratio: img.naturalWidth / img.naturalHeight });
		}
		return [...byTop.values()];
	}
	const waitImages = (container) => vi.waitFor(() => {
		expect([...container.querySelectorAll(".doc__tile img")].every((img) => img.complete && img.naturalWidth > 0)).toBe(true);
	});

	// Телефонная высота строки включается по ширине окна (@media), а не контейнера — меняем окно
	it.each([1100, 860, 390])("at %ipx: equal heights per row, nothing cropped or stretched, order kept", async (width) => {
		await page.viewport(Math.max(width + 40, 700), 900);
		const { container } = render(<div className="doc"><DocGallery project={withPhotos(photos())} /></div>, { width });
		await waitImages(container);
		const found = rows(container);
		expect(found.length).toBeGreaterThan(1);
		const mosaic = container.querySelector(".doc__mosaic").getBoundingClientRect();
		for (const row of found) {
			const heights = row.map(({ box }) => box.height);
			expect(Math.max(...heights) - Math.min(...heights)).toBeLessThan(1);
			for (const { box, ratio } of row) {
				expect(Math.abs(box.width / box.height - ratio)).toBeLessThan(0.02); // форма фото не меняется
				expect(box.right).toBeLessThanOrEqual(mosaic.right + 0.5); // и не вылезает за край
			}
		}
		// порядок чтения = порядок фото
		const order = [...container.querySelectorAll(".doc__tile img")]
			.map((img) => img.getBoundingClientRect())
			.map((box, index, all) => (index === 0 ? true : box.top > all[index - 1].top + 1 || box.left > all[index - 1].left));
		expect(order.every(Boolean)).toBe(true);
	});

	it("last row is not stretched, and no row grows beyond --gallery-row-max", async () => {
		await page.viewport(390, 844);
		const { container } = render(<div className="doc"><DocGallery project={withPhotos(photos())} /></div>, { width: 390 });
		await waitImages(container);
		const styles = getComputedStyle(container.querySelector(".doc__mosaic"));
		const rowH = Number.parseFloat(styles.getPropertyValue("--gallery-row-h"));
		const rowMax = Number.parseFloat(styles.getPropertyValue("--gallery-row-max"));
		expect(rowH).toBe(110); // телефонная высота строки
		const found = rows(container);
		for (const row of found) {
			expect(row[0].box.height).toBeLessThanOrEqual(rowH * rowMax + 0.5);
		}
		expect(found.at(-1)[0].box.height).toBeCloseTo(rowH, 0);
	});
});

describe("DocGallery markup", () => {
	it("renders nothing without photos", () => {
		const { container } = render(<DocGallery project={withPhotos([])} />);
		expect(container.innerHTML).toBe("");
	});

	it("one tile per photo with --ar, tag · caption line only when there is text", () => {
		const list = [
			{ id: "a", src: PNGS[0], tag: "Tag", caption: "Cap", width: 4, height: 3 },
			{ id: "b", src: PNGS[1], tag: "", caption: "Only caption", width: 16, height: 9 },
			{ id: "c", src: PNGS[2], tag: "", caption: "" },
		];
		const { container } = render(<DocGallery project={withPhotos(list)} />);
		const tiles = [...container.querySelectorAll(".doc__tile")];
		expect(tiles.map((tile) => tile.style.getPropertyValue("--ar"))).toEqual(["1.3333", "1.7778", "1.3333"]);
		expect(tiles[0].querySelector(".doc__tile-cap").textContent).toBe("TagCap");
		expect(tiles[0].querySelector(".doc__tile-tag").textContent).toBe("Tag");
		expect(tiles[1].querySelector(".doc__tile-cap").textContent).toBe("Only caption");
		expect(tiles[1].querySelector(".doc__tile-tag")).toBeNull();
		expect(tiles[2].querySelector(".doc__tile-cap")).toBeNull();
		const zoom = tiles[0].querySelector(".doc__zoom");
		expect(zoom.dataset).toMatchObject({ title: "Tag", caption: "Cap" });
		expect(zoom.getAttribute("aria-label")).toBe(`${t("common.zoom")}: Tag`);
		expect(tiles[2].querySelector(".doc__zoom").getAttribute("aria-label")).toBe(t("common.zoom"));
		expect(container.querySelector("section").dataset.zoomGroup).toBe("gallery");
		expect(container.querySelector("h2").textContent).toBe(t("doc.section.gallery"));
	});
});

describe("carousel (React)", () => {
	function openGallery(count = 3) {
		const { container } = render(<DocGallery project={withPhotos(photos(count))} />);
		return { container, dialog: dialogOf(container), tiles: [...container.querySelectorAll(".doc__zoom")] };
	}

	it("is closed and empty at first; click on a tile opens that photo", async () => {
		const { dialog, tiles } = openGallery();
		expect(view(dialog)).toEqual({ open: false, src: null, count: "", title: "", caption: "" });
		await run(() => tiles[1].click());
		expect(view(dialog)).toEqual({ open: true, src: PNGS[1], count: "2 / 3", title: "Fixture 2", caption: "front wash" });
		expect(dialog.getAttribute("aria-label")).toBe("Fixture 2");
	});

	it("‹ › buttons and ← → keys move and wrap around both ends", async () => {
		const { dialog, tiles } = openGallery();
		await run(() => tiles[2].click());
		await run(() => dialog.querySelector(".lightbox__nav--next").click());
		expect(view(dialog).count).toBe("1 / 3"); // после последней — первая
		await run(() => dialog.querySelector(".lightbox__nav--prev").click());
		expect(view(dialog).count).toBe("3 / 3"); // перед первой — последняя
		await press(dialog, "ArrowLeft");
		expect(view(dialog).count).toBe("2 / 3");
		await press(dialog, "ArrowRight");
		await press(dialog, "ArrowRight");
		expect(view(dialog).count).toBe("1 / 3");
		await press(dialog, "Enter"); // другие клавиши ничего не делают
		expect(view(dialog)).toMatchObject({ open: true, count: "1 / 3" });
	});

	it("swipe left → next, swipe right → previous, a short move does nothing", async () => {
		const { dialog, tiles } = openGallery();
		await run(() => tiles[0].click());
		await swipe(dialog, -(SWIPE_PX + 30));
		expect(view(dialog)).toMatchObject({ open: true, count: "2 / 3" }); // и click после свайпа не закрыл
		await swipe(dialog, SWIPE_PX + 30);
		expect(view(dialog)).toMatchObject({ open: true, count: "1 / 3" });
		await pointer(dialog, "pointerdown", 500);
		await pointer(dialog, "pointerup", 500 - SWIPE_PX);
		expect(view(dialog).count).toBe("1 / 3");
		await pointer(dialog, "pointerup", 100); // pointerup без pointerdown
		expect(view(dialog).count).toBe("1 / 3");
	});

	it("closes with ✕, with a backdrop click, and with Esc (cancel)", async () => {
		const { dialog, tiles } = openGallery();
		await run(() => tiles[0].click());
		await run(() => dialog.querySelector(".lightbox__close").click());
		expect(dialog.open).toBe(false);

		await run(() => tiles[0].click());
		await run(() => dialog.querySelector(".lightbox__img").click()); // клик по фото — не закрывает
		expect(dialog.open).toBe(true);
		await run(() => dialog.click());
		expect(dialog.open).toBe(false);

		await run(() => tiles[0].click());
		const cancel = new Event("cancel", { cancelable: true });
		await run(() => { dialog.dispatchEvent(cancel); });
		expect(cancel.defaultPrevented).toBe(true); // закрываем через state, не нативно
		expect(dialog.open).toBe(false);
		expect(view(dialog).src).toBeNull();
	});

	it("a single photo: no ‹ ›, no counter, keys and swipes do nothing", async () => {
		const { dialog, tiles } = openGallery(1);
		await run(() => tiles[0].click());
		expect(dialog.querySelector(".lightbox__nav--prev").hidden).toBe(true);
		expect(dialog.querySelector(".lightbox__nav--next").hidden).toBe(true);
		expect(view(dialog).count).toBe("");
		await press(dialog, "ArrowRight");
		await swipe(dialog, -200);
		expect(view(dialog)).toMatchObject({ open: true, title: "Fixture 1" });
	});

	it("index out of range = closed (e.g. the photo was just deleted)", () => {
		const items = [{ src: PNGS[0], title: "a", caption: "" }];
		const { container } = render(<Lightbox items={items} index={5} onIndex={() => {}} onClose={() => {}} />);
		expect(dialogOf(container).open).toBe(false);
		const again = render(<Lightbox items={items} index={-1} onIndex={() => {}} onClose={() => {}} />);
		expect(dialogOf(again.container).open).toBe(false);
	});

	it("closes when the parent sets index back to null, and re-opens on the next click", async () => {
		const items = [{ src: PNGS[0], title: "a", caption: "" }, { src: PNGS[1], title: "b", caption: "" }];
		const { container, rerender } = render(<Lightbox items={items} index={1} onIndex={() => {}} onClose={() => {}} />);
		expect(view(dialogOf(container))).toMatchObject({ open: true, title: "b" });
		rerender(<Lightbox items={items} index={null} onIndex={() => {}} onClose={() => {}} />);
		expect(dialogOf(container).open).toBe(false);
		rerender(<Lightbox items={items} index={0} onIndex={() => {}} onClose={() => {}} />);
		expect(view(dialogOf(container))).toMatchObject({ open: true, title: "a", count: "1 / 2" });
		await settle();
	});
});

describe("DocPlots", () => {
	const plotsProject = (plots) => ({ ...emptyProject(), plots });

	it("renders nothing without plots", () => {
		expect(render(<DocPlots project={plotsProject({ base: null, show: null })} />).container.innerHTML).toBe("");
	});

	it("base + show: its own carousel group, plot names as titles", async () => {
		const { container } = render(<DocPlots project={plotsProject({ base: PNGS[0], show: PNGS[1] })} />);
		expect(container.querySelector("section").dataset.zoomGroup).toBe("plots");
		expect([...container.querySelectorAll(".doc__plot-cap")].map((cap) => cap.textContent)).toEqual([t("plots.base"), t("plots.show")]);
		const dialog = dialogOf(container);
		await run(() => container.querySelectorAll(".doc__zoom")[1].click());
		expect(view(dialog)).toEqual({ open: true, src: PNGS[1], count: "2 / 2", title: t("plots.show"), caption: "" });
		await press(dialog, "ArrowRight");
		expect(view(dialog).title).toBe(t("plots.base"));
		await run(() => dialog.querySelector(".lightbox__close").click());
		expect(dialog.open).toBe(false);
	});

	it("only the show plot: a single-item carousel", async () => {
		const { container } = render(<DocPlots project={plotsProject({ base: null, show: PNGS[2] })} />);
		expect(container.querySelectorAll(".doc__plot")).toHaveLength(1);
		await run(() => container.querySelector(".doc__zoom").click());
		expect(view(dialogOf(container))).toMatchObject({ open: true, title: t("plots.show"), count: "" });
	});
});

describe("reducer: photos keep their pixel size", () => {
	it("PHOTOS_ADD stores width and height from the upload", () => {
		const next = projectReducer(emptyProject(), {
			type: "PHOTOS_ADD",
			items: [{ name: "Mac Quantum #5.jpg", src: PNGS[0], width: 4000, height: 3000 }],
		});
		expect(next.photos[0]).toMatchObject({ src: PNGS[0], width: 4000, height: 3000, order: 0 });
	});
});
