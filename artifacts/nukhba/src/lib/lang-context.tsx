import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { translations, type Lang, type Translations } from "./translations";

type LangContextType = {
  lang: Lang;
  toggle: () => void;
  tr: Translations;
  isRTL: boolean;
};

const LangContext = createContext<LangContextType>({
  lang: "ar",
  toggle: () => {},
  tr: translations.ar,
  isRTL: true,
});

function getInitialLang(): Lang {
  try {
    const stored = localStorage.getItem("nukhba-lang");
    if (stored === "ar" || stored === "en") return stored;
  } catch {}
  return "ar";
}

function applyLangToDocument(lang: Lang) {
  const root = document.documentElement;
  root.setAttribute("lang", lang);
  root.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(getInitialLang);

  useEffect(() => {
    applyLangToDocument(lang);
    try {
      localStorage.setItem("nukhba-lang", lang);
    } catch {}
  }, [lang]);

  const toggle = () => setLang((l) => (l === "ar" ? "en" : "ar"));

  return (
    <LangContext.Provider
      value={{ lang, toggle, tr: translations[lang], isRTL: lang === "ar" }}
    >
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
