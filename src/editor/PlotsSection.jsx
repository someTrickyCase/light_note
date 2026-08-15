import { useT } from "../i18n/I18nProvider.jsx";
import { useDispatch, useProject } from "../state/ProjectProvider.jsx";
import { Button } from "../components/Button.jsx";
import { FileDrop } from "../components/FileDrop.jsx";
import { readAsDataURL } from "../utils/files.js";

function PlotUploader({ which, label, help }) {
  const p = useProject();
  const d = useDispatch();
  const src = p.plots[which];
  return (
    <div>
      <div className="editor__title" style={{ marginBottom: 8 }}>{label}</div>
      {src ? (
        <div className="doc__plot" style={{ marginBottom: 8 }}>
          <img src={src} alt={label} />
          <div className="doc__plot-cap">{label}</div>
        </div>
      ) : (
        <div style={{ marginBottom: 8 }}>
          <FileDrop onFiles={(items) => { if (items[0]) d({ type: "PLOT_SET", which, dataURL: items[0].src }); }} multiple={false} hint={help} />
        </div>
      )}
      {src && (
        <div style={{ display: "flex", gap: 8 }}>
          <label className="btn btn--ghost btn--sm">
            Заменить
            <input
              type="file" accept="image/*" style={{ display: "none" }}
              onChange={async (e) => {
                const f = e.target.files[0];
                if (!f) return;
                d({ type: "PLOT_SET", which, dataURL: await readAsDataURL(f) });
              }}
            />
          </label>
          <Button size="sm" variant="danger" onClick={() => d({ type: "PLOT_CLEAR", which })}>
            Удалить
          </Button>
        </div>
      )}
    </div>
  );
}

export function PlotsSection() {
  const { t } = useT();
  // Без GroupTitle: подсекции "Базовый развес площадки" / "Развес спектакля"
  // уже дают понятные лейблы, дополнительный общий заголовок дублирует.
  return (
    <div className="editor__group">
      <div className="editor__stack">
        <PlotUploader which="base" label={t("plots.base")} help={t("plots.base.help")} />
        <PlotUploader which="show" label={t("plots.show")} help={t("plots.show.help")} />
      </div>
    </div>
  );
}
