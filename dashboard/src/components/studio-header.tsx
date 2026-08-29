'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, Shield, LayoutDashboard } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { OutlineButton } from '@/components/ui';

export function StudioHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header className="border-b border-border bg-card/70 backdrop-blur sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
              W
            </div>
            <div>
              <h1 className="font-semibold text-lg">{title}</h1>
              {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {user?.role === 'ADMIN' && (
            <Link href="/admin">
              <OutlineButton className="inline-flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Admin
              </OutlineButton>
            </Link>
          )}
          {user?.role === 'TENANT' && (
            <Link href="/dashboard">
              <OutlineButton className="inline-flex items-center gap-2">
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </OutlineButton>
            </Link>
          )}
          <span className="text-sm text-muted-foreground hidden sm:inline">{user?.email}</span>
          <OutlineButton onClick={handleLogout} className="inline-flex items-center gap-2">
            <LogOut className="w-4 h-4" />
            Sign out
          </OutlineButton>
        </div>
      </div>
    </header>
  );
}
