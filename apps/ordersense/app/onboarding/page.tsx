import { redirect } from 'next/navigation';
import { OnboardingWizard } from '@/components/onboarding-wizard';
import { UploadWizard } from '@/components/upload-wizard';
import { LanguageToggle } from '@/components/language-toggle';
import { getServerDictionary } from '@/lib/i18n/server';
import { getStore, getUser } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
  const user = await getUser();
  if (!user) redirect('/login');
  const store = await getStore();
  const { d, locale } = getServerDictionary(store?.language);
  return (
    <main className="min-h-dvh bg-muted/40 p-4">
      <div className="mx-auto w-full max-w-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary font-black text-primary-foreground">O</span>
            <span className="font-bold">{d.app.name}</span>
          </div>
          <LanguageToggle />
        </div>
        {store ? (
          // A store already exists: the only thing left is the first upload.
          <div className="space-y-4">
            <div>
              <h1 className="text-2xl font-extrabold">{d.onboarding.uploadTitle}</h1>
              <p className="text-sm text-muted-foreground">{d.onboarding.uploadHint}</p>
            </div>
            <UploadWizard compact />
            <a href="/dashboard" className="block text-center text-sm font-semibold text-primary underline-offset-4 hover:underline">
              {d.onboarding.skipUpload}
            </a>
          </div>
        ) : (
          <OnboardingWizard defaultLanguage={locale} />
        )}
      </div>
    </main>
  );
}
