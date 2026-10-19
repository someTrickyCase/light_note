// =====================================================================
// UTILS · РАБОТА С ФАЙЛАМИ
// =====================================================================

export function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(file);
  });
}

// Размер картинки в пикселях: { width, height }. Картинка НЕ меняется —
// сжатия нет, файл хранится как есть. Размер нужен мозаике галереи
// (соотношение сторон) и заодно проверяет, что браузер умеет её показать.
export function measureImage(dataURL) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve({ width: img.naturalWidth, height: img.naturalHeight }));
    // браузер отдаёт Event без текста — превращаем в Error, чтобы тост показал причину
    img.addEventListener("error", () => reject(new Error("image decode failed")));
    img.src = dataURL;
  });
}

// HTML-escape (общий)
export function escapeHtml(s) {
  return String(s).replaceAll(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}
