import { cn } from "./cn.js";

export function Toast({ tone = "info", children }) {
  const icon = tone === "ok" ? "✓" : tone === "err" ? "!" : tone === "warn" ? "!" : "i";
  return (
    <div className={cn("toast", `toast--${tone}`)} role="status">
      <span className="toast__i">{icon}</span>
      <div>{children}</div>
    </div>
  );
}
