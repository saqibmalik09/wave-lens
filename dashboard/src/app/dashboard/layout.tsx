'use client';

import { RequireAuth } from '@/components/require-auth';
import { DashboardLayoutShell } from '@/components/dashboard/layout';

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth role="TENANT">
      <DashboardLayoutShell role="TENANT">
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </DashboardLayoutShell>
    </RequireAuth>
  );
}
