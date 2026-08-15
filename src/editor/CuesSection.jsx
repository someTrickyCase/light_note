import { useRef } from "react";
import { useT } from "../i18n/I18nProvider.jsx";
import { useDispatch, useProject } from "../state/ProjectProvider.jsx";
import { Button, IconButton } from "../components/Button.jsx";
import { Input } from "../components/Field.jsx";
import { Toast } from "../components/Toast.jsx";
import { GroupTitle } from "./GroupTitle.jsx";
import { parseMA2 } from "../utils/ma2.js";

export function CuesSection() {
  const { t } = useT();
  const p = useProject();
  const d = useDispatch();
  const fileRef = useRef(null);

  const onImport = async (file) => {
    if (!file) return;
    const text = await file.text();
    const { cues, warnings, foundInfoTag } = parseMA2(text);
    if (cues.length === 0) {
      window.alert("Не удалось извлечь сцены из XML.\n\n" + warnings.join("\n"));
      return;
    }
    d({ type: "CUES_REPLACE", cues });
    const note = foundInfoTag
      ? `Импортировано ${cues.length} сцен. Тег info: <${foundInfoTag}>.`
      : `Импортировано ${cues.length} сцен. Поле info пустое — тег <CueInfo> не найден, проверь XML.`;
    window.alert(note + (warnings.length ? "\n\nПредупреждения:\n" + warnings.join("\n") : ""));
  };

  return (
    <div className="editor__group">
      <GroupTitle num="6">{t("editor.cues")}</GroupTitle>
      <div className="editor__stack">
        {p.cues.length === 0 ? (
          <Toast tone="info">{t("cues.empty")}</Toast>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl tbl--compact">
              <thead>
                <tr>
                  <th style={{ width: 56 }}>{t("cues.col.num")}</th>
                  <th>{t("cues.col.name")}</th>
                  <th>{t("cues.col.info")}</th>
                  <th style={{ width: 120 }}>{t("cues.col.trigger")}</th>
                  <th style={{ width: 36 }}></th>
                </tr>
              </thead>
              <tbody>
                {p.cues.map((c) => (
                  <tr key={c.id}>
                    <td><Input value={String(c.num)} onChange={(e) => d({ type: "CUE_UPDATE", id: c.id, patch: { num: e.target.value } })} /></td>
                    <td><Input value={c.name} onChange={(e) => d({ type: "CUE_UPDATE", id: c.id, patch: { name: e.target.value } })} /></td>
                    <td><Input value={c.info} onChange={(e) => d({ type: "CUE_UPDATE", id: c.id, patch: { info: e.target.value } })} /></td>
                    <td><Input value={c.trigger} onChange={(e) => d({ type: "CUE_UPDATE", id: c.id, patch: { trigger: e.target.value } })} /></td>
                    <td><IconButton label={t("common.delete")} onClick={() => d({ type: "CUE_DELETE", id: c.id })}>✕</IconButton></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button variant="ghost" onClick={() => d({ type: "CUE_ADD" })}>+ {t("cues.add")}</Button>
          <Button variant="ghost" onClick={() => fileRef.current && fileRef.current.click()}>
            Импорт MA2 XML
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".xml,text/xml"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files[0];
              if (f) onImport(f);
              e.target.value = ""; // сброс чтобы можно было выбрать тот же файл
            }}
          />
        </div>
      </div>
    </div>
  );
}
