'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export function RequireAuth({
  children,
  role,
}: {
  children: React.ReactNode;
  role?: 'ADMIN' | 'TENANT';
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (role && user.role !== role) {
      router.replace(user.role === 'ADMIN' ? '/admin' : '/dashboard');
    }
  }, [user, loading, role, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (role && user.role !== role) return null;

  return <>{children}</>;
}
