export function EmptyState({ glyph = "·", title, children, action }) {
  return (
    <div className="empty">
      <div className="empty__g">{glyph}</div>
      <div className="empty__t">{title}</div>
      {children && <p className="empty__p">{children}</p>}
      {action}
    </div>
  );
}
