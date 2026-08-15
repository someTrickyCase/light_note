import { Chip } from "../components/Chip.jsx";
import { useT } from "../i18n/I18nProvider.jsx";

export function DocFixtures({ project }) {
  const { t } = useT();
  const fx = project.fixtures.filter(f => f.type);
  if (fx.length === 0) return null;
  return (
    <section className="doc__section">
      <h2 className="doc__h2">{t("doc.section.fixtures")}</h2>
      <div className="doc__chips">
        {fx.map((f) => <Chip key={f.id}>{f.type} ×{f.qty}</Chip>)}
      </div>
    </section>
  );
}
