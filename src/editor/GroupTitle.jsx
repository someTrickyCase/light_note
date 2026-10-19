export function GroupTitle({ num, children }) {
  return (
    <div className="editor__title">
      {num === undefined ? null : <span className="num">{num}</span>}
      <span>{children}</span>
    </div>
  );
}
