// Галерея: мозаика «justified rows». Фото не обрезаются и сохраняют свои
// пропорции; в строке у всех одинаковая высота, порядок — слева направо.
// Трюк (см. .doc__tile в document.css): flex-grow = соотношение сторон,
// flex-basis = соотношение × высота строки → свободное место делится
// пропорционально, высоты в строке выходят равными. Без JS — работает и в экспорте.
// Клик по фото — полноэкранная карусель (Lightbox) по всем фото.
import { useState } from "react";
import { useT } from "../i18n/I18nProvider.jsx";
import { Lightbox } from "../components/Lightbox.jsx";
import { ZoomImage } from "./ZoomImage.jsx";
import { imageKey } from "../utils/imageKey.js";

// Для фото без известного размера (битая картинка в старом проекте)
const FALLBACK_RATIO = 4 / 3;

export function aspectRatio(photo) {
  const ratio = photo.width > 0 && photo.height > 0 ? photo.width / photo.height : FALLBACK_RATIO;
  return Math.round(ratio * 10_000) / 10_000;
}

export function DocGallery({ project }) {
  const { t } = useT();
  const [index, setIndex] = useState(null);
  const photos = project.photos;

  if (photos.length === 0) { return null; }
  const items = photos.map((photo) => ({ src: photo.src, title: photo.tag || "", caption: photo.caption || "" }));
  return (
    <section className="doc__section" data-zoom-group="gallery">
      <h2 className="doc__h2">{t("doc.section.gallery")}</h2>
      <div className="doc__mosaic">
        {photos.map((photo, photoIndex) => (
          <figure key={photo.id} className="doc__tile" style={{ "--ar": aspectRatio(photo) }}>
            <ZoomImage
              src={photo.src} alt={photo.tag || ""} title={photo.tag || ""} caption={photo.caption || ""}
              imageRef={imageKey.photo(photo.id)} onOpen={() => setIndex(photoIndex)}
            />
            {photo.tag || photo.caption ? (
              <figcaption className="doc__tile-cap">
                {photo.tag ? <span className="doc__tile-tag">{photo.tag}</span> : null}
                {photo.caption ? <span>{photo.caption}</span> : null}
              </figcaption>
            ) : null}
          </figure>
        ))}
      </div>
      <Lightbox items={items} index={index} onIndex={setIndex} onClose={() => setIndex(null)} />
    </section>
  );
}
