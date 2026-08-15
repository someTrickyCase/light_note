import { useT } from "../i18n/I18nProvider.jsx";

export function DocHeader({ project }) {
  const { t } = useT();
  const { meta } = project;
  // пустые поля не выводятся (по требованию)
  const rows = [];
  if (meta.venue) rows.push(
    <div key="venue" className="doc__byline-row doc__byline-row--venue">
      <div className="doc__byline-k">{t("meta.venue")}</div>
      <div className="doc__byline-v">{meta.venue}</div>
    </div>
  );
  if (meta.date) rows.push(
    <div key="date" className="doc__byline-row">
      <div className="doc__byline-k">{t("meta.date")}</div>
      <div className="doc__byline-v">{meta.date}</div>
    </div>
  );
  if (meta.director) rows.push(
    <div key="dir" className="doc__byline-row">
      <div className="doc__byline-k">{t("meta.director")}</div>
      <div className="doc__byline-v">{meta.director}</div>
    </div>
  );
  if (meta.ld) rows.push(
    <div key="ld" className="doc__byline-row">
      <div className="doc__byline-k">{t("meta.ld")}</div>
      <div className="doc__byline-v">{meta.ld}</div>
    </div>
  );
  if (meta.console) rows.push(
    <div key="con" className="doc__byline-row">
      <div className="doc__byline-k">{t("meta.console")}</div>
      <div className="doc__byline-v">{meta.console}</div>
    </div>
  );
  return (
    <header className="doc__head">
      <div className="doc__kick">{t("doc.kick")}</div>
      <div className="doc__show-label">{t("doc.showLabel")}</div>
      <h1 className="doc__title">{meta.showName || "—"}</h1>
      {rows.length > 0 && <div className="doc__byline">{rows}</div>}
    </header>
  );
}
