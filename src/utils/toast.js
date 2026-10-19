// =====================================================================
// UTILS · ГЛОБАЛЬНЫЙ TOASTER
// Простая очередь уведомлений. pushToast({tone, msg, ttl}) доступен
// откуда угодно (включая ошибки storage, FileDrop onError).
// Очередь иммутабельна: каждое изменение — новый массив. Это нужно
// useSyncExternalStore в Toaster — он сравнивает снапшоты по ссылке.
// =====================================================================

let _toastQueue = [];
const _toastListeners = new Set();

function notify() {
  for (const listener of _toastListeners) { listener(); }
}

export function pushToast({ tone = "info", msg, ttl = 5000 }) {
  const id = `t-${Math.random().toString(36).slice(2, 8)}`;
  _toastQueue = [..._toastQueue, { id, tone, msg, ttl }];
  notify();
  if (ttl > 0) { setTimeout(() => dismissToast(id), ttl); }
  return id;
}

export function dismissToast(id) {
  _toastQueue = _toastQueue.filter((t) => t.id !== id);
  notify();
}

export function subscribeToToasts(listener) {
  _toastListeners.add(listener);
  return () => _toastListeners.delete(listener);
}

export function getToastQueue() {
  return _toastQueue;
}
