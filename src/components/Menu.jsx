// =====================================================================
// COMPONENT · ВЫПАДАЮЩЕЕ МЕНЮ (кнопка + список действий)
// =====================================================================
// items: [{ label, onSelect } | { separator: true, id }] (id — ключ разделителя).
// Стрелка ▾ у кнопки — в CSS (.menu__button::after).
// Клавиатура как в обычных меню: Enter/Space/↓ открывают и ставят фокус на
// первый пункт, ↑ ↓ Home End — по пунктам, Esc закрывает и возвращает фокус
// на кнопку, Tab или клик мимо — просто закрывают.

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "./cn.js";

const ITEM = "[role=menuitem]";

export function Menu({ label, items, className }) {
	const [open, setOpen] = useState(false);
	const rootRef = useRef(null);
	const buttonRef = useRef(null);
	const listRef = useRef(null);
	const listId = useId();

	// открылось — фокус на первый пункт; клик мимо меню — закрыть
	useEffect(() => {
		if (open) { listRef.current.querySelector(ITEM).focus(); }
		const onPointerDown = (event) => {
			if (open && !rootRef.current.contains(event.target)) { setOpen(false); }
		};
		document.addEventListener("pointerdown", onPointerDown);
		return () => document.removeEventListener("pointerdown", onPointerDown);
	}, [open]);

	const close = () => {
		setOpen(false);
		buttonRef.current.focus();
	};

	const onListKeyDown = (event) => {
		const elements = [...listRef.current.querySelectorAll(ITEM)];
		const current = elements.indexOf(document.activeElement);
		const target = {
			ArrowDown: (current + 1) % elements.length,
			ArrowUp: (current - 1 + elements.length) % elements.length,
			Home: 0,
			End: elements.length - 1,
		}[event.key];
		if (target !== undefined) {
			event.preventDefault();
			elements[target].focus();
		}
		if (event.key === "Escape") {
			event.preventDefault();
			close();
		}
		if (event.key === "Tab") { setOpen(false); }
	};

	const onButtonKeyDown = (event) => {
		if (event.key === "ArrowDown") {
			event.preventDefault();
			setOpen(true);
		}
	};

	return (
		<div className={cn("menu", className)} ref={rootRef}>
			<button
				ref={buttonRef}
				type="button"
				className="btn btn--ghost btn--sm menu__button"
				aria-haspopup="menu"
				aria-expanded={open}
				aria-controls={open ? listId : undefined}
				onClick={() => setOpen((value) => !value)}
				onKeyDown={onButtonKeyDown}
			>
				{label}
			</button>
			{open ? (
				<div id={listId} ref={listRef} className="menu__list" role="menu" tabIndex={-1} onKeyDown={onListKeyDown}>
					{items.map((item) => (item.separator
						? <div key={item.id} className="menu__sep" role="separator" />
						: (
							<button
								key={item.label}
								type="button"
								role="menuitem"
								className="menu__item"
								tabIndex={-1}
								onClick={() => {
									setOpen(false);
									item.onSelect();
								}}
							>
								{item.label}
							</button>
						)))}
				</div>
			) : null}
		</div>
	);
}
