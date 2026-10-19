// Рендер React-компонентов в тестах без сторонних библиотек: createRoot + act.
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach } from "vitest";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mounted = [];

export function render(element, { width } = {}) {
	const container = document.createElement("div");
	if (width) { container.style.width = `${width}px`; }
	document.body.append(container);
	const root = createRoot(container);
	act(() => root.render(element));
	const view = {
		container,
		rerender: (next) => act(() => root.render(next)),
		unmount: () => act(() => root.unmount()),
	};
	mounted.push({ root, container });
	return view;
}

// Действие, которое меняет state, внутри act (клик, событие)
export const run = (action) => act(action);

// Подождать внутри act: обновления из таймеров/промисов применяются без предупреждений
export const settle = (ms = 0) => act(() => new Promise((resolve) => { setTimeout(resolve, ms); }));

// Ждать, пока проверка не пройдёт (до timeout), каждый шаг — внутри act
export async function waitFor(check, timeout = 3000) {
	const start = Date.now();
	for (;;) {
		try {
			return check();
		} catch (error) {
			if (Date.now() - start > timeout) { throw error; }
			// eslint-disable-next-line no-await-in-loop -- опрос по шагам и есть смысл функции
			await settle(20);
		}
	}
}

afterEach(() => {
	while (mounted.length > 0) {
		const { root, container } = mounted.pop();
		act(() => root.unmount());
		container.remove();
	}
});
