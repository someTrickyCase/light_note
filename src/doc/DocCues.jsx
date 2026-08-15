import { useT } from "../i18n/I18nProvider.jsx";

export function DocCues({ project }) {
  const { t } = useT();
  const cues = project.cues;
  if (cues.length === 0) return null;
  return (
    <section className="doc__section">
      <h2 className="doc__h2">{t("doc.section.cues")}</h2>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ width: 60 }}>{t("cues.col.num")}</th>
              <th>{t("cues.col.name")}</th>
              <th>{t("cues.col.info")}</th>
              <th style={{ width: 140 }}>{t("cues.col.trigger")}</th>
            </tr>
          </thead>
          <tbody>
            {cues.map((c) => (
              <tr key={c.id}>
                <td><span style={{ fontFamily: "var(--ff-mono)" }}>{c.num}</span></td>
                <td>{c.name || <span style={{ color: "var(--c-soft)" }}>—</span>}</td>
                <td>{c.info || <span style={{ color: "var(--c-soft)" }}>—</span>}</td>
                <td>{c.trigger || <span style={{ color: "var(--c-soft)" }}>—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
