import { NextResponse } from 'next/server';
import { isAiConfigured } from '@/lib/ai/client';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({
    ok: true,
    supabase: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    ai: isAiConfigured(),
  });
}
