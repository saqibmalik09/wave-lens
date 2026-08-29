'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, RefreshCw, Users } from 'lucide-react';
import { RequireAuth } from '@/components/require-auth';
import { StudioHeader } from '@/components/studio-header';
import { Badge, Card, DashboardShell, OutlineButton } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { apiFetch, ApiError, type AdminTenantRow } from '@/lib/utils';

export default function AdminPage() {
  return (
    <RequireAuth role="ADMIN">
      <AdminDashboard />
    </RequireAuth>
  );
}

function AdminDashboard() {
  const { token } = useAuth();
  const [tenants, setTenants] = useState<AdminTenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const rows = await apiFetch<AdminTenantRow[]>('/v1/admin/tenants', {}, token);
      setTenants(rows);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load tenants');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleStatus = async (id: number, current: string) => {
    if (!token) return;
    const status = current === 'active' ? 'inactive' : 'active';
    try {
      await apiFetch(`/v1/admin/tenants/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }, token);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update status');
    }
  };

  return (
    <DashboardShell>
      <StudioHeader title="Administrator" subtitle="All tenants & licenses" />

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Tenants
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {tenants.length} registered app{tenants.length === 1 ? '' : 's'}
            </p>
          </div>
          <OutlineButton onClick={load} className="inline-flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </OutlineButton>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-500/10 border border-red-500/20 rounded-lg p-3">{error}</div>
        )}

        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left">
                  <th className="px-4 py-3 font-medium">App</th>
                  <th className="px-4 py-3 font-medium">Client ID</th>
                  <th className="px-4 py-3 font-medium">Bundle</th>
                  <th className="px-4 py-3 font-medium">Filters</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && tenants.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      Loading tenants...
                    </td>
                  </tr>
                ) : tenants.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No tenants yet
                    </td>
                  </tr>
                ) : (
                  tenants.map((t) => (
                    <tr key={t.id} className="border-b border-border/60 hover:bg-accent/30">
                      <td className="px-4 py-3">
                        <div className="font-medium">{t.name}</div>
                        <div className="text-xs text-muted-foreground">{t.contactEmail}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{t.clientId}</td>
                      <td className="px-4 py-3 font-mono text-xs">{t.bundleId}</td>
                      <td className="px-4 py-3 text-xs">
                        {t.enabledCount}/{t.entitledCount} enabled
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={t.status === 'active' ? 'success' : 'warning'}>{t.status}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <OutlineButton
                            className="h-8 px-3 text-xs"
                            onClick={() => toggleStatus(t.id, t.status)}
                          >
                            {t.status === 'active' ? 'Deactivate' : 'Activate'}
                          </OutlineButton>
                          <Link href={`/admin/tenants/${t.id}`}>
                            <OutlineButton className="h-8 px-3 text-xs inline-flex items-center gap-1">
                              Manage
                              <ChevronRight className="w-3 h-3" />
                            </OutlineButton>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </DashboardShell>
  );
}
