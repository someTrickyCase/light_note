import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles/index.css";
import { applySaved } from "./utils/appearance.js";

// Сохраняем CSS-токены и базовые стили в window, чтобы exportDocument
// мог их вставить в автономный HTML-файл. Снимем ровно один раз —
// стили статические и не меняются во время работы приложения.
//
// Сохраняем CSS в window, чтобы exportDocument мог вставить его в
// автономный HTML. Читаем из <style> тегов (CSS инлайнится в build).
// В dev Vite может инжектить через <style data-vite-dev-id> —
// querySelectorAll("style") подхватит всё.
const cssText = [...document.querySelectorAll("style")]
  .map((s) => s.textContent || "")
  .join("\n");
globalThis.__INJECTED_CSS__ = cssText;

// обычно оформление уже поставил скрипт в <head> index.html; здесь — на всякий случай
applySaved();

createRoot(document.querySelector("#root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
