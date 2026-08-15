import { useRef, useState } from "react";
import { useT } from "../i18n/I18nProvider.jsx";
import { Lightbox } from "../components/Lightbox.jsx";

export function DocGallery({ project }) {
  const { t } = useT();
  const photos = project.photos;
  const ref = useRef(null);
  const [zoom, setZoom] = useState(null);

  const scroll = (dir) => {
    const el = ref.current;
    if (!el) return;
    const w = el.clientWidth || 600;
    el.scrollBy({ left: dir * w, behavior: "smooth" });
  };

  if (photos.length === 0) return null;
  return (
    <section className="doc__section">
      <h2 className="doc__h2">{t("doc.section.gallery")}</h2>
      <div className="doc__gallery-wrap">
        {photos.length > 1 && (
          <>
            <button type="button" className="doc__gallery-btn doc__gallery-btn--prev"
                    aria-label="Предыдущее фото" onClick={() => scroll(-1)}>‹</button>
            <button type="button" className="doc__gallery-btn doc__gallery-btn--next"
                    aria-label="Следующее фото" onClick={() => scroll(1)}>›</button>
          </>
        )}
        <div className="doc__gallery" ref={ref}>
          {photos.map((p) => (
            <figure key={p.id} className="doc__photo">
              <img
                src={p.src} alt={p.tag || ""}
                onClick={() => setZoom({ src: p.src, caption: p.tag || "" })}
                style={{ cursor: "zoom-in" }}
              />
              <figcaption className="doc__photo-meta">
                {p.tag && <div className="doc__photo-tag">{p.tag}</div>}
                {p.caption && <div>{p.caption}</div>}
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
