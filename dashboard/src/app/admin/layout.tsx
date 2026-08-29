'use client';

import { RequireAuth } from '@/components/require-auth';
import { DashboardLayoutShell } from '@/components/dashboard/layout';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth role="ADMIN">
      <DashboardLayoutShell role="ADMIN">
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </DashboardLayoutShell>
    </RequireAuth>
  );
}
