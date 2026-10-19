// Картинка, которая по клику открывается в Lightbox.
// Класс doc__zoom и data-caption читает и инлайн-скрипт экспорта
// (utils/exportScript.js) — не менять их без правки скрипта.
import { useT } from "../i18n/I18nProvider.jsx";

export function ZoomImage({ src, alt, caption, onZoom }) {
  const { t } = useT();
  return (
    <button
      type="button"
      className="doc__zoom"
      data-caption={caption}
      aria-label={caption ? `${t("common.zoom")}: ${caption}` : t("common.zoom")}
      onClick={() => onZoom({ src, caption })}
    >
      <img src={src} alt={alt} />
    </button>
  );
}
