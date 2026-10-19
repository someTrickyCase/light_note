import { useRef, useState } from "react";
import { useT } from "../i18n/I18nProvider.jsx";
import { Lightbox } from "../components/Lightbox.jsx";
import { ZoomImage } from "./ZoomImage.jsx";

export function DocGallery({ project }) {
  const { t } = useT();
  const photos = project.photos;
  const ref = useRef(null);
  const [zoom, setZoom] = useState(null);

  const scroll = (direction) => {
    const element = ref.current;
    if (!element) { return; }
    const width = element.clientWidth || 600;
    element.scrollBy({ left: direction * width, behavior: "smooth" });
  };

  if (photos.length === 0) { return null; }
  return (
    <section className="doc__section">
      <h2 className="doc__h2">{t("doc.section.gallery")}</h2>
      <div className="doc__gallery-wrap">
        {photos.length > 1 && (
          <>
            <button type="button" className="doc__gallery-btn doc__gallery-btn--prev"
                    aria-label={t("gallery.prev")} onClick={() => scroll(-1)}>‹</button>
            <button type="button" className="doc__gallery-btn doc__gallery-btn--next"
                    aria-label={t("gallery.next")} onClick={() => scroll(1)}>›</button>
          </>
        )}
        <div className="doc__gallery" ref={ref}>
          {photos.map((photo) => (
            <figure key={photo.id} className="doc__photo">
              <ZoomImage src={photo.src} alt={photo.tag || ""} caption={photo.tag || ""} onZoom={setZoom} />
              <figcaption className="doc__photo-meta">
                {photo.tag ? <div className="doc__photo-tag">{photo.tag}</div> : null}
                {photo.caption ? <div>{photo.caption}</div> : null}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
      <Lightbox
        src={zoom?.src}
        caption={zoom?.caption}
        onClose={() => setZoom(null)}
      />
    </section>
  );
}
