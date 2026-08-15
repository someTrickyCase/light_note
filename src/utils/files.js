// =====================================================================
// UTILS · РАБОТА С ФАЙЛАМИ
// =====================================================================

export function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

// Сжимает изображение через Canvas: ресайз по длинной стороне до MAX_DIM,
// конвертация в JPEG (прозрачные PNG → белый фон).
// Типичное сжатие: 5-10x по сравнению с оригиналом.
export const MAX_DIM = 1920;
export const JPEG_QUALITY = 0.82;

export function compressImage(dataURL, maxDim = MAX_DIM, quality = JPEG_QUALITY) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (Math.max(width, height) > maxDim) {
        const k = maxDim / Math.max(width, height);
        width = Math.round(width * k);
        height = Math.round(height * k);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      // белый фон — на случай PNG с альфой
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      try {
        resolve(canvas.toDataURL("image/jpeg", quality));
      } catch (e) {
        console.warn("compress: toDataURL failed, using original", e);
        resolve(dataURL);
      }
    };
    img.onerror = (e) => reject(e);
    img.src = dataURL;
  });
}

// HTML-escape (общий)
export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}
