"use client";

import { createContext, useContext, type ReactNode } from "react";
import type en from "./dictionaries/en.json";
import type { Locale } from "./config";

export type Dictionary = typeof en;

type DictionaryContextValue = {
  dictionary: Dictionary;
  locale: Locale;
};

const DictionaryContext = createContext<DictionaryContextValue | null>(null);

type DictionaryProviderProps = {
  dictionary: Dictionary;
  locale: Locale;
  children: ReactNode;
};

export function DictionaryProvider({
  dictionary,
  locale,
  children,
}: DictionaryProviderProps) {
  return (
    <DictionaryContext.Provider value={{ dictionary, locale }}>
      {children}
    </DictionaryContext.Provider>
  );
}

export function useDictionary(): Dictionary {
  const context = useContext(DictionaryContext);
  if (!context) {
    throw new Error("useDictionary must be used within DictionaryProvider");
  }
  return context.dictionary;
}

export function useLocale(): Locale {
  const context = useContext(DictionaryContext);
  if (!context) {
    throw new Error("useLocale must be used within DictionaryProvider");
  }
  return context.locale;
}
