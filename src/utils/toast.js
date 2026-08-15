// =====================================================================
// UTILS · ГЛОБАЛЬНЫЙ TOASTER
// Простая очередь уведомлений. pushToast({tone, msg, ttl}) доступен
// откуда угодно (включая storage.save catch, FileDrop onError, exportDocument).
// =====================================================================

let _toastQueue = [];
const _toastListeners = new Set();

export function pushToast({ tone = "info", msg, ttl = 5000 }) {
  const id = "t-" + Math.random().toString(36).slice(2, 8);
  _toastQueue.push({ id, tone, msg, ttl });
  _toastListeners.forEach((fn) => fn());
  if (ttl > 0) setTimeout(() => dismissToast(id), ttl);
  return id;
}

export function dismissToast(id) {
  _toastQueue = _toastQueue.filter((t) => t.id !== id);
  _toastListeners.forEach((fn) => fn());
}

export function subscribeToToasts(fn) {
  _toastListeners.add(fn);
  return () => _toastListeners.delete(fn);
}

export function getToastQueue() {
  return _toastQueue;
}
