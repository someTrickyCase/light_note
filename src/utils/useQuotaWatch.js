// =====================================================================
// HOOK · СЛЕЖЕНИЕ ЗА УРОВНЕМ ЗАНЯТОГО МЕСТА
// =====================================================================
// Возвращает { level, usedBytes, quotaBytes } и при переходе через пороги
// (ok → warn → err) показывает toast один раз.
// Используется в Preview, чтобы индикатор реагировал на сохранения.

import { useEffect, useRef, useState } from "react";
import { storage } from "../state/storage.js";
import { quotaLevel, QUOTA_LEVELS } from "./storageQuota.js";
import { pushToast } from "./toast.js";

// Пауза после изменения проекта: даём сохранению дойти до IDB и не
// дёргаем estimate() на каждую букву.
const ESTIMATE_DELAY_MS = 800;

export function useQuotaWatch(project, t) {
	const [usage, setUsage] = useState({ usedBytes: 0, quotaBytes: 0 });

	useEffect(() => {
		let alive = true;
		const timer = setTimeout(() => {
			storage.estimate().then((next) => { if (alive) { setUsage(next); } });
		}, ESTIMATE_DELAY_MS);
		return () => {
			alive = false;
			clearTimeout(timer);
		};
	}, [project]);

	const level = quotaLevel(usage.usedBytes, usage.quotaBytes);

	// Храним предыдущий уровень между рендерами
	const previousRef = useRef(level);
	const firstRenderRef = useRef(true);

	useEffect(() => {
		const previous = previousRef.current;
		// На первом рендере не тостим — пользователь ещё ничего не делал
		if (firstRenderRef.current) {
			firstRenderRef.current = false;
			previousRef.current = level;
			return;
		}
		// Тостим только при ужесточении (ok→warn, warn→err, ok→err).
		// Возврат (err→warn) намеренно не тостим — не шумим.
		if (QUOTA_LEVELS[level].order > QUOTA_LEVELS[previous].order) {
			const key = level === "err" ? "quota.toast.err" : "quota.toast.warn";
			pushToast({ tone: level, msg: t(key), ttl: 8000 });
		}
		previousRef.current = level;
	}, [level, t]);

	return { level, ...usage };
}
