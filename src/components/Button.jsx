import { cn } from "./cn.js";

export function Button({ variant = "primary", size, block, icon, className, children, ...rest }) {
  return (
    <button
      type="button"
      className={cn(
        "btn",
        `btn--${variant}`,
        size === "sm" && "btn--sm",
        size === "icon" && "btn--icon",
        block && "btn--block",
        className
      )}
      {...rest}
    >
      {icon && <span aria-hidden="true">{icon}</span>}
      {children}
    </button>
  );
}

export function IconButton({ label, onClick, children, className, ...rest }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn("btn", "btn--ghost", "btn--icon", className)}
      {...rest}
    >
      {children}
    </button>
  );
}
