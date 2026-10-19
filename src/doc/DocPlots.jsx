// Плоты (базовый развес и развес спектакля). Клик — полноэкранная карусель по плотам.
import { useState } from "react";
import { useT } from "../i18n/I18nProvider.jsx";
import { Lightbox } from "../components/Lightbox.jsx";
import { ZoomImage } from "./ZoomImage.jsx";
import { imageKey } from "../utils/imageKey.js";

export function DocPlots({ project }) {
  const { t } = useT();
  const { plots } = project;
  const [index, setIndex] = useState(null);
  if (!plots.base && !plots.show) { return null; }
  const items = ["base", "show"]
    .filter((which) => plots[which])
    .map((which) => ({ which, src: plots[which], title: t(`plots.${which}`), caption: "" }));
  return (
    <section className="doc__section" data-zoom-group="plots">
      <h2 className="doc__h2">{t("doc.section.plots")}</h2>
      {items.map((item, itemIndex) => (
        <figure key={item.which} className="doc__plot">
          <ZoomImage
            src={item.src} alt={item.title} title={item.title} caption=""
            imageRef={imageKey.plot(item.which)} onOpen={() => setIndex(itemIndex)}
          />
          <div className="doc__plot-cap">{item.title}</div>
        </figure>
      ))}
      <Lightbox items={items} index={index} onIndex={setIndex} onClose={() => setIndex(null)} />
    </section>
  );
}
