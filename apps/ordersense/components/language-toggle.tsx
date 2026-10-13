'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Languages } from 'lucide-react';
import { setLanguage } from '@/actions/store';
import { useI18n } from '@/lib/i18n/context';
import { cn } from '@/lib/utils';

export function LanguageToggle({ className }: { className?: string }) {
  const { locale } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  const next = locale === 'ar' ? 'en' : 'ar';
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(async () => {
        await setLanguage(next);
        router.refresh();
      })}
      className={cn('inline-flex h-11 items-center gap-2 rounded-lg border-2 px-3 text-sm font-bold hover:bg-accent disabled:opacity-50', className)}
      aria-label="Switch language"
    >
      <Languages className="h-5 w-5" />
      {next === 'ar' ? 'العربية' : 'English'}
    </button>
  );
}
