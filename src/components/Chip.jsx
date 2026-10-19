import { cn } from "./cn.js";

// Интерактивный чип — настоящий <button> (фокус, Enter/Space из коробки),
// статичный — <span>.
export function Chip({ active, disabled, onClick, children, className, ...rest }) {
  const classes = cn("chip", active && "is-on", disabled && "is-disabled", className);
  if (!onClick) {
    return <span className={classes} {...rest}>{children}</span>;
  }
  return (
    <button type="button" className={classes} onClick={onClick} disabled={disabled} aria-pressed={Boolean(active)} {...rest}>
      {children}
    </button>
  );
}
