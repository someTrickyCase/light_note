import { useT } from "../i18n/I18nProvider.jsx";
import { useDispatch, useProject } from "../state/ProjectProvider.jsx";
import { Button, IconButton } from "../components/Button.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { Input } from "../components/Field.jsx";
import { GroupTitle } from "./GroupTitle.jsx";

export function FixturesSection() {
  const { t, tn } = useT();
  const p = useProject();
  const d = useDispatch();
  const total = p.fixtures.reduce((s, f) => s + (Number(f.qty) || 0), 0);

  return (
    <div className="editor__group">
      <GroupTitle num="5">
        {t("editor.fixtures")}
        {p.fixtures.length > 0 && (
          <span style={{ marginLeft: 8, color: "var(--c-soft)", fontFamily: "var(--ff-mono)", fontSize: 11 }}>
            {tn("fixtures.total", total)}
          </span>
        )}
      </GroupTitle>
      <div className="editor__stack">
        {p.fixtures.length === 0 ? (
          <EmptyState glyph="▣" title={t("fixtures.empty")} />
        ) : (
          p.fixtures.map((f) => (
            <div key={f.id} className="fix-row">
              <Input
                value={f.type} placeholder={t("fixtures.type.ph")}
                onChange={(e) => d({ type: "FIX_UPDATE", id: f.id, patch: { type: e.target.value } })}
              />
              <Input
                type="number" min="0" value={f.qty} placeholder={t("fixtures.qty.ph")}
                onChange={(e) => d({ type: "FIX_UPDATE", id: f.id, patch: { qty: e.target.value } })}
              />
              <IconButton label={t("common.delete")} onClick={() => d({ type: "FIX_DELETE", id: f.id })}>✕</IconButton>
            </div>
          ))
        )}
        <Button variant="ghost" onClick={() => d({ type: "FIX_ADD" })}>+ {t("fixtures.add")}</Button>
      </div>
    </div>
  );
}
