// Простой classnames-хелпер
export function cn(...parts) {
  return parts.filter(Boolean).join(" ");
}
