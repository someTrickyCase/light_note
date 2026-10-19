// =====================================================================
// COMPONENT · ДИАЛОГ С ВЫБОРОМ (нативный <dialog>)
// =====================================================================
// open — показан ли; title, children — вопрос; choices — кнопки
// [{ label, variant, onSelect }], первая получает фокус. Esc и «Отмена»
// (cancelLabel) вызывают onCancel. Модальный: страница под ним недоступна.

import { useEffect, useRef } from "react";
import { Button } from "./Button.jsx";

export function ChoiceDialog({ open, title, children, choices, cancelLabel, onCancel }) {
	const ref = useRef(null);

	useEffect(() => {
		const dialog = ref.current;
		if (open && !dialog.open) { dialog.showModal(); }
		if (!open && dialog.open) { dialog.close(); }
	}, [open]);

	// Esc у <dialog> → событие cancel: закрываем через state, а не напрямую
	useEffect(() => {
		const dialog = ref.current;
		const onDialogCancel = (event) => {
			event.preventDefault();
			onCancel();
		};
		dialog.addEventListener("cancel", onDialogCancel);
		return () => dialog.removeEventListener("cancel", onDialogCancel);
	}, [onCancel]);

	return (
		<dialog ref={ref} className="choice-dialog" aria-labelledby="choice-dialog-title">
			{open ? (
				<>
					<h2 id="choice-dialog-title" className="choice-dialog__title">{title}</h2>
					<div className="choice-dialog__body">{children}</div>
					<div className="choice-dialog__actions">
						{choices.map((choice, index) => (
							// eslint-disable-next-line jsx-a11y/no-autofocus -- фокус в модальном диалоге — ожидаемое поведение
							<Button key={choice.label} variant={choice.variant} size="sm" autoFocus={index === 0} onClick={choice.onSelect}>
								{choice.label}
							</Button>
						))}
						<Button variant="ghost" size="sm" onClick={onCancel}>{cancelLabel}</Button>
					</div>
				</>
			) : null}
		</dialog>
	);
}
