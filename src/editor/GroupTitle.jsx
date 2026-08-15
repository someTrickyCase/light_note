export function GroupTitle({ num, children }) {
  return (
    <div className="editor__title">
      {num != null && <span className="num">{num}</span>}
      <span>{children}</span>
    </div>
  );
}
