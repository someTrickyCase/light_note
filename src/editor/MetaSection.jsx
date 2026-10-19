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
          <Input value={p.meta.showName} onChange={(event) => set({ showName: event.target.value })} placeholder={t("meta.showName.ph")} />
        </Field>
        <Field label={t("meta.venue")}>
          <Input value={p.meta.venue} onChange={(event) => set({ venue: event.target.value })} placeholder={t("meta.venue.ph")} />
        </Field>
        <div className="editor__row">
          <Field label={t("meta.date")}>
            <Input type="date" value={p.meta.date} onChange={(event) => set({ date: event.target.value })} />
          </Field>
          <Field label={t("meta.ld")}>
            <Input value={p.meta.ld} onChange={(event) => set({ ld: event.target.value })} placeholder={t("meta.ld.ph")} />
          </Field>
        </div>
        <div className="editor__row">
          <Field label={t("meta.director")}>
            <Input value={p.meta.director} onChange={(event) => set({ director: event.target.value })} placeholder={t("meta.director.ph")} />
          </Field>
          <Field label={t("meta.console")}>
            <Input value={p.meta.console} onChange={(event) => set({ console: event.target.value })} placeholder={t("meta.console.ph")} />
          </Field>
        </div>
        <Field label={t("meta.logo")} hint={t("meta.logo.help")}>
          {p.meta.logo ? (
            <div className="logo-preview">
              <img className="logo-preview__img" src={p.meta.logo} alt="" />
              <label className="btn btn--ghost btn--sm">
                {t("common.replace")}
                <input
                  type="file" accept="image/*" hidden
                  onChange={async (event) => {
                    const file = event.target.files[0];
                    if (!file) { return; }
                    set({ logo: await readAsDataURL(file) });
                  }}
                />
              </label>
              <Button size="sm" variant="danger" onClick={() => set({ logo: null })}>
                {t("common.delete")}
              </Button>
            </div>
          ) : (
            <FileDrop
              onFiles={(items) => { if (items[0]) { set({ logo: items[0].src }); } }}
              multiple={false} hint={t("meta.logo.help")}
            >
              {t("meta.logo.upload")}
            </FileDrop>
          )}
        </Field>
      </div>
    </div>
  );
}
