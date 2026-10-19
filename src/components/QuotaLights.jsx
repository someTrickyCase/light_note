// =====================================================================
// COMPONENT · ИНДИКАТОР ЗАНЯТОГО МЕСТА В БРАУЗЕРЕ
// =====================================================================
// Три светящихся круга в шапке превью (как macOS-окно).
// Каждый круг = один уровень: ok / warn / err.
// Активный уровень подсвечен, остальные — пастельные.
// На hover — нативный title с человекочитаемым размером и подсказкой.

import { useT } from "../i18n/I18nProvider.jsx";
import { QUOTA_LEVELS, formatBytes } from "../utils/storageQuota.js";

const DOTS = ["ok", "warn", "err"];

export function QuotaLights({ level, usedBytes, quotaBytes }) {
	const { t } = useT();
	const used = formatBytes(usedBytes, t);
	// quotaBytes = 0 — браузер не сообщает лимит, показываем только занятое
	const amount = quotaBytes
		? `${used} / ${formatBytes(quotaBytes, t)} (${Math.min(100, Math.round((usedBytes / quotaBytes) * 100))}%)`
		: used;

	return (
		<span className="quota-lights" aria-label={t("quota.aria")}>
			{DOTS.map((lvl) => {
				const isActive = level === lvl;
				const order = QUOTA_LEVELS[lvl].order;
				const tipKey = isActive ? `quota.tip.${lvl}.active` : `quota.tip.${lvl}.idle`;
				const title = isActive
					? `${t(tipKey)} · ${amount}`
					: t(tipKey);
				return (
					<span
						key={lvl}
						className={`quota-dot quota-dot--${lvl}${isActive ? " is-active" : ""}`}
						title={title}
						data-level-order={order}
					/>
				);
			})}
		</span>
	);
}
