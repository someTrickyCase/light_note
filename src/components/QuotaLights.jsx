// =====================================================================
// COMPONENT · ИНДИКАТОР ЗАНЯТОГО МЕСТА В LOCALSTORAGE
// =====================================================================
// Три светящихся круга в шапке превью (как macOS-окно).
// Каждый круг = один уровень: ok / warn / err.
// Активный уровень подсвечен, остальные — пастельные.
// На hover — нативный title с человекочитаемым размером и подсказкой.

import { useT } from "../i18n/I18nProvider.jsx";
import { QUOTA_LEVELS, formatBytes, QUOTA_BUDGET_BYTES } from "../utils/storageQuota.js";

const DOTS = ["ok", "warn", "err"];

export function QuotaLights({ level, usedBytes, budget = QUOTA_BUDGET_BYTES }) {
	const { t } = useT();
	const used = formatBytes(usedBytes);
	const total = formatBytes(budget);
	const ratio = Math.min(100, Math.round((usedBytes / budget) * 100));

	return (
		<span className="quota-lights" aria-label={t("quota.aria")}>
			{DOTS.map((lvl) => {
				const isActive = level === lvl;
				const order = QUOTA_LEVELS[lvl].order;
				const tipKey = isActive ? `quota.tip.${lvl}.active` : `quota.tip.${lvl}.idle`;
				const title = isActive
					? `${t(tipKey)} · ${used} / ${total} (${ratio}%)`
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
