import { useT } from "../i18n/I18nProvider.jsx";

export function DocTimes({ project }) {
  const { t } = useT();
  const { times } = project;
  return (
    <div className="doc__times">
      <div className="doc__time">
        <div className="doc__time-l">{t("doc.times.setup")}</div>
        <div className="doc__time-v">{times.setup || "—"}</div>
        <div className="doc__time-note">{t("times.setup.note")}</div>
      </div>
      <div className="doc__time">
        <div className="doc__time-l">{t("doc.times.runtime")}</div>
        <div className="doc__time-v">{times.runtime || "—"}</div>
      </div>
      <div className="doc__time">
        <div className="doc__time-l">{t("doc.times.staff")}</div>
        <div className="doc__time-v" style={{ fontSize: 18 }}>{times.staff || "—"}</div>
      </div>
    </div>
  );
}
