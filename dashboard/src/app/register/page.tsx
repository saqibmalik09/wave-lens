'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mail, Lock, Smartphone, User, Building2, Copy, Check } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { ApiError } from '@/lib/utils';
import {
  AuthShell,
  AuthCard,
  BrandMark,
  FieldLabel,
  TextInput,
  PrimaryButton,
  ErrorAlert,
  OutlineButton,
} from '@/components/ui';

export default function RegisterPage() {
  const router = useRouter();
  const { register, user, loading: authLoading } = useAuth();
  const [form, setForm] = useState({
    appName: '',
    name: '',
    email: '',
    password: '',
    bundleId: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [credentials, setCredentials] = useState<{
    clientId: string;
    clientSecret: string;
    bundleId: string;
  } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user || credentials) return;
    router.replace(user.role === 'ADMIN' ? '/admin' : '/dashboard');
  }, [user, authLoading, credentials, router]);

  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await register({
        appName: form.appName,
        name: form.name || undefined,
        email: form.email,
        password: form.password,
        bundleId: form.bundleId,
      });
      setCredentials(result.credentials);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const copy = async (label: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  if (credentials) {
    return (
      <AuthShell>
        <AuthCard>
          <BrandMark />
          <p className="text-center text-sm text-muted-foreground mb-6">
            Save these credentials now — the secret is shown only once.
          </p>

          <div className="space-y-3 text-sm">
            {[
              ['Client ID', credentials.clientId, 'id'],
              ['Client Secret', credentials.clientSecret, 'secret'],
              ['Bundle ID', credentials.bundleId, 'bundle'],
            ].map(([label, value, key]) => (
              <div key={key} className="rounded-lg border border-border bg-background/50 p-3">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <OutlineButton
                    type="button"
                    className="h-7 px-2 text-xs inline-flex items-center gap-1"
                    onClick={() => copy(key, value)}
                  >
                    {copied === key ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied === key ? 'Copied' : 'Copy'}
                  </OutlineButton>
                </div>
                <code className="text-xs break-all font-mono">{value}</code>
              </div>
            ))}
          </div>

          <PrimaryButton type="button" className="mt-6" onClick={() => router.push('/dashboard')}>
            Go to dashboard
          </PrimaryButton>
        </AuthCard>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
        <AuthCard>
          <BrandMark />
          <p className="text-center text-muted-foreground text-sm mb-6 -mt-2">
            Create your app account and get SDK keys instantly
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <FieldLabel>App name</FieldLabel>
              <TextInput icon={Building2} required value={form.appName} onChange={update('appName')} placeholder="My Live App" disabled={loading} />
            </div>
            <div className="space-y-1">
              <FieldLabel>Your name (optional)</FieldLabel>
              <TextInput icon={User} value={form.name} onChange={update('name')} placeholder="Jane Doe" disabled={loading} />
            </div>
            <div className="space-y-1">
              <FieldLabel>Email</FieldLabel>
              <TextInput icon={Mail} type="email" required value={form.email} onChange={update('email')} placeholder="you@company.com" disabled={loading} />
            </div>
            <div className="space-y-1">
              <FieldLabel>Password</FieldLabel>
              <TextInput icon={Lock} type="password" required minLength={8} value={form.password} onChange={update('password')} placeholder="Min. 8 characters" disabled={loading} />
            </div>
            <div className="space-y-1">
              <FieldLabel>Android bundle ID</FieldLabel>
              <TextInput icon={Smartphone} required value={form.bundleId} onChange={update('bundleId')} placeholder="com.yourcompany.app" disabled={loading} />
            </div>

            {error && <ErrorAlert message={error} />}

            <PrimaryButton type="submit" loading={loading} className="mt-2">
              Create account
            </PrimaryButton>
          </form>

          <div className="mt-6 border-t border-border pt-5 text-center">
            <p className="text-sm text-muted-foreground">
              Already registered?{' '}
              <Link href="/login" className="font-semibold text-primary hover:underline underline-offset-4">
                Sign in
              </Link>
            </p>
          </div>
        </AuthCard>
      </motion.div>
    </AuthShell>
  );
}
