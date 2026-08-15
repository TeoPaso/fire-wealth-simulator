'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, Language } from './translations';

type TranslationsObject = typeof translations.en;

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (keyPath: string, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [lang, setLang] = useState<Language>('it');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = window.localStorage.getItem('fire_app_language');
    if (stored === 'it' || stored === 'en') {
      setLang(stored as Language);
    } else {
      // Auto-detect based on browser
      const browserLang = window.navigator.language.slice(0, 2);
      if (browserLang === 'it') {
        setLang('it');
      } else {
        setLang('en'); // Default to English for non-Italian
      }
    }
  }, []);

  const handleSetLang = (newLang: Language) => {
    setLang(newLang);
    window.localStorage.setItem('fire_app_language', newLang);
  };

  const t = (keyPath: string, fallback?: string): string => {
    const keys = keyPath.split('.');
    let current: any = translations[lang];
    
    for (const key of keys) {
      if (!current || current[key] === undefined) {
        return fallback || keyPath;
      }
      current = current[key];
    }
    
    return typeof current === 'string' ? current : (fallback || keyPath);
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang: handleSetLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
