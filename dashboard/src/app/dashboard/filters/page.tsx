'use client';

import { useCallback, useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/layout';
import { FilterToggleGrid } from '@/components/dashboard/filter-grid';
import { Card, PrimaryButton } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { apiFetch, ApiError, type TenantOverview } from '@/lib/utils';

export default function TenantFiltersPage() {
  const { token } = useAuth();
  const [data, setData] = useState<TenantOverview | null>(null);
  const [enabled, setEnabled] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const overview = await apiFetch<TenantOverview>('/v1/studio/overview', {}, token);
      setData(overview);
      setEnabled(overview.filters.enabledIds);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load filters');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = (id: string) => {
    setEnabled((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    setMessage('');
  };

  const save = async () => {
    if (!token) return;
    setSaving(true);
    setError('');
    try {
      await apiFetch('/v1/studio/filters/enabled', {
        method: 'PUT',
        body: JSON.stringify({ filterIds: enabled }),
      }, token);
      setMessage('Filter settings saved. Changes apply on the next SDK sync.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save filters');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-muted-foreground">Loading filters…</div>;
  }

  return (
    <>
      <PageHeader
        title="Filters"
        description="Turn filters on or off for your app. You can only enable filters your administrator has entitled for your account."
        action={
          <PrimaryButton type="button" loading={saving} className="w-auto px-5" onClick={save}>
            <Save className="w-4 h-4" />
            Save changes
          </PrimaryButton>
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

      {data?.tenant.status !== 'active' && (
        <p className="mb-4 text-sm text-amber-800 bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3">
          Your account is inactive — filter changes will not take effect until reactivated.
        </p>
      )}

      <Card>
        <FilterToggleGrid
          filters={data?.filters.entitled ?? []}
          enabledIds={enabled}
          onToggle={toggle}
          disabled={data?.tenant.status !== 'active'}
        />
      </Card>
    </>
  );
}
