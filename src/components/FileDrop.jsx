import { useRef, useState } from "react";
import { cn } from "./cn.js";
import { compressImage, readAsDataURL } from "../utils/files.js";
import { pushToast } from "../utils/toast.js";

export function FileDrop({ onFiles, hint, multiple = true, children, compress = true }) {
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  const handle = async (files) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      const items = await Promise.all(
        Array.from(files).map(async (f) => {
          const raw = await readAsDataURL(f);
          const src = compress ? await compressImage(raw) : raw;
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
