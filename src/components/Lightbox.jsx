// Полноэкранная карусель на нативном <dialog>.
// items: [{ src, title, caption }], index: номер открытой картинки или null (закрыто),
// onIndex(i) — перейти к картинке, onClose() — закрыть.
// Листание: кнопки ‹ ›, стрелки ← →, свайп; по кругу (после последней — первая).
// Разметка рендерится всегда (и в экспорте, даже закрытая): инлайн-скрипт
// standalone-файла (utils/exportScript.js) находит те же классы и повторяет
// это поведение без React. Менять вместе.
import { useEffect, useRef } from "react";
import { useT } from "../i18n/I18nProvider.jsx";

// Сдвиг пальца/мыши в px, после которого считаем жест свайпом
export const SWIPE_PX = 50;

// Горизонтальный свайп: onSwipe(+1) — влево (следующая), onSwipe(-1) — вправо.
// wasSwipe() — был ли последний жест свайпом (чтобы click после него не закрыл карусель).
function useSwipe(onSwipe) {
  const startXRef = useRef(null);
  const swipedRef = useRef(false);
  return {
    onPointerDown: (event) => {
      startXRef.current = event.clientX;
      swipedRef.current = false;
    },
    onPointerUp: (event) => {
      if (startXRef.current === null) { return; }
      const dx = event.clientX - startXRef.current;
      startXRef.current = null;
      if (Math.abs(dx) > SWIPE_PX) {
        swipedRef.current = true;
        onSwipe(dx < 0 ? 1 : -1);
      }
    },
    wasSwipe: () => {
      const swiped = swipedRef.current;
      swipedRef.current = false;
      return swiped;
    },
  };
}

// Закрытая карусель: пустые поля вместо картинки (img без src)
const CLOSED_ITEM = { src: undefined, title: "", caption: "" };

export function Lightbox({ items, index, onIndex, onClose }) {
  const { t, tn } = useT();
  const ref = useRef(null);
  const count = items.length;
  const isOpen = index !== null && index >= 0 && index < count;
  const item = isOpen ? items[index] : CLOSED_ITEM;
  const go = (step) => onIndex((index + step + count) % count);
  const { onPointerDown, onPointerUp, wasSwipe } = useSwipe((step) => { if (count > 1) { go(step); } });

  useEffect(() => {
    const dialog = ref.current;
    if (isOpen && !dialog.open) { dialog.showModal(); }
    if (!isOpen && dialog.open) { dialog.close(); }
  }, [isOpen]);

  // Esc у <dialog> вызывает событие cancel — закрываем через state, а не напрямую
  useEffect(() => {
    const dialog = ref.current;
    const onCancel = (event) => { event.preventDefault(); onClose(); };
    dialog.addEventListener("cancel", onCancel);
    return () => dialog.removeEventListener("cancel", onCancel);
  }, [onClose]);

  const onKeyDown = (event) => {
    if (count < 2) { return; }
    if (event.key === "ArrowLeft") { event.preventDefault(); go(-1); }
    if (event.key === "ArrowRight") { event.preventDefault(); go(1); }
  };

  // Клик по подложке закрывает, но не сразу после свайпа (click приходит после pointerup)
  const onClick = (event) => {
    if (!wasSwipe() && event.target === event.currentTarget) { onClose(); }
  };

  return (
    // Клик по подложке и свайп — удобство для мыши/пальца. С клавиатуры: Esc, ← →, кнопки.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={ref}
      className="lightbox"
      aria-label={item.title || t("common.zoom")}
      onClick={onClick}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
    >
      <button type="button" className="lightbox__close" onClick={onClose} aria-label={t("common.close")}>✕</button>
      <button
        type="button" className="lightbox__nav lightbox__nav--prev" hidden={count < 2}
        onClick={() => go(-1)} aria-label={t("lightbox.prev")}
      >‹</button>
      <button
        type="button" className="lightbox__nav lightbox__nav--next" hidden={count < 2}
        onClick={() => go(1)} aria-label={t("lightbox.next")}
      >›</button>
      <img className="lightbox__img" src={item.src} alt={item.title} />
      <div className="lightbox__cap">
        <span className="lightbox__count">{isOpen && count > 1 ? tn("lightbox.count", index + 1, count) : ""}</span>
        <span className="lightbox__title">{item.title}</span>
        <span className="lightbox__caption">{item.caption}</span>
      </div>
    </dialog>
  );
}
