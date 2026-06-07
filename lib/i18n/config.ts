export const locales = ["en", "uk"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const localeNames: Record<Locale, string> = {
  en: "English",
  uk: "Українська",
};

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export function getLocaleCode(locale: Locale): string {
  return locale === "uk" ? "uk-UA" : "en-US";
}
