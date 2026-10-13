'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { createClient } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/context';

export function LoginForm({ configured }: { configured: boolean }) {
  const { d } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(params.get('error') === 'auth' ? d.errors.generic : null);
  const [info, setInfo] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!configured) return;
    setLoading(true);
    setError(null);
    setInfo(null);
    const supabase = createClient();
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push(params.get('next') || '/dashboard');
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } });
        if (error) throw error;
        if (data.session) {
          router.push('/onboarding');
          router.refresh();
        } else {
          setInfo(d.login.checkEmail);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : d.errors.generic);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {!configured ? (
        <Alert variant="warning">
          <AlertDescription>{d.login.notConfigured}</AlertDescription>
        </Alert>
      ) : null}
      <div>
        <Label htmlFor="email">{d.login.email}</Label>
        <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" dir="ltr" />
      </div>
      <div>
        <Label htmlFor="password">{d.login.password}</Label>
        <Input id="password" type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1" dir="ltr" />
        {mode === 'signup' ? <p className="mt-1 text-xs text-muted-foreground">{d.login.passwordHint}</p> : null}
      </div>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {info ? (
        <Alert variant="success">
          <AlertDescription>{info}</AlertDescription>
        </Alert>
      ) : null}
      <Button type="submit" size="lg" className="w-full" loading={loading} disabled={!configured}>
        {mode === 'signin' ? d.login.signIn : d.login.signUp}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        {mode === 'signin' ? d.login.noAccount : d.login.haveAccount}{' '}
        <button type="button" className="font-bold text-primary underline-offset-4 hover:underline" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
          {mode === 'signin' ? d.login.signUp : d.login.signIn}
        </button>
      </p>
    </form>
  );
}
