import { Suspense } from 'react';
import { LoginForm } from '@/components/login-form';
import { LanguageToggle } from '@/components/language-toggle';
import { getServerDictionary } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  const { d } = getServerDictionary();
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="mb-3 grid h-12 w-12 place-items-center rounded-xl bg-primary text-xl font-black text-primary-foreground">O</div>
            <h1 className="text-2xl font-extrabold">{d.app.name}</h1>
            <p className="text-sm text-muted-foreground">{d.login.subtitle}</p>
          </div>
          <LanguageToggle />
        </div>
        <div className="rounded-2xl border bg-background p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold">{d.login.title}</h2>
          <Suspense>
            <LoginForm configured={configured} />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
