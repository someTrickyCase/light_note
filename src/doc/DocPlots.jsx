import { useState } from "react";
import { useT } from "../i18n/I18nProvider.jsx";
import { Lightbox } from "../components/Lightbox.jsx";
import { ZoomImage } from "./ZoomImage.jsx";

export function DocPlots({ project }) {
  const { t } = useT();
  const { plots } = project;
  const [zoom, setZoom] = useState(null);
  if (!plots.base && !plots.show) { return null; }
  const items = ["base", "show"].filter((which) => plots[which]);
  return (
    <section className="doc__section">
      <h2 className="doc__h2">{t("doc.section.plots")}</h2>
      {items.map((which) => (
        <figure key={which} className="doc__plot">
          <ZoomImage src={plots[which]} alt={t(`plots.${which}`)} caption={t(`plots.${which}`)} onZoom={setZoom} />
          <div className="doc__plot-cap">{t(`plots.${which}`)}</div>
        </figure>
      ))}
      <Lightbox
        src={zoom?.src}
        caption={zoom?.caption}
        onClose={() => setZoom(null)}
      />
    </section>
  );
}
