import { useT } from "../i18n/I18nProvider.jsx";
import { renderMarkdown } from "./markdown.js";

export function DocCommentary({ project }) {
  const { t } = useT();
  if (!project.commentary) { return null; }
  return (
    <section className="doc__section">
      <h2 className="doc__h2">{t("doc.section.commentary")}</h2>
      {/* renderMarkdown экранирует весь HTML до разметки и пропускает только
          http(s)/mailto/# ссылки — поэтому вставка HTML здесь безопасна. */}
      <div
        className="doc__commentary"
        // eslint-disable-next-line react/no-danger -- вход экранирован в renderMarkdown, см. doc/markdown.js
        dangerouslySetInnerHTML={{ __html: renderMarkdown(project.commentary) }}
      />
    </section>
  );
}
