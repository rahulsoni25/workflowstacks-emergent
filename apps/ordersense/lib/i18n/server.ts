import { cookies } from 'next/headers';
import type { Locale } from '@/lib/types';
import { LOCALE_COOKIE, getDictionary, isLocale } from './dictionaries';

/**
 * Resolve the locale for a server render. The store's saved language wins;
 * the cookie covers the login page and the moment before a store exists.
 */
export function getLocale(storeLanguage?: string | null): Locale {
  if (isLocale(storeLanguage)) return storeLanguage;
  const fromCookie = cookies().get(LOCALE_COOKIE)?.value;
  return isLocale(fromCookie) ? fromCookie : 'en';
}

export function getServerDictionary(storeLanguage?: string | null) {
  const locale = getLocale(storeLanguage);
  return { locale, d: getDictionary(locale), dir: locale === 'ar' ? ('rtl' as const) : ('ltr' as const) };
}
