import { useRef, useState } from "react";
import { cn } from "./cn.js";
import { useT } from "../i18n/I18nProvider.jsx";
import { compressImage, readAsDataURL, JPEG_QUALITY, MAX_DIM } from "../utils/files.js";
import { pushToast } from "../utils/toast.js";

// Подбираем JPEG-качество и MAX_DIM в зависимости от текущего уровня занятости.
// Чем ближе к лимиту — тем сильнее сжимаем следующие файлы.
function adaptiveProfile(level) {
  if (level === "err") { return { maxDim: 1280, quality: 0.55 }; }
  if (level === "warn") { return { maxDim: 1600, quality: 0.7 }; }
  return { maxDim: MAX_DIM, quality: JPEG_QUALITY };
}

// getQuotaLevel: () => "ok" | "warn" | "err". Вызывается в момент загрузки,
// а не на каждый рендер — подсчёт размера проекта дорогой.
export function FileDrop({ onFiles, hint, multiple = true, children, compress = true, getQuotaLevel }) {
  const { t, tn } = useT();
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  const openPicker = () => inputRef.current?.click();

  const handle = async (files) => {
    if (!files || files.length === 0) { return; }
    setBusy(true);
    try {
      // выбираем профиль по текущему состоянию проекта (до добавления файлов)
      const profile = adaptiveProfile(compress && getQuotaLevel ? getQuotaLevel() : "ok");
      const items = await Promise.all(
        [...files].map(async (file) => {
          const raw = await readAsDataURL(file);
          const source = compress ? await compressImage(raw, profile.maxDim, profile.quality) : raw;
          return { name: file.name, src: source };
        })
      );
      onFiles(items);
    } catch (error) {
      pushToast({ tone: "err", msg: tn("drop.error", error.message || error) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={cn("drop", drag && "is-drag")}
      onClick={openPicker}
      onDragOver={(event) => { event.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(event) => { event.preventDefault(); setDrag(false); handle(event.dataTransfer.files); }}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openPicker(); }
      }}
    >
      <div className="drop__i" aria-hidden="true">{busy ? "…" : "↑"}</div>
      <div>{busy ? t("drop.busy") : (children || t("drop.default"))}</div>
      {hint ? <div className="field__hint drop__hint">{hint}</div> : null}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        hidden
        onChange={(event) => handle(event.target.files)}
      />
    </div>
  );
}
