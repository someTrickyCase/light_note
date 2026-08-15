import { useT } from "../i18n/I18nProvider.jsx";
import { useDispatch, useProject } from "../state/ProjectProvider.jsx";
import { Button } from "../components/Button.jsx";
import { Field, Input } from "../components/Field.jsx";
import { FileDrop } from "../components/FileDrop.jsx";
import { GroupTitle } from "./GroupTitle.jsx";
import { readAsDataURL } from "../utils/files.js";

export function MetaSection() {
  const { t } = useT();
  const p = useProject();
  const d = useDispatch();
  const set = (patch) => d({ type: "META", patch });

  return (
    <div className="editor__group">
      <GroupTitle num="1">{t("editor.meta")}</GroupTitle>
      <div className="editor__stack">
        <Field label={t("meta.showName")}>
          <Input value={p.meta.showName} onChange={(e) => set({ showName: e.target.value })} placeholder={t("meta.showName.ph")} />
        </Field>
        <Field label={t("meta.venue")}>
          <Input value={p.meta.venue} onChange={(e) => set({ venue: e.target.value })} placeholder={t("meta.venue.ph")} />
        </Field>
        <div className="editor__row">
          <Field label={t("meta.date")}>
            <Input type="date" value={p.meta.date} onChange={(e) => set({ date: e.target.value })} />
          </Field>
          <Field label={t("meta.ld")}>
            <Input value={p.meta.ld} onChange={(e) => set({ ld: e.target.value })} placeholder={t("meta.ld.ph")} />
          </Field>
        </div>
        <div className="editor__row">
          <Field label={t("meta.director")}>
            <Input value={p.meta.director} onChange={(e) => set({ director: e.target.value })} placeholder={t("meta.director.ph")} />
          </Field>
          <Field label={t("meta.console")}>
            <Input value={p.meta.console} onChange={(e) => set({ console: e.target.value })} placeholder={t("meta.console.ph")} />
          </Field>
        </div>
        <Field label={t("meta.logo")} hint={t("meta.logo.help")}>
          {p.meta.logo ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <img
                src={p.meta.logo} alt=""
                style={{
                  maxHeight: 40, maxWidth: 180, objectFit: "contain",
                  background: "#fff", padding: 4,
                  border: "1px solid var(--c-line)", borderRadius: 6,
                }}
              />
              <label className="btn btn--ghost btn--sm">
                Заменить
                <input
                  type="file" accept="image/*" style={{ display: "none" }}
                  onChange={async (e) => {
                    const f = e.target.files[0];
                    if (!f) return;
                    set({ logo: await readAsDataURL(f) });
                  }}
                />
              </label>
              <Button size="sm" variant="danger" onClick={() => set({ logo: null })}>
                Удалить
              </Button>
            </div>
          ) : (
            <FileDrop
              onFiles={(items) => { if (items[0]) set({ logo: items[0].src }); }}
              multiple={false} hint={t("meta.logo.help")}
            >
              Загрузить логотип
            </FileDrop>
          )}
        </Field>
      </div>
    </div>
  );
}
