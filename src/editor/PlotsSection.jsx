import { useT } from "../i18n/I18nProvider.jsx";
import { useDispatch, useProject } from "../state/ProjectProvider.jsx";
import { Button } from "../components/Button.jsx";
import { FileDrop } from "../components/FileDrop.jsx";
import { readAsDataURL } from "../utils/files.js";

function PlotUploader({ which, label, help }) {
  const { t } = useT();
  const p = useProject();
  const d = useDispatch();
  const source = p.plots[which];
  return (
    <div className="plot-uploader">
      <div className="editor__title">{label}</div>
      {source ? (
        <div className="doc__plot">
          <img src={source} alt={label} />
          <div className="doc__plot-cap">{label}</div>
        </div>
      ) : (
        <FileDrop
          onFiles={(items) => { if (items[0]) { d({ type: "PLOT_SET", which, dataURL: items[0].src }); } }}
          multiple={false}
          hint={help}
        />
      )}
      {source ? (
        <div className="editor__actions">
          <label className="btn btn--ghost btn--sm">
            {t("plots.replace")}
            <input
              type="file" accept="image/*" hidden
              onChange={async (event) => {
                const file = event.target.files[0];
                if (!file) { return; }
                d({ type: "PLOT_SET", which, dataURL: await readAsDataURL(file) });
              }}
            />
          </label>
          <Button size="sm" variant="danger" onClick={() => d({ type: "PLOT_CLEAR", which })}>
            {t("plots.clear")}
          </Button>
        </div>
      ) : null}
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
