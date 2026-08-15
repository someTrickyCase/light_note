import { useT } from "../i18n/I18nProvider.jsx";
import { renderMarkdown } from "./markdown.js";

export function DocCommentary({ project }) {
  const { t } = useT();
  if (!project.commentary) return null;
  return (
    <section className="doc__section">
      <h2 className="doc__h2">{t("doc.section.commentary")}</h2>
      <div
        className="doc__commentary"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(project.commentary) }}
      />
    </section>
  );
}
