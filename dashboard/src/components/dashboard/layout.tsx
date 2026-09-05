'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Building2,
  Sparkles,
  Settings,
  LayoutDashboard,
  KeyRound,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };

const adminNav: NavItem[] = [
  { href: '/admin', label: 'Companies', icon: Building2 },
  { href: '/admin/integration', label: 'Integration', icon: KeyRound },
  { href: '/admin/filters', label: 'Filter catalog', icon: Sparkles },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

const tenantNav: NavItem[] = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/integration', label: 'Integration', icon: KeyRound },
  { href: '/dashboard/filters', label: 'Filters', icon: Sparkles },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export function DashboardSidebar({ role }: { role: 'ADMIN' | 'TENANT' }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const nav = role === 'ADMIN' ? adminNav : tenantNav;

  const isActive = (href: string) => {
    if (href === '/admin' || href === '/dashboard') return pathname === href;
    return pathname.startsWith(href);
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const sidebar = (
    <aside className="flex flex-col h-full border-r border-border bg-card/95 backdrop-blur">
      <div className="p-5 border-b border-border">
        <Link href={role === 'ADMIN' ? '/admin' : '/dashboard'} className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
            W
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">Wave Lens Studio</p>
            <p className="text-xs text-muted-foreground truncate">
              {role === 'ADMIN' ? 'Administrator' : 'Tenant portal'}
            </p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {nav.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border space-y-3">
        <div className="px-2">
          <p className="text-xs font-medium truncate">{user?.name || 'Account'}</p>
          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-card/95 backdrop-blur">
        <button type="button" onClick={() => setOpen(true)} aria-label="Open menu">
          <Menu className="w-5 h-5" />
        </button>
        <span className="font-semibold text-sm">Wave Lens Studio</span>
        <KeyRound className="w-5 h-5 text-muted-foreground" />
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:block w-64 shrink-0 fixed inset-y-0 left-0 z-20">{sidebar}</div>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] shadow-xl">
            <button
              type="button"
              className="absolute top-4 right-4 z-10 p-1 rounded-md hover:bg-accent"
              onClick={() => setOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
            {sidebar}
          </div>
        </div>
      )}
    </>
  );
}

export function DashboardLayoutShell({
  role,
  children,
}: {
  role: 'ADMIN' | 'TENANT';
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-100/40 via-background to-background" />
      <DashboardSidebar role={role} />
      <div className="lg:pl-64 min-h-screen flex flex-col">{children}</div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{description}</p>}
      </div>
      {action}
    </div>
  );
}
