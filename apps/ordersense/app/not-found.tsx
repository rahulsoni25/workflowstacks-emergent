import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-5xl font-black text-muted-foreground">404</h1>
      <Button asChild>
        <Link href="/dashboard">OrderSense AI</Link>
      </Button>
    </main>
  );
}
