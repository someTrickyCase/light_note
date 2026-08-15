import { useT } from "../i18n/I18nProvider.jsx";

export function DocTimes({ project }) {
	const { t } = useT();
	const { times } = project;
	return (
		<div className="doc__times">
			<div className="doc__time">
				<div className="doc__time-l">{t("doc.times.installation")}</div>
				<div className="doc__time-v">{times.installation || "—"}</div>
				<div className="doc__time-note">{t("times.installation.note")}</div>
			</div>
			<div className="doc__time">
				<div className="doc__time-l">{t("doc.times.focus")}</div>
				<div className="doc__time-v">{times.focus || "—"}</div>
				<div className="doc__time-note">{t("times.focus.note")}</div>
			</div>
			<div className="doc__time">
				<div className="doc__time-l">{t("doc.times.runtime")}</div>
				<div className="doc__time-v">{times.runtime || "—"}</div>
			</div>
			<div className="doc__time">
				<div className="doc__time-l">{t("doc.times.staff")}</div>
				<div className="doc__time-v" style={{ fontSize: 18 }}>
					{times.staff || "—"}
				</div>
			</div>
		</div>
	);
}
