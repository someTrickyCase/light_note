// Картинка-кнопка: клик/Enter открывает карусель (Lightbox).
// Класс doc__zoom, data-title и data-caption читает и инлайн-скрипт экспорта
// (utils/exportScript.js) — не менять их без правки скрипта.
import { useT } from "../i18n/I18nProvider.jsx";

export function ZoomImage({ src, alt, title, caption, onOpen }) {
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
      <img src={src} alt={alt} />
    </button>
  );
}
