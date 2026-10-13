import { UploadWizard } from '@/components/upload-wizard';
import { getStore } from '@/lib/supabase/server';
import { getServerDictionary } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

export default async function UploadPage() {
  const store = (await getStore())!;
  const { d } = getServerDictionary(store.language);
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold">{d.upload.title}</h1>
        <p className="text-sm text-muted-foreground">{d.upload.subtitle}</p>
      </div>
      <UploadWizard />
      <p className="text-center text-xs text-muted-foreground">
        <a href="/demo/demo-pos-export.csv" download className="underline underline-offset-4">
          demo-pos-export.csv
        </a>
      </p>
    </div>
  );
}
