// Модальный просмотр картинки на нативном <dialog>.
// В превью открывается через useEffect. В экспортированном HTML
// <dialog> рендерится всегда (даже пустой) — это позволяет инлайн-скрипту
// в standalone-файле открывать его без пересоздания.
import { useEffect, useRef } from "react";

export function Lightbox({ src, caption, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (src) {
      if (!d.open) d.showModal();
    } else if (d.open) {
      d.close();
    }
  }, [src]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const onCancel = (e) => { e.preventDefault(); onClose(); };
    d.addEventListener("cancel", onCancel);
    return () => d.removeEventListener("cancel", onCancel);
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      className="lightbox"
      onClick={(e) => {
        if (e.target.tagName === "DIALOG") onClose();
      }}
    >
      <button type="button" className="lightbox__close" onClick={onClose} aria-label="Закрыть">✕</button>
      {src && <img className="lightbox__img" src={src} alt={caption || ""} />}
      {src && caption && <div className="lightbox__cap">{caption}</div>}
    </dialog>
  );
}
