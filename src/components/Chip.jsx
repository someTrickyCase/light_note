import { cn } from "./cn.js";

export function Chip({ active, disabled, onClick, children, className, ...rest }) {
  const interactive = Boolean(onClick);
  return (
    <span
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={interactive ? (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(e); }
      } : undefined}
      className={cn("chip", active && "is-on", disabled && "is-disabled", className)}
      {...rest}
    >
      {children}
    </span>
  );
}
