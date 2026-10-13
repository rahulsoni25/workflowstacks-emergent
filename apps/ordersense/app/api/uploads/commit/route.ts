import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, getStore } from '@/lib/supabase/server';
import { MAX_FILE_BYTES, parseFile } from '@/lib/parsing/parse-file';
import { missingRequired, sanitizeMapping } from '@/lib/parsing/heuristics';
import { importRows } from '@/lib/imports/import-upload';
import { STANDARD_FIELDS } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const Meta = z.object({
  uploadId: z.string().uuid().nullable().optional(),
  mapping: z.record(z.enum(STANDARD_FIELDS), z.string().nullable()),
  reportDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dayFirst: z.boolean().default(true),
  cleanNames: z.boolean().default(true),
});

/**
 * POST /api/uploads/commit   multipart: file, meta (JSON string)
 * Re-parses the same file with the confirmed mapping and writes
 * suppliers / products / sales. Returns an import summary.
 */
export async function POST(request: Request) {
  const store = await getStore();
  if (!store) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  const metaRaw = form?.get('meta');
  if (!(file instanceof File) || typeof metaRaw !== 'string') return NextResponse.json({ error: 'Send file + meta.' }, { status: 400 });
  if (file.size > MAX_FILE_BYTES) return NextResponse.json({ error: 'file_too_big' }, { status: 413 });

  let meta: z.infer<typeof Meta>;
  try {
    meta = Meta.parse(JSON.parse(metaRaw));
  } catch {
    return NextResponse.json({ error: 'Invalid meta.' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const parsed = parseFile(buffer, file.name, file.type);
  if (parsed.rows.length === 0) return NextResponse.json({ error: 'no_rows' }, { status: 422 });

  const mapping = sanitizeMapping(meta.mapping, parsed.headers);
  const missing = missingRequired(mapping);
  if (missing.length) return NextResponse.json({ error: 'missing_required', missing }, { status: 422 });

  const supabase = createClient();
  try {
    const result = await importRows({
      store,
      uploadId: meta.uploadId ?? null,
      mapping,
      rows: parsed.rows,
      reportDate: meta.reportDate,
      dayFirst: meta.dayFirst,
      cleanNames: meta.cleanNames,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Import failed.';
    if (meta.uploadId) await supabase.from('uploads').update({ status: 'failed', error_summary: { message } }).eq('id', meta.uploadId);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
