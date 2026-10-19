import { useT } from "../i18n/I18nProvider.jsx";
import { useDispatch, useProject } from "../state/ProjectProvider.jsx";
import { Badge } from "../components/Badge.jsx";
import { IconButton } from "../components/Button.jsx";
import { ConfirmButton } from "../components/ConfirmButton.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { FileDrop } from "../components/FileDrop.jsx";
import { Input } from "../components/Field.jsx";
import { GroupTitle } from "./GroupTitle.jsx";

function PhotoCard({ photo, previous, next }) {
  const { t } = useT();
  const d = useDispatch();
  const patch = (fields) => d({ type: "PHOTO_UPDATE", id: photo.id, patch: fields });
  const moveBefore = (other) => d({ type: "PHOTO_REORDER", fromId: photo.id, toId: other.id });
  return (
    <div className="photo-card">
      <img className="photo-card__img" src={photo.src} alt="" />
      <div className="photo-card__body">
        <div className="photo-card__field">
          <Input
            value={photo.tag} placeholder={t("gallery.tag.ph")}
            onChange={(event) => patch({ tag: event.target.value })}
          />
        </div>
        <div className="photo-card__field">
          <Input
            value={photo.caption} placeholder={t("gallery.caption.ph")}
            onChange={(event) => patch({ caption: event.target.value })}
          />
        </div>
        <div className="photo-card__actions">
          <IconButton label={t("common.moveUp")} onClick={() => { if (previous) { moveBefore(previous); } }}>↑</IconButton>
          <IconButton label={t("common.moveDown")} onClick={() => { if (next) { moveBefore(next); } }}>↓</IconButton>
          <IconButton label={t("common.delete")} onClick={() => d({ type: "PHOTO_DELETE", id: photo.id })}>✕</IconButton>
        </div>
      </div>
    </div>
  );
}

export function GallerySection() {
  const { t, tn } = useT();
  const p = useProject();
  const d = useDispatch();
  const onFiles = (items) => d({ type: "PHOTOS_ADD", items });
  const hasPhotos = p.photos.length > 0;

  return (
    <div className="editor__group">
      <GroupTitle num="4">
        {t("editor.gallery")}
        {hasPhotos ? (
          <Badge tone="neutral" className="editor__title-badge">{tn("gallery.count", p.photos.length)}</Badge>
        ) : null}
      </GroupTitle>
      <div className="editor__stack">
        <FileDrop onFiles={onFiles} hint={t("gallery.drop.help")}>
          {t("gallery.drop")}
        </FileDrop>
        {hasPhotos ? (
          <div className="editor__actions editor__actions--end">
            <ConfirmButton
              variant="ghost"
              size="sm"
              title={t("gallery.confirmClear")}
              confirmLabel={t("gallery.clearAll.confirm")}
              onConfirm={() => d({ type: "PHOTOS_CLEAR" })}
            >
              ✕ {t("gallery.clearAll")}
            </ConfirmButton>
          </div>
        ) : (
          <EmptyState glyph="▤" title={t("gallery.empty")} />
        )}
        {hasPhotos ? (
          <div className="photo-list">
            {p.photos.map((photo, index) => (
              <PhotoCard key={photo.id} photo={photo} previous={p.photos[index - 1]} next={p.photos[index + 1]} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
