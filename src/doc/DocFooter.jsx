import { useT } from "../i18n/I18nProvider.jsx";
import { imageKey } from "../utils/imageKey.js";

export function DocFooter({ project }) {
  const { t, tn } = useT();
  const { meta } = project;
  return (
    <footer className="doc__foot">
      {meta.logo ? (
        <img className="doc__foot-logo" src={meta.logo} alt={t("meta.logo.alt")} data-ln-ref={imageKey.logo} />
      ) : (
        <span className="doc__foot-name">{tn("doc.foot.left", meta.showName)}</span>
      )}
      <span />
    </footer>
  );
}
