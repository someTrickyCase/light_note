import { useState } from "react";
import { useT } from "../i18n/I18nProvider.jsx";
import { Lightbox } from "../components/Lightbox.jsx";

export function DocPlots({ project }) {
  const { t } = useT();
  const { plots } = project;
  const [zoom, setZoom] = useState(null);
  if (!plots.base && !plots.show) return null;
  return (
    <section className="doc__section">
      <h2 className="doc__h2">{t("doc.section.plots")}</h2>
      {plots.base && (
        <figure className="doc__plot">
          <img
            src={plots.base} alt={t("plots.base")}
            onClick={() => setZoom({ src: plots.base, caption: t("plots.base") })}
            style={{ cursor: "zoom-in" }}
          />
          <div className="doc__plot-cap">{t("plots.base")}</div>
        </figure>
      )}
      {plots.show && (
        <figure className="doc__plot">
          <img
            src={plots.show} alt={t("plots.show")}
            onClick={() => setZoom({ src: plots.show, caption: t("plots.show") })}
            style={{ cursor: "zoom-in" }}
          />
          <div className="doc__plot-cap">{t("plots.show")}</div>
        </figure>
      )}
      <Lightbox
        src={zoom?.src}
        caption={zoom?.caption}
        onClose={() => setZoom(null)}
      />
    </section>
  );
}
