import { useRef, useState } from "react";
import { cn } from "./cn.js";
import { useT } from "../i18n/I18nProvider.jsx";
import { measureImage, readAsDataURL } from "../utils/files.js";
import { pushToast } from "../utils/toast.js";

// onFiles([{ name, src, width, height }]) — файлы как есть (без сжатия), с размером в пикселях
export function FileDrop({ onFiles, hint, multiple = true, children }) {
  const { t, tn } = useT();
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  const openPicker = () => inputRef.current?.click();

  const handle = async (files) => {
    if (!files || files.length === 0) { return; }
    setBusy(true);
    try {
      const items = await Promise.all(
        [...files].map(async (file) => {
          const source = await readAsDataURL(file);
          const { width, height } = await measureImage(source);
          return { name: file.name, src: source, width, height };
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
