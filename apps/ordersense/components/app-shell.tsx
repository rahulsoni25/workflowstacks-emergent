'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ClipboardList, Home, LogOut, Package, Settings, Upload } from 'lucide-react';
import { useI18n } from '@/lib/i18n/context';
import { cn } from '@/lib/utils';
import { LanguageToggle } from './language-toggle';

export function AppShell({ storeName, children }: { storeName: string; children: React.ReactNode }) {
  const { d } = useI18n();
  const pathname = usePathname();
  const nav = [
    { href: '/dashboard', label: d.nav.dashboard, icon: Home },
    { href: '/products', label: d.nav.products, icon: Package },
    { href: '/upload', label: d.nav.upload, icon: Upload },
    { href: '/purchase-orders', label: d.nav.orders, icon: ClipboardList },
    { href: '/settings', label: d.nav.settings, icon: Settings },
  ];
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="no-print sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between gap-3">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-sm font-black text-primary-foreground">O</span>
            <span className="truncate text-base font-bold">{storeName}</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className={cn('flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold hover:bg-accent', isActive(n.href) && 'bg-accent text-primary')}>
                <n.icon className="h-4 w-4" />
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <form action="/auth/signout" method="post" className="hidden md:block">
              <button type="submit" className="inline-flex h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold hover:bg-accent" aria-label={d.common.signOut}>
                <LogOut className="h-4 w-4" />
                <span className="sr-only lg:not-sr-only">{d.common.signOut}</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="container flex-1 pb-24 pt-4 md:pb-8">{children}</main>

      <nav className="no-print fixed inset-x-0 bottom-0 z-40 border-t bg-background safe-bottom md:hidden">
        <ul className="grid grid-cols-5">
          {nav.map((n) => (
            <li key={n.href}>
              <Link href={n.href} className={cn('flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold text-muted-foreground', isActive(n.href) && 'text-primary')}>
                <n.icon className="h-6 w-6" />
                {n.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
