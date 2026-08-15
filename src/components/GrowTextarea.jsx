// =====================================================================
// COMPONENT · TEXTAREA С АВТОМАТИЧЕСКИМ РОСТОМ ПО СТРОКАМ
// =====================================================================
// rows = min(value's line count, MAX_ROWS).
// Без скроллов, без ResizeObserver. Высота = rows × line-height + padding.
// Гарантирует: горизонтального скролла нет, всё содержимое видно.

import { forwardRef, useLayoutEffect, useState } from "react";
import { cn } from "./cn.js";

const MIN_ROWS = 1;
const MAX_ROWS = 8;

// Считает количество строк, которое займёт текст при текущей ширине textarea.
// Используем скрытый mirror-div с теми же стилями — это единственный
// надёжный способ узнать фактическое число строк.
function countLines(el) {
	if (!el) return MIN_ROWS;
	const style = window.getComputedStyle(el);
	const lineHeight = parseFloat(style.lineHeight);
	if (!lineHeight || Number.isNaN(lineHeight)) return MIN_ROWS;
	// Создаём невидимый mirror
	const mirror = document.createElement("div");
	mirror.style.position = "absolute";
	mirror.style.visibility = "hidden";
	mirror.style.whiteSpace = "pre-wrap";
	mirror.style.wordBreak = "break-word";
	mirror.style.overflowWrap = "anywhere";
	mirror.style.boxSizing = "border-box";
	mirror.style.width = el.clientWidth + "px";
	mirror.style.padding = style.padding;
	mirror.style.font = style.font;
	mirror.textContent = el.value || "";
	document.body.appendChild(mirror);
	const h = mirror.scrollHeight;
	document.body.removeChild(mirror);
	const lines = Math.max(MIN_ROWS, Math.ceil(h / lineHeight));
	return Math.min(MAX_ROWS, lines);
}

export const GrowTextarea = forwardRef(function GrowTextarea(
	{ className, mono, selectOnFocus = true, value, ...rest },
	ref
) {
	const [rows, setRows] = useState(MIN_ROWS);

	useLayoutEffect(() => {
		const el = ref && ref.current;
		if (!el) return;
		setRows(countLines(el));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ref, value]);

	return (
		<textarea
			ref={ref}
			rows={rows}
			value={value}
			className={cn("textarea", mono && "textarea--mono", "textarea--grow", className)}
			onFocus={selectOnFocus ? (e) => e.target.select() : undefined}
			{...rest}
		/>
	);
});
