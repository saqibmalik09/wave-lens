'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/dashboard/layout';
import { TenantKeysForm } from '@/components/dashboard/tenant-keys-form';
import { FilterToggleGrid } from '@/components/dashboard/filter-grid';
import { Badge, Card, OutlineButton, PrimaryButton } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { apiFetch, ApiError, getApiUrl, type FilterItem } from '@/lib/utils';

interface TenantDetail {
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
  filters: FilterItem[];
}

export default function AdminTenantPage() {
  const params = useParams();
  const id = Number(params.id);
  const { token } = useAuth();
  const [detail, setDetail] = useState<TenantDetail | null>(null);
  const [allFilters, setAllFilters] = useState<FilterItem[]>([]);
  const [entitled, setEntitled] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    if (!token || !id) return;
    setLoading(true);
    setError('');
    try {
      const [d, filters] = await Promise.all([
        apiFetch<TenantDetail>(`/v1/admin/tenants/${id}`, {}, token),
        apiFetch<FilterItem[]>('/v1/admin/filters', {}, token),
      ]);
      setDetail(d);
      setAllFilters(filters);
      setEntitled(d.entitledFilterIds);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load company');
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
    setMessage('');
    try {
      await apiFetch(`/v1/admin/tenants/${id}/entitled`, {
        method: 'PUT',
        body: JSON.stringify({ filterIds: entitled }),
      }, token);
      setMessage('Entitled filters saved. Tenant can only enable filters you allow.');
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const toggleTenantStatus = async () => {
    if (!token || !detail) return;
    const status = detail.tenant.status === 'active' ? 'inactive' : 'active';
    try {
      await apiFetch(`/v1/admin/tenants/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }, token);
      setMessage(`Company ${status === 'active' ? 'activated' : 'deactivated'}.`);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update status');
    }
  };

  const regenerateSecret = async () => {
    if (!token || !confirm('Regenerate client secret? The old secret stops working immediately.')) return;
    setRegenerating(true);
    setError('');
    try {
      const res = await apiFetch<{ clientSecret: string }>(
        `/v1/admin/tenants/${id}/regenerate-secret`,
        { method: 'POST' },
        token,
      );
      setNewSecret(res.clientSecret);
      setMessage('New client secret generated — share it with the tenant securely.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to regenerate secret');
    } finally {
      setRegenerating(false);
    }
  };

  const saveDetails = async (input: { name: string; contactEmail: string; bundleId: string }) => {
    if (!token) return;
    setSavingDetails(true);
    setError('');
    setMessage('');
    try {
      await apiFetch(`/v1/admin/tenants/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }, token);
      setMessage('Company details saved.');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save details');
    } finally {
      setSavingDetails(false);
    }
  };

  if (loading || !detail) {
    return <div className="py-20 text-center text-muted-foreground">{error || 'Loading…'}</div>;
  }

  const { tenant, users, enabledFilterIds } = detail;

  return (
    <>
      <Link
        href="/admin"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to companies
      </Link>

      <PageHeader
        title={tenant.name}
        description={`Manage SDK access, entitled filters, and account status for this company.`}
        action={
          <OutlineButton onClick={toggleTenantStatus}>
            {tenant.status === 'active' ? 'Deactivate company' : 'Activate company'}
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

      <div className="grid xl:grid-cols-2 gap-6 mb-8">
        <TenantKeysForm
          value={tenant}
          newSecret={newSecret}
          saving={savingDetails}
          regenerating={regenerating}
          onSave={saveDetails}
          onRegenerate={regenerateSecret}
          apiUrl={getApiUrl()}
        />

        <Card>
          <h2 className="font-semibold mb-4">Company details</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Status</dt>
              <dd><Badge tone={tenant.status === 'active' ? 'success' : 'warning'}>{tenant.status}</Badge></dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Contact</dt>
              <dd className="font-medium">{tenant.contactEmail}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Registered</dt>
              <dd>{new Date(tenant.createdAt).toLocaleDateString()}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Enabled filters</dt>
              <dd>{enabledFilterIds.length} active in app</dd>
            </div>
          </dl>
          <p className="text-sm mt-4">
            <Link href="/admin/integration" className="text-primary hover:underline">
              Open Integration (PDF guides) →
            </Link>
          </p>

          <h3 className="font-medium text-sm mt-6 mb-3">Portal users</h3>
          <ul className="space-y-2">
            {users.map((u) => (
              <li key={u.id} className="flex items-center justify-between text-sm border border-border rounded-lg px-3 py-2">
                <div>
                  <p className="font-medium">{u.email}</p>
                  <p className="text-xs text-muted-foreground">{u.name}</p>
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
            <p className="text-sm text-muted-foreground mt-1">
              Choose which filters this company is allowed to enable in their app. Disabled filters are removed from their tray.
            </p>
          </div>
          <PrimaryButton type="button" loading={saving} className="w-auto px-5 shrink-0" onClick={saveEntitled}>
            <Save className="w-4 h-4" />
            Save entitled filters
          </PrimaryButton>
        </div>
        <FilterToggleGrid
          filters={allFilters}
          enabledIds={entitled}
          onToggle={toggleEntitled}
        />
      </Card>
    </>
  );
}
