// Модальный просмотр картинки на нативном <dialog>.
// В превью открывается через useEffect. В экспортированном HTML
// <dialog> рендерится всегда (даже пустой) — это позволяет инлайн-скрипту
// в standalone-файле открывать его без пересоздания (см. utils/exportScript.js).
import { useEffect, useRef } from "react";
import { useT } from "../i18n/I18nProvider.jsx";

export function Lightbox({ src, caption, onClose }) {
  const { t } = useT();
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (src && !dialog.open) { dialog.showModal(); }
    if (!src && dialog.open) { dialog.close(); }
  }, [src]);

  // Esc у <dialog> вызывает событие cancel — закрываем через state, а не напрямую
  useEffect(() => {
    const dialog = ref.current;
    const onCancel = (event) => { event.preventDefault(); onClose(); };
    dialog.addEventListener("cancel", onCancel);
    return () => dialog.removeEventListener("cancel", onCancel);
  }, [onClose]);

  return (
    // Клик по подложке — удобство для мыши. С клавиатуры закрывают Esc и кнопка «Закрыть».
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={ref}
      className="lightbox"
      onClick={(event) => {
        if (event.target === event.currentTarget) { onClose(); }
      }}
    >
      <button type="button" className="lightbox__close" onClick={onClose} aria-label={t("common.close")}>✕</button>
      {src ? <img className="lightbox__img" src={src} alt={caption || ""} /> : null}
      {src && caption ? <div className="lightbox__cap">{caption}</div> : null}
    </dialog>
  );
}
