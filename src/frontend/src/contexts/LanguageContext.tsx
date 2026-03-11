import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  type Lang,
  type TranslationKey,
  type Translations,
  getTranslations,
} from "../utils/translations";

const STORAGE_KEY = "pv_app_lang";

function getInitialLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "de" || stored === "en") return stored;
  } catch {}
  return "de";
}

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey) => string;
  tRaw: (key: TranslationKey) => Translations[TranslationKey];
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getInitialLang);

  const setLang = useCallback((newLang: Lang) => {
    setLangState(newLang);
    try {
      localStorage.setItem(STORAGE_KEY, newLang);
    } catch {}
  }, []);

  const translations = getTranslations(lang);

  const t = useCallback(
    (key: TranslationKey): string => {
      const val = translations[key];
      if (Array.isArray(val)) return val.join(", ");
      return String(val);
    },
    [translations],
  );

  const tRaw = useCallback(
    (key: TranslationKey): Translations[TranslationKey] => {
      return translations[key];
    },
    [translations],
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, tRaw }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
