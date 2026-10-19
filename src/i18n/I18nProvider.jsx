import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { makeTranslator } from "./translate.js";

const STORAGE_KEY = "tld.locale.v1";

const I18nContext = createContext({
  locale: "ru",
  setLocale: () => {},
  ...makeTranslator("ru"),
});

function readSavedLocale() {
  try {
    return localStorage.getItem(STORAGE_KEY) || "ru";
  } catch {
    return "ru"; // localStorage недоступен (приватный режим, file:// в некоторых браузерах)
  }
}

export function I18nProvider({ children, initialLocale }) {
  const [locale, setLocale] = useState(() => initialLocale || readSavedLocale());

  useEffect(() => {
    if (initialLocale) { return; } // при initialLocale (экспорт) не пишем в storage
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      // не удалось сохранить локаль — не критично, останется до перезагрузки
    }
  }, [locale, initialLocale]);

  const value = useMemo(() => ({ locale, setLocale, ...makeTranslator(locale) }), [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useT = () => useContext(I18nContext);
