import { useEffect, useState } from "react";
import { Toast } from "./Toast.jsx";
import { dismissToast, getToastQueue, subscribeToToasts } from "../utils/toast.js";

export function Toaster() {
  const [, force] = useState(0);
  useEffect(() => {
    const unsub = subscribeToToasts(() => force((n) => n + 1));
    return unsub;
  }, []);
  const items = getToastQueue();
  if (items.length === 0) return null;
  return (
    <div className="toaster" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className="toaster__item">
          <Toast tone={t.tone}>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>{t.msg}</div>
              <button
                type="button"
                onClick={() => dismissToast(t.id)}
                style={{ background: "none", border: 0, color: "inherit", cursor: "pointer", padding: 0, fontSize: 14 }}
                aria-label="Закрыть"
              >✕</button>
            </div>
          </Toast>
        </div>
      ))}
    </div>
  );
}
