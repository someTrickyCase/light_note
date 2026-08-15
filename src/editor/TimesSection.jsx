import { useT } from "../i18n/I18nProvider.jsx";
import { useDispatch, useProject } from "../state/ProjectProvider.jsx";
import { Field, Input } from "../components/Field.jsx";
import { GroupTitle } from "./GroupTitle.jsx";

export function TimesSection() {
  const { t } = useT();
  const p = useProject();
  const d = useDispatch();
  const set = (patch) => d({ type: "TIMES", patch });

  return (
    <div className="editor__group">
      <GroupTitle num="2">{t("editor.times")}</GroupTitle>
      <div className="editor__stack">
        <Field label={t("times.setup")} hint={t("times.setup.note")}>
          <Input value={p.times.setup} onChange={(e) => set({ setup: e.target.value })} placeholder={t("times.setup.ph")} />
        </Field>
        <Field label={t("times.runtime")}>
          <Input value={p.times.runtime} onChange={(e) => set({ runtime: e.target.value })} placeholder={t("times.runtime.ph")} />
        </Field>
        <Field label={t("times.staff")}>
          <Input value={p.times.staff} onChange={(e) => set({ staff: e.target.value })} placeholder={t("times.staff.ph")} />
        </Field>
      </div>
    </div>
  );
}
