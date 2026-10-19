import { useSyncExternalStore } from "react";
import { useT } from "../i18n/I18nProvider.jsx";
import { Toast } from "./Toast.jsx";
import { dismissToast, getToastQueue, subscribeToToasts } from "../utils/toast.js";

export function Toaster() {
  const { t } = useT();
  const items = useSyncExternalStore(subscribeToToasts, getToastQueue);
  if (items.length === 0) { return null; }
  return (
    <div className="toaster" aria-live="polite">
      {items.map((item) => (
        <div key={item.id} className="toaster__item">
          <Toast tone={item.tone}>
            <div className="toaster__row">
              <div className="toaster__msg">{item.msg}</div>
              <button
                type="button"
                className="toaster__close"
                onClick={() => dismissToast(item.id)}
                aria-label={t("common.close")}
              >✕</button>
            </div>
          </Toast>
        </div>
      ))}
    </div>
  );
}
