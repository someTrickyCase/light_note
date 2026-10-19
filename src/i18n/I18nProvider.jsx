import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { makeTranslator } from "./translate.js";
import { SUPPORTED_LOCALES } from "./dict.js";

const STORAGE_KEY = "tld.locale.v1";
export const DEFAULT_LOCALE = SUPPORTED_LOCALES[0];

const I18nContext = createContext({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  ...makeTranslator(DEFAULT_LOCALE),
});

export function readSavedLocale() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return SUPPORTED_LOCALES.includes(saved) ? saved : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE; // localStorage недоступен (приватный режим, file:// в некоторых браузерах)
  }
}

// initialLocale — для экспорта: язык задан снаружи, страницу и storage не трогаем
export function I18nProvider({ children, initialLocale }) {
  const [locale, setLocale] = useState(() => initialLocale || readSavedLocale());

  useEffect(() => {
    if (initialLocale) { return; }
    // язык страницы: экранные дикторы, переносы, проверка орфографии
    document.documentElement.lang = locale;
    document.title = makeTranslator(locale).t("app.title");
  }, [locale, initialLocale]);

  const value = useMemo(() => {
    // пишем только при выборе: кто не выбирал, следует умолчанию
    const choose = (next) => {
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // не удалось сохранить — выбор останется до перезагрузки
      }
      setLocale(next);
    };
    return { locale, setLocale: choose, ...makeTranslator(locale) };
  }, [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useT = () => useContext(I18nContext);
