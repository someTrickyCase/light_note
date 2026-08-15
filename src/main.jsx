import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles/index.css";

// Сохраняем CSS-токены и базовые стили в window, чтобы exportDocument
// мог их вставить в автономный HTML-файл. Снимем ровно один раз —
// стили статические и не меняются во время работы приложения.
//
// Сохраняем CSS в window, чтобы exportDocument мог вставить его в
// автономный HTML. Читаем из <style> тегов (CSS инлайнится в build).
// В dev Vite может инжектить через <style data-vite-dev-id> —
// querySelectorAll("style") подхватит всё.
const cssText = Array.from(document.querySelectorAll("style"))
  .map((s) => s.textContent || "")
  .join("\n");
window.__INJECTED_CSS__ = cssText;

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
