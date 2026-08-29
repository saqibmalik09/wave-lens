'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mail, Lock } from 'lucide-react';
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
} from '@/components/ui';

export default function LoginPage() {
  const router = useRouter();
  const { login, user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading || !user) return;
    router.replace(user.role === 'ADMIN' ? '/admin' : '/dashboard');
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      router.push('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
        <AuthCard>
          <BrandMark />
          <p className="text-center text-muted-foreground text-sm mb-6 -mt-2">Sign in to your studio dashboard</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <FieldLabel>Email</FieldLabel>
              <TextInput
                icon={Mail}
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                disabled={loading}
              />
            </div>

            <div className="space-y-1">
              <FieldLabel>Password</FieldLabel>
              <TextInput
                icon={Lock}
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
              />
            </div>

            {error && <ErrorAlert message={error} />}

            <PrimaryButton type="submit" loading={loading} className="mt-2">
              Sign in
            </PrimaryButton>
          </form>

          <div className="mt-6 border-t border-border pt-5 text-center">
            <p className="text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="font-semibold text-primary hover:underline underline-offset-4">
                Create one
              </Link>
            </p>
          </div>
        </AuthCard>
      </motion.div>
    </AuthShell>
  );
}
