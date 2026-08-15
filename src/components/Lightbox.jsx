// Модальный просмотр картинки на нативном <dialog>.
// Открывается по клику на превью; закрывается по Esc / клику на фон / крестику.
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

  // ESC по умолчанию закрывает <dialog>, но onClose не вызывается — слушаем.
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const onCancel = (e) => { e.preventDefault(); onClose(); };
    d.addEventListener("cancel", onCancel);
    return () => d.removeEventListener("cancel", onCancel);
  }, [onClose]);

  if (!src) return null;
  return (
    <dialog
      ref={ref}
      className="lightbox"
      onClick={(e) => {
        // клик по фону (не по картинке) — закрыть
        if (e.target.tagName === "DIALOG") onClose();
      }}
    >
      <button type="button" className="lightbox__close" onClick={onClose} aria-label="Закрыть">✕</button>
      <img className="lightbox__img" src={src} alt={caption || ""} />
      {caption && <div className="lightbox__cap">{caption}</div>}
    </dialog>
  );
}
