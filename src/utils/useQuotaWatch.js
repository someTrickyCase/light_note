// =====================================================================
// HOOK · СЛЕЖЕНИЕ ЗА УРОВНЕМ ЗАНЯТОГО МЕСТА
// =====================================================================
// Возвращает { level, usedBytes } и при переходе через пороги
// (ok → warn → err) показывает toast один раз.
// Используется в Preview, чтобы индикатор реагировал на сохранения.

import { useEffect, useRef, useState } from "react";
import { projectSize, quotaLevel, QUOTA_LEVELS } from "./storageQuota.js";
import { pushToast } from "./toast.js";

export function useQuotaWatch(project, t) {
	const usedBytes = projectSize(project);
	const level = quotaLevel(usedBytes);

	// Храним предыдущий уровень между рендерами
	const prevRef = useRef(level);
	const firstRenderRef = useRef(true);

	useEffect(() => {
		const prev = prevRef.current;
		// На первом рендере не тостим — пользователь ещё ничего не делал
		if (firstRenderRef.current) {
			firstRenderRef.current = false;
			prevRef.current = level;
			return;
		}
		// Тостим только при ужесточении (ok→warn, warn→err, ok→err).
		// Возврат (err→warn) намеренно не тостим — не шумим.
		if (QUOTA_LEVELS[level].order > QUOTA_LEVELS[prev].order) {
			const key = level === "err" ? "quota.toast.err" : "quota.toast.warn";
			pushToast({ tone: level, msg: t(key), ttl: 8000 });
		}
		prevRef.current = level;
	}, [level, t]);

	return { level, usedBytes };
}
