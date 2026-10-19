// =====================================================================
// HOOK · ОТКРЫТЬ ПРОЕКТ, БРОСИВ .html НА ОКНО
// =====================================================================
// Файлы, брошенные мимо зон загрузки (FileDrop сам вызывает preventDefault
// и сюда не доходит). Без этого браузер открыл бы брошенный файл вместо
// приложения. onDrop(file) — первый HTML-файл или null, если HTML среди них нет.

import { useEffect, useRef } from "react";

export const isHtmlFile = (file) => file.type === "text/html" || /\.html?$/i.test(file.name);

const hasFiles = (event) => Boolean(event.dataTransfer?.types?.includes("Files"));

export function useHtmlDrop(onDrop) {
	const onDropRef = useRef(onDrop);
	useEffect(() => { onDropRef.current = onDrop; });

	useEffect(() => {
		const onDragOver = (event) => {
			if (hasFiles(event)) { event.preventDefault(); }
		};
		const onWindowDrop = (event) => {
			if (event.defaultPrevented || !hasFiles(event)) { return; }
			event.preventDefault();
			onDropRef.current([...event.dataTransfer.files].find((file) => isHtmlFile(file)) ?? null);
		};
		globalThis.addEventListener("dragover", onDragOver);
		globalThis.addEventListener("drop", onWindowDrop);
		return () => {
			globalThis.removeEventListener("dragover", onDragOver);
			globalThis.removeEventListener("drop", onWindowDrop);
		};
	}, []);
}
