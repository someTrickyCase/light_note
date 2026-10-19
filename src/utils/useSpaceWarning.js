// =====================================================================
// HOOK · ПРЕДУПРЕЖДЕНИЕ «МАЛО МЕСТА»
// =====================================================================
// Спрашивает у браузера занятое место и потолок: сразу при открытии и
// через паузу после каждого изменения проекта. Когда до потолка остаётся
// меньше 1 ГБ (storageQuota.js#isSpaceLow) — один toast, который висит,
// пока его не закроют. Место освободилось — toast убираем; снова мало —
// предупреждаем снова. Ничего не рендерит.

import { useEffect, useRef } from "react";
import { storage } from "../state/storage.js";
import { formatBytes, freeBytes, isSpaceLow } from "./storageQuota.js";
import { dismissToast, pushToast } from "./toast.js";

// Пауза после изменения проекта: даём сохранению дойти до IDB и не
// дёргаем estimate() на каждую букву.
const ESTIMATE_DELAY_MS = 800;

export function useSpaceWarning(project, t, tn) {
	const measuredRef = useRef(false);
	// id висящего предупреждения или null
	const toastRef = useRef(null);

	useEffect(() => {
		let alive = true;
		// первый замер сразу, дальше — после паузы. Флаг ставим только когда браузер
		// ответил: StrictMode в dev запускает эффект дважды, первый таймер отменяется.
		const delay = measuredRef.current ? ESTIMATE_DELAY_MS : 0;
		const timer = setTimeout(() => {
			storage.estimate().then(({ usedBytes, quotaBytes }) => {
				if (!alive) { return; }
				measuredRef.current = true;
				const low = isSpaceLow(usedBytes, quotaBytes);
				if (low && toastRef.current === null) {
					const free = formatBytes(freeBytes(usedBytes, quotaBytes), t);
					toastRef.current = pushToast({ tone: "warn", msg: tn("storage.lowSpace", free), ttl: 0 });
				}
				if (!low && toastRef.current !== null) {
					dismissToast(toastRef.current);
					toastRef.current = null;
				}
			});
		}, delay);
		return () => {
			alive = false;
			clearTimeout(timer);
		};
	}, [project, t, tn]);
}
