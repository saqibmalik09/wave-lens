'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/dashboard/layout';
import { IntegrationGuidePanel } from '@/components/dashboard/integration-guide-panel';
import { TenantKeysForm } from '@/components/dashboard/tenant-keys-form';
import { useAuth } from '@/lib/auth';
import { apiFetch, ApiError, getApiUrl, type TenantOverview } from '@/lib/utils';

export default function TenantIntegrationPage() {
  const { token } = useAuth();
  const [data, setData] = useState<TenantOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const overview = await apiFetch<TenantOverview>('/v1/studio/overview', {}, token);
      setData(overview);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load integration details');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (input: { name: string; contactEmail: string; bundleId: string }) => {
    if (!token) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await apiFetch('/v1/studio/tenant', {
        method: 'PATCH',
        body: JSON.stringify(input),
      }, token);
      setMessage('App details saved.');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const regenerate = async () => {
    if (!token || !confirm('Regenerate client secret? The old secret stops working immediately.')) return;
    setRegenerating(true);
    setError('');
    try {
      const res = await apiFetch<{ clientSecret: string }>(
        '/v1/studio/regenerate-secret',
        { method: 'POST' },
        token,
      );
      setNewSecret(res.clientSecret);
      setMessage('New client secret generated — copy it now.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to regenerate secret');
    } finally {
      setRegenerating(false);
    }
  };

  const credentials = useMemo(() => {
    if (!data) return null;
    return {
      clientId: data.tenant.clientId,
      clientSecret: newSecret,
      bundleId: data.tenant.bundleId,
      apiUrl: getApiUrl(),
      appName: data.tenant.name,
    };
  }, [data, newSecret]);

  if (loading || !data || !credentials) {
    return <div className="py-20 text-center text-muted-foreground">{error || 'Loading…'}</div>;
  }

  return (
    <>
      <PageHeader
        title="Integration"
        description="Manage SDK keys, update your package name, pick your stack, and download a step-by-step PDF for developers."
      />

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

      <div className="grid xl:grid-cols-2 gap-6">
        <TenantKeysForm
          value={data.tenant}
          newSecret={newSecret}
          saving={saving}
          regenerating={regenerating}
          onSave={save}
          onRegenerate={regenerate}
          apiUrl={getApiUrl()}
        />
        <IntegrationGuidePanel credentials={credentials} />
      </div>
    </>
  );
}
