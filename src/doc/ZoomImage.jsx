// Картинка-кнопка: клик/Enter открывает карусель (Lightbox).
// Класс doc__zoom, data-title и data-caption читает и инлайн-скрипт экспорта
// (utils/exportScript.js) — не менять их без правки скрипта.
// imageRef → data-ln-ref на <img>: по нему «Открыть HTML» находит картинку
// (utils/projectFile.js), поэтому в данных экспорта она не дублируется.
import { useT } from "../i18n/I18nProvider.jsx";

export function ZoomImage({ src, alt, title, caption, imageRef, onOpen }) {
  const { t } = useT();
  return (
    <button
      type="button"
      className="doc__zoom"
      data-title={title}
      data-caption={caption}
      aria-label={title ? `${t("common.zoom")}: ${title}` : t("common.zoom")}
      onClick={onOpen}
    >
      <img src={src} alt={alt} data-ln-ref={imageRef} />
    </button>
  );
}
