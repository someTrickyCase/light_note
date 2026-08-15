import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DICT } from "./dict.js";

const STORAGE_KEY = "tld.locale.v1";

const I18nContext = createContext({
  locale: "ru",
  setLocale: () => {},
  t: (key) => key,
  tn: (key, n) => key,
});

export function I18nProvider({ children, initialLocale }) {
  const [locale, setLocale] = useState(() => {
    if (initialLocale) return initialLocale;
    try { return localStorage.getItem(STORAGE_KEY) || "ru"; } catch { return "ru"; }
  });

  useEffect(() => {
    if (initialLocale) return; // при initialLocale (экспорт) не пишем в storage
    try { localStorage.setItem(STORAGE_KEY, locale); } catch {}
  }, [locale, initialLocale]);

  const t = useCallback((key) => {
    const dict = DICT[locale] || DICT.ru;
    // плоский словарь: ключи вида "doc.foot.left" — это просто строки
    const v = dict[key];
    return (v == null) ? key : v;
  }, [locale]);

  const tn = useCallback((key, n) => {
    const v = t(key);
    return typeof v === "function" ? v(n) : v;
  }, [t]);

  const value = useMemo(() => ({ locale, setLocale, t, tn }), [locale, t, tn]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useT = () => useContext(I18nContext);
