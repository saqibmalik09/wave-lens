'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Building2, ChevronRight, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/layout';
import { Badge, Card, OutlineButton } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { apiFetch, ApiError, type AdminTenantRow } from '@/lib/utils';

export default function AdminCompaniesPage() {
  const { token } = useAuth();
  const [tenants, setTenants] = useState<AdminTenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      setTenants(await apiFetch<AdminTenantRow[]>('/v1/admin/tenants', {}, token));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load companies');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleStatus = async (id: number, name: string, current: string) => {
    if (!token) return;
    const status = current === 'active' ? 'inactive' : 'active';
    const verb = status === 'active' ? 'activated' : 'deactivated';
    try {
      await apiFetch(`/v1/admin/tenants/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }, token);
      setMessage(`${name} has been ${verb}.`);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update status');
    }
  };

  const active = tenants.filter((t) => t.status === 'active').length;
  const inactive = tenants.length - active;

  return (
    <>
      <PageHeader
        title="Companies"
        description="Manage all registered apps, their license status, SDK keys, and entitled filters."
        action={
          <OutlineButton onClick={load} className="inline-flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </OutlineButton>
        }
      />

      {message && (
        <p className="mb-4 text-sm text-emerald-700 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-3">
          {message}
        </p>
      )}
      {error && (
        <p className="mb-4 text-sm text-red-600 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">{error}</p>
      )}

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <Card className="py-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total companies</p>
          <p className="text-2xl font-bold mt-1">{tenants.length}</p>
        </Card>
        <Card className="py-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Active</p>
          <p className="text-2xl font-bold mt-1 text-emerald-600">{active}</p>
        </Card>
        <Card className="py-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Inactive</p>
          <p className="text-2xl font-bold mt-1 text-amber-600">{inactive}</p>
        </Card>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          <h2 className="font-semibold">All tenants</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-3 font-medium">Company</th>
                <th className="px-5 py-3 font-medium">Client ID</th>
                <th className="px-5 py-3 font-medium">Bundle ID</th>
                <th className="px-5 py-3 font-medium">Filters</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && !tenants.length ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                    Loading companies…
                  </td>
                </tr>
              ) : !tenants.length ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                    No companies registered yet.
                  </td>
                </tr>
              ) : (
                tenants.map((t) => (
                  <tr key={t.id} className="border-b border-border/60 hover:bg-accent/20">
                    <td className="px-5 py-4">
                      <p className="font-medium">{t.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{t.contactEmail}</p>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs">{t.clientId}</td>
                    <td className="px-5 py-4 font-mono text-xs">{t.bundleId}</td>
                    <td className="px-5 py-4 text-xs">
                      <span className="text-emerald-600 font-medium">{t.enabledCount}</span>
                      <span className="text-muted-foreground"> / {t.entitledCount} entitled</span>
                    </td>
                    <td className="px-5 py-4">
                      <Badge tone={t.status === 'active' ? 'success' : 'warning'}>{t.status}</Badge>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <OutlineButton
                          className="h-8 px-3 text-xs"
                          onClick={() => toggleStatus(t.id, t.name, t.status)}
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
    </>
  );
}
