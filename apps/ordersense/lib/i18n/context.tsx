'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { Locale } from '@/lib/types';
import { getDictionary, type Dictionary } from './dictionaries';

interface I18nValue {
  locale: Locale;
  dir: 'ltr' | 'rtl';
  d: Dictionary;
}

const I18nContext = createContext<I18nValue>({ locale: 'en', dir: 'ltr', d: getDictionary('en') });

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const value: I18nValue = { locale, dir: locale === 'ar' ? 'rtl' : 'ltr', d: getDictionary(locale) };
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** Access the active dictionary: `const { d, locale } = useI18n(); d.dashboard.headline` */
export function useI18n() {
  return useContext(I18nContext);
}
