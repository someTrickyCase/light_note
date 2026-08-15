import { cn } from "./cn.js";

export function Badge({ tone = "neutral", dot, children, className }) {
  return (
    <span className={cn("bdg", `bdg--${tone}`, className)}>
      {dot && <span className="bdg__dot" aria-hidden="true" />}
      {children}
    </span>
  );
}
