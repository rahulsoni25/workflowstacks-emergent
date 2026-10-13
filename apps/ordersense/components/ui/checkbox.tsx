import * as React from 'react';
import { cn } from '@/lib/utils';

/** Native checkbox with a large tap target; no Radix dependency needed. */
const Checkbox = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    type="checkbox"
    className={cn('h-6 w-6 shrink-0 cursor-pointer rounded border-2 border-input accent-[hsl(var(--primary))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', className)}
    {...props}
  />
));
Checkbox.displayName = 'Checkbox';

export { Checkbox };
