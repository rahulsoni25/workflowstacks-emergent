import Link from 'next/link';
import { cn } from '@/lib/utils';

const TONE = {
  red: 'border-status-red/40 bg-status-red/5 text-status-red',
  amber: 'border-status-amber/50 bg-status-amber/10 text-amber-800',
  green: 'border-status-green/40 bg-status-green/5 text-status-green',
  grey: 'border-status-grey/40 bg-status-grey/5 text-status-grey',
  blue: 'border-status-blue/40 bg-status-blue/5 text-status-blue',
} as const;

export function StatCard({ label, value, tone, href, hint }: { label: string; value: string | number; tone: keyof typeof TONE; href?: string; hint?: string }) {
  const body = (
    <div className={cn('flex h-full flex-col justify-between rounded-xl border-2 p-4 transition-colors', TONE[tone], href && 'hover:bg-muted/40')}>
      <div className="text-sm font-semibold text-foreground/80">{label}</div>
      <div className="mt-2 text-4xl font-extrabold tabular-nums">{value}</div>
      {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  );
  return href ? (
    <Link href={href} className="block h-full">
      {body}
    </Link>
  ) : (
    body
  );
}
