// =====================================================================
// COMPONENT · КНОПКА С ПОДТВЕРЖДЕНИЕМ (ВМЕСТО window.confirm)
// =====================================================================
// Первый клик «взводит» кнопку и меняет подпись на confirmLabel,
// второй клик в течение ARM_MS выполняет onConfirm. Без модалки,
// не блокирует страницу, работает с клавиатуры как обычная кнопка.

import { useEffect, useState } from "react";
import { Button } from "./Button.jsx";

const ARM_MS = 3000;

export function ConfirmButton({ onConfirm, confirmLabel, children, ...rest }) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    const timer = armed ? setTimeout(() => setArmed(false), ARM_MS) : null;
    return () => clearTimeout(timer);
  }, [armed]);

  const onClick = () => {
    if (armed) {
      setArmed(false);
      onConfirm();
    } else {
      setArmed(true);
    }
  };

  return (
    <Button {...rest} variant={armed ? "danger" : rest.variant} onClick={onClick} aria-live="polite">
      {armed ? confirmLabel : children}
    </Button>
  );
}
