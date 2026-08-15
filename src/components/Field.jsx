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

export function Input({ className, mono, ...rest }) {
  return <input className={cn("input", mono && "input--mono", className)} {...rest} />;
}

const Textarea = ({ className, mono, ...rest }) => (
  <textarea className={cn("textarea", mono && "textarea--mono", className)} {...rest} />
);
export { Textarea };

export function Select({ children, className, ...rest }) {
  return <select className={cn("select", className)} {...rest}>{children}</select>;
}
