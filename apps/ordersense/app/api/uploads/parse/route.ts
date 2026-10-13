import { NextResponse } from 'next/server';
import { createClient, getStore } from '@/lib/supabase/server';
import { MAX_FILE_BYTES, detectKind, parseFile, sampleRows } from '@/lib/parsing/parse-file';
import { mapColumns } from '@/lib/ai/map-columns';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/uploads/parse   multipart: file
 * Reads the file, stores it (best effort) and returns headers, a 20-row
 * sample and the AI/heuristic column mapping for the owner to confirm.
 */
export async function POST(request: Request) {
  const store = await getStore();
  if (!store) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'No file.' }, { status: 400 });
  if (file.size > MAX_FILE_BYTES) return NextResponse.json({ error: 'file_too_big' }, { status: 413 });
  if (!detectKind(file.name, file.type)) return NextResponse.json({ error: 'unsupported_type' }, { status: 415 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const parsed = parseFile(buffer, file.name, file.type);
  if (parsed.headers.length === 0 || parsed.rows.length === 0) return NextResponse.json({ error: 'no_rows' }, { status: 422 });

  const supabase = createClient();
  const { data: upload } = await supabase
    .from('uploads')
    .insert({ store_id: store.id, file_name: file.name, status: 'pending', row_count: parsed.rowCount })
    .select('id')
    .single();

  // Keep the raw file for audit; a missing bucket must not block the import.
  if (upload) {
    const path = `${store.id}/${upload.id}/${file.name.replace(/[^\w.\-]+/g, '_')}`;
    const { error: storageErr } = await supabase.storage.from('pos-uploads').upload(path, buffer, { contentType: file.type || 'application/octet-stream', upsert: true });
    if (!storageErr) await supabase.from('uploads').update({ file_url: path }).eq('id', upload.id);
  }

  const sample = sampleRows(parsed, 20);
  const mapping = await mapColumns({ headers: parsed.headers, sampleRows: sample });

  return NextResponse.json({
    uploadId: upload?.id ?? null,
    fileName: file.name,
    headers: parsed.headers,
    sample: sample.slice(0, 5),
    rowCount: parsed.rowCount,
    truncated: parsed.truncated,
    sheetName: parsed.sheetName ?? null,
    mapping,
  });
}
