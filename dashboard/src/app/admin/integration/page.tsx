'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/dashboard/layout';
import { IntegrationGuidePanel } from '@/components/dashboard/integration-guide-panel';
import { TenantKeysForm } from '@/components/dashboard/tenant-keys-form';
import { Card, FieldLabel } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import {
  apiFetch,
  ApiError,
  getApiUrl,
  type AdminTenantRow,
} from '@/lib/utils';

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
}

export default function AdminIntegrationPage() {
  const { token } = useAuth();
  const [tenants, setTenants] = useState<AdminTenantRow[]>([]);
  const [tenantId, setTenantId] = useState<number | ''>('');
  const [detail, setDetail] = useState<TenantDetail | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadTenants = useCallback(async () => {
    if (!token) return;
    setLoadingList(true);
    setError('');
    try {
      const rows = await apiFetch<AdminTenantRow[]>('/v1/admin/tenants', {}, token);
      setTenants(rows);
      setTenantId((current) => {
        if (current !== '') return current;
        return rows[0]?.id ?? '';
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load companies');
    } finally {
      setLoadingList(false);
    }
  }, [token]);

  useEffect(() => {
    loadTenants();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount / token
  }, [token]);

  const loadDetail = useCallback(async (id: number) => {
    if (!token) return;
    setLoadingDetail(true);
    setError('');
    setNewSecret(null);
    setMessage('');
    try {
      const d = await apiFetch<TenantDetail>(`/v1/admin/tenants/${id}`, {}, token);
      setDetail(d);
    } catch (err) {
      setDetail(null);
      setError(err instanceof ApiError ? err.message : 'Failed to load company');
    } finally {
      setLoadingDetail(false);
    }
  }, [token]);

  useEffect(() => {
    if (typeof tenantId === 'number') loadDetail(tenantId);
  }, [tenantId, loadDetail]);

  const save = async (input: { name: string; contactEmail: string; bundleId: string }) => {
    if (!token || typeof tenantId !== 'number') return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await apiFetch(`/v1/admin/tenants/${tenantId}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }, token);
      setMessage('Company details saved.');
      await loadDetail(tenantId);
      await loadTenants();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const regenerate = async () => {
    if (!token || typeof tenantId !== 'number') return;
    if (!confirm('Regenerate client secret for this company? The old secret stops working immediately.')) return;
    setRegenerating(true);
    setError('');
    try {
      const res = await apiFetch<{ clientSecret: string }>(
        `/v1/admin/tenants/${tenantId}/regenerate-secret`,
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

  const credentials = useMemo(() => {
    if (!detail) return null;
    return {
      clientId: detail.tenant.clientId,
      clientSecret: newSecret,
      bundleId: detail.tenant.bundleId,
      apiUrl: getApiUrl(),
      appName: detail.tenant.name,
    };
  }, [detail, newSecret]);

  return (
    <>
      <PageHeader
        title="Integration"
        description="Pick a company, manage their SDK keys and package ID, then download a developer PDF for Android or iOS."
      />

      <Card className="mb-6">
        <FieldLabel>Company / tenant</FieldLabel>
        <div className="mt-1.5 flex flex-col sm:flex-row gap-3 sm:items-center">
          <select
            className="w-full sm:max-w-md h-10 rounded-lg border border-input bg-background/50 px-3 text-sm outline-none focus:ring-2 focus:ring-primary/10"
            value={tenantId === '' ? '' : String(tenantId)}
            disabled={loadingList}
            onChange={(e) => setTenantId(e.target.value ? Number(e.target.value) : '')}
          >
            {!tenants.length && <option value="">No companies yet</option>}
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} — {t.bundleId}
              </option>
            ))}
          </select>
          {typeof tenantId === 'number' && (
            <Link
              href={`/admin/tenants/${tenantId}`}
              className="text-sm text-primary hover:underline"
            >
              Open full company page →
            </Link>
          )}
        </div>
      </Card>

      {message && (
        <p className="mb-4 text-sm text-emerald-700 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-3">
          {message}
        </p>
      )}
      {error && (
        <p className="mb-4 text-sm text-red-600 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      {loadingDetail || !detail || !credentials ? (
        <div className="py-16 text-center text-muted-foreground">
          {loadingList || loadingDetail ? 'Loading…' : 'Select a company to manage integration.'}
        </div>
      ) : (
        <div className="grid xl:grid-cols-2 gap-6">
          <TenantKeysForm
            value={detail.tenant}
            newSecret={newSecret}
            saving={saving}
            regenerating={regenerating}
            onSave={save}
            onRegenerate={regenerate}
            apiUrl={getApiUrl()}
          />
          <IntegrationGuidePanel credentials={credentials} />
        </div>
      )}
    </>
  );
}
