import { useRef, useState } from "react";
import { cn } from "./cn.js";
import { compressImage, readAsDataURL, JPEG_QUALITY, MAX_DIM } from "../utils/files.js";
import { projectSize, quotaLevel, WARN_RATIO, ERR_RATIO } from "../utils/storageQuota.js";
import { pushToast } from "../utils/toast.js";
import { useProject } from "../state/ProjectProvider.jsx";

// Подбираем JPEG-качество и MAX_DIM в зависимости от текущего уровня занятости.
// Чем ближе к лимиту — тем сильнее сжимаем следующие файлы.
function adaptiveProfile(level) {
  if (level === "err") return { maxDim: 1280, quality: 0.55 };
  if (level === "warn") return { maxDim: 1600, quality: 0.7 };
  return { maxDim: MAX_DIM, quality: JPEG_QUALITY };
}

export function FileDrop({ onFiles, hint, multiple = true, children, compress = true }) {
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);
  const p = useProject();

  const handle = async (files) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      // выбираем профиль по текущему состоянию проекта (до добавления файлов)
      const lvl = p ? quotaLevel(projectSize(p)) : "ok";
      const profile = compress ? adaptiveProfile(lvl) : { maxDim: MAX_DIM, quality: JPEG_QUALITY };

      const items = await Promise.all(
        Array.from(files).map(async (f) => {
          const raw = await readAsDataURL(f);
          const src = compress ? await compressImage(raw, profile.maxDim, profile.quality) : raw;
          return { name: f.name, src };
        })
      );
      onFiles(items);
    } catch (e) {
      pushToast({ tone: "err", msg: "Не удалось обработать файл: " + (e.message || e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={cn("drop", drag && "is-drag")}
      onClick={() => inputRef.current && inputRef.current.click()}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files); }}
      role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") inputRef.current && inputRef.current.click(); }}
    >
      <div className="drop__i" aria-hidden="true">{busy ? "…" : "↑"}</div>
      <div>{busy ? "Обработка…" : (children || "Перетащите файлы сюда или нажмите для выбора")}</div>
      {hint && <div className="field__hint" style={{ marginTop: 4 }}>{hint}</div>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        style={{ display: "none" }}
        onChange={(e) => handle(e.target.files)}
      />
    </div>
  );
}
