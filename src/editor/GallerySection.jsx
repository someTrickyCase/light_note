import { useT } from "../i18n/I18nProvider.jsx";
import { useDispatch, useProject } from "../state/ProjectProvider.jsx";
import { Badge } from "../components/Badge.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { FileDrop } from "../components/FileDrop.jsx";
import { IconButton } from "../components/Button.jsx";
import { Input } from "../components/Field.jsx";
import { GroupTitle } from "./GroupTitle.jsx";

export function GallerySection() {
  const { t, tn } = useT();
  const p = useProject();
  const d = useDispatch();
  const onFiles = (items) => d({ type: "PHOTOS_ADD", items });

  return (
    <div className="editor__group">
      <GroupTitle num="4">
        {t("editor.gallery")}
        {p.photos.length > 0 && (
          <Badge tone="neutral" style={{ marginLeft: 8 }}>{tn("gallery.count", p.photos.length)}</Badge>
        )}
      </GroupTitle>
      <div className="editor__stack">
        <FileDrop onFiles={onFiles} hint={t("gallery.drop.help")}>
          {t("gallery.drop")}
        </FileDrop>
        {p.photos.length === 0 ? (
          <EmptyState glyph="▤" title={t("gallery.empty")} />
        ) : (
          <div className="photo-list">
            {p.photos.map((ph, idx) => (
              <div key={ph.id} className="photo-card">
                <img className="photo-card__img" src={ph.src} alt="" />
                <div className="photo-card__body">
                  <div className="photo-card__field">
                    <Input
                      value={ph.tag} placeholder={t("gallery.tag.ph")}
                      onChange={(e) => d({ type: "PHOTO_UPDATE", id: ph.id, patch: { tag: e.target.value } })}
                    />
                  </div>
                  <div className="photo-card__field">
                    <Input
                      value={ph.caption} placeholder={t("gallery.caption.ph")}
                      onChange={(e) => d({ type: "PHOTO_UPDATE", id: ph.id, patch: { caption: e.target.value } })}
                    />
                  </div>
                  <div className="photo-card__actions">
                    <IconButton
                      label={t("common.moveUp")}
                      onClick={() => {
                        const prev = p.photos[idx - 1];
                        if (prev) d({ type: "PHOTO_REORDER", fromId: ph.id, toId: prev.id });
                      }}
                    >↑</IconButton>
                    <IconButton
                      label={t("common.moveDown")}
                      onClick={() => {
                        const next = p.photos[idx + 1];
                        if (next) d({ type: "PHOTO_REORDER", fromId: ph.id, toId: next.id });
                      }}
                    >↓</IconButton>
                    <IconButton
                      label={t("common.delete")}
                      onClick={() => d({ type: "PHOTO_DELETE", id: ph.id })}
                    >✕</IconButton>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
