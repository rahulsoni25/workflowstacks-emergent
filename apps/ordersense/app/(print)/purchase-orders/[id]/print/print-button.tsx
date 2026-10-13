'use client';

import { useEffect } from 'react';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PrintButton({ label }: { label: string }) {
  // Open the print dialog automatically once fonts have loaded.
  useEffect(() => {
    const t = setTimeout(() => window.print(), 600);
    return () => clearTimeout(t);
  }, []);
  return (
    <Button size="sm" onClick={() => window.print()}>
      <Printer />
      {label}
    </Button>
  );
}
