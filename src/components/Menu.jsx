// =====================================================================
// COMPONENT · ВЫПАДАЮЩЕЕ МЕНЮ (кнопка + список действий)
// =====================================================================
// items — строки списка:
//   { label, onSelect }                   — действие: выполняет и закрывает меню
//   { label, onSelect, checked: boolean } — выбор из группы (тема, шрифт): role=menuitemradio,
//                                           меню остаётся открытым — можно сравнить варианты
//   { heading, id }                       — подпись группы (не фокусируется)
//   { separator: true, id }               — разделитель
// Клавиатура как в обычных меню: Enter/Space/↓ открывают и ставят фокус на
// первый пункт, ↑ ↓ Home End — по пунктам, Esc закрывает и возвращает фокус
// на кнопку, Tab или клик мимо — просто закрывают.

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "./cn.js";

const ITEM = "[role=menuitem], [role=menuitemradio]";

function MenuRow({ item, onClose }) {
	if (item.separator) { return <div className="menu__sep" role="separator" />; }
	if (item.heading) { return <div className="menu__heading" role="presentation">{item.heading}</div>; }
	const isChoice = item.checked !== undefined;
	return (
		<button
			type="button"
			role={isChoice ? "menuitemradio" : "menuitem"}
			aria-checked={isChoice ? item.checked : undefined}
			className={cn("menu__item", item.checked && "is-checked")}
			tabIndex={-1}
			onClick={() => {
				if (!isChoice) { onClose(); }
				item.onSelect();
			}}
		>
			{item.label}
		</button>
	);
}

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
					{items.map((item) => <MenuRow key={item.id ?? item.label} item={item} onClose={() => setOpen(false)} />)}
				</div>
			) : null}
		</div>
	);
}
