'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, KeyRound, RefreshCw } from 'lucide-react';
import { useParams } from 'next/navigation';
import { RequireAuth } from '@/components/require-auth';
import { StudioHeader } from '@/components/studio-header';
import { Badge, Card, DashboardShell, OutlineButton, PrimaryButton } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { apiFetch, ApiError } from '@/lib/utils';

interface AdminTenantDetail {
  tenant: {
    id: number;
    name: string;
    contactEmail: string | null;
    bundleId: string;
    clientId: string;
    status: string;
    createdAt: string;
  };
  users: Array<{ id: number; email: string; name: string | null; status: string }>;
  entitledFilterIds: string[];
  enabledFilterIds: string[];
  filters: Array<{ id: string; name: string; category: string; type: string }>;
}

interface FilterRow {
  id: string;
  name: string;
  category: string;
  type: string;
}

export default function AdminTenantPage() {
  return (
    <RequireAuth role="ADMIN">
      <TenantDetail />
    </RequireAuth>
  );
}

function TenantDetail() {
  const params = useParams();
  const id = Number(params.id);
  const { token } = useAuth();
  const [detail, setDetail] = useState<AdminTenantDetail | null>(null);
  const [allFilters, setAllFilters] = useState<FilterRow[]>([]);
  const [entitled, setEntitled] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [newSecret, setNewSecret] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token || !id) return;
    setLoading(true);
    setError('');
    try {
      const [d, filters] = await Promise.all([
        apiFetch<AdminTenantDetail>(`/v1/admin/tenants/${id}`, {}, token),
        apiFetch<FilterRow[]>('/v1/admin/filters', {}, token),
      ]);
      setDetail(d);
      setAllFilters(filters);
      setEntitled(d.entitledFilterIds);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load tenant');
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleEntitled = (filterId: string) => {
    setEntitled((prev) =>
      prev.includes(filterId) ? prev.filter((x) => x !== filterId) : [...prev, filterId],
    );
  };

  const saveEntitled = async () => {
    if (!token) return;
    setSaving(true);
    setError('');
    try {
      await apiFetch(`/v1/admin/tenants/${id}/entitled`, {
        method: 'PUT',
        body: JSON.stringify({ filterIds: entitled }),
      }, token);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const regenerateSecret = async () => {
    if (!token || !confirm('Regenerate client secret? The old secret will stop working immediately.')) return;
    setError('');
    try {
      const res = await apiFetch<{ clientId: string; clientSecret: string }>(
        `/v1/admin/tenants/${id}/regenerate-secret`,
        { method: 'POST' },
        token,
      );
      setNewSecret(res.clientSecret);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to regenerate secret');
    }
  };

  if (loading || !detail) {
    return (
      <DashboardShell>
        <div className="min-h-screen flex items-center justify-center text-muted-foreground">
          {error || 'Loading...'}
        </div>
      </DashboardShell>
    );
  }

  const { tenant, users, enabledFilterIds } = detail;

  return (
    <DashboardShell>
      <StudioHeader title={tenant.name} subtitle="Tenant management" />

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" />
          Back to all tenants
        </Link>

        {error && (
          <div className="text-sm text-red-600 bg-red-500/10 border border-red-500/20 rounded-lg p-3">{error}</div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Tenant info</h2>
              <Badge tone={tenant.status === 'active' ? 'success' : 'warning'}>{tenant.status}</Badge>
            </div>
            <dl className="space-y-2 text-sm">
              <div><dt className="text-muted-foreground">Client ID</dt><dd className="font-mono">{tenant.clientId}</dd></div>
              <div><dt className="text-muted-foreground">Bundle ID</dt><dd className="font-mono">{tenant.bundleId}</dd></div>
              <div><dt className="text-muted-foreground">Email</dt><dd>{tenant.contactEmail}</dd></div>
              <div><dt className="text-muted-foreground">Enabled filters</dt><dd>{enabledFilterIds.length}</dd></div>
            </dl>
            <OutlineButton onClick={regenerateSecret} className="mt-4 inline-flex items-center gap-2">
              <KeyRound className="w-4 h-4" />
              Regenerate secret
            </OutlineButton>
            {newSecret && (
              <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs">
                <p className="font-medium text-amber-800 mb-1">New client secret (copy now):</p>
                <code className="break-all font-mono">{newSecret}</code>
              </div>
            )}
          </Card>

          <Card>
            <h2 className="font-semibold mb-4">Users</h2>
            <ul className="space-y-2 text-sm">
              {users.map((u) => (
                <li key={u.id} className="flex items-center justify-between border border-border rounded-lg px-3 py-2">
                  <div>
                    <div className="font-medium">{u.email}</div>
                    <div className="text-xs text-muted-foreground">{u.name}</div>
                  </div>
                  <Badge tone={u.status === 'active' ? 'success' : 'warning'}>{u.status}</Badge>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <Card>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="font-semibold text-lg">Entitled filters</h2>
              <p className="text-sm text-muted-foreground">Ceiling of filters this tenant can enable in their dashboard.</p>
            </div>
            <div className="flex gap-2">
              <OutlineButton onClick={load} className="inline-flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                Reset
              </OutlineButton>
              <PrimaryButton type="button" loading={saving} className="w-auto px-5" onClick={saveEntitled}>
                Save entitled
              </PrimaryButton>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {allFilters.map((filter) => {
              const on = entitled.includes(filter.id);
              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => toggleEntitled(filter.id)}
                  className={`text-left rounded-lg border p-4 transition-all ${
                    on ? 'border-primary/40 bg-primary/5' : 'border-border hover:bg-accent/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{filter.name}</span>
                    <span className={`text-xs ${on ? 'text-primary' : 'text-muted-foreground'}`}>
                      {on ? 'Entitled' : 'Off'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 capitalize">{filter.category}</p>
                </button>
              );
            })}
          </div>
        </Card>
      </main>
    </DashboardShell>
  );
}
