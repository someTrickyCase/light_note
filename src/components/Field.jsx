import { cn } from "./cn.js";

export function Field({ label, hint, error, children, className }) {
  return (
    <label className={cn("field", error && "field--err", className)}>
      {label && <span className="field__label">{label}</span>}
      {children}
      {error ? <span className="field__err">{error}</span>
              : hint && <span className="field__hint">{hint}</span>}
    </label>
  );
}

export function Input({ className, mono, selectOnFocus = true, ...rest }) {
  return (
    <input
      className={cn("input", mono && "input--mono", className)}
      onFocus={selectOnFocus ? (e) => e.target.select() : undefined}
      {...rest}
    />
  );
}

const Textarea = ({ className, mono, selectOnFocus = true, ...rest }) => (
  <textarea
    className={cn("textarea", mono && "textarea--mono", className)}
    onFocus={selectOnFocus ? (e) => e.target.select() : undefined}
    {...rest}
  />
);
export { Textarea };

export function Select({ children, className, ...rest }) {
  return <select className={cn("select", className)} {...rest}>{children}</select>;
}
