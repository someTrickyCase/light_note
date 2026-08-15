import { useT } from "../i18n/I18nProvider.jsx";

export function DocFooter({ project }) {
  const { t } = useT();
  const { meta } = project;
  return (
    <footer className="doc__foot">
      {meta.logo ? (
        <img className="doc__foot-logo" src={meta.logo} alt="логотип" />
      ) : (
        <span className="doc__foot-name">{t("doc.foot.left")(meta.showName)}</span>
      )}
      <span></span>
    </footer>
  );
}
