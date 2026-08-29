'use client';

import { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '@/components/dashboard/layout';
import { CredentialsPanel } from '@/components/dashboard/credentials-panel';
import { Badge, Card } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { apiFetch, ApiError, type TenantOverview } from '@/lib/utils';

export default function TenantOverviewPage() {
  const { token } = useAuth();
  const [data, setData] = useState<TenantOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      setData(await apiFetch<TenantOverview>('/v1/studio/overview', {}, token));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <div className="py-20 text-center text-muted-foreground">Loading your workspace…</div>;
  }

  if (!data) {
    return <div className="py-20 text-center text-red-600">{error || 'Unable to load'}</div>;
  }

  const { tenant, filters } = data;

  return (
    <>
      <PageHeader
        title={tenant.name}
        description="Your Wave Lens SDK integration hub — credentials, filter status, and account overview."
      />

      {tenant.status !== 'active' && (
        <p className="mb-6 text-sm text-amber-800 bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3">
          Your license is currently inactive. Filters will not work in your app until an administrator reactivates your account.
        </p>
      )}

      <div className="grid xl:grid-cols-2 gap-6 mb-8">
        <CredentialsPanel clientId={tenant.clientId} bundleId={tenant.bundleId} status={tenant.status} />

        <Card>
          <h2 className="font-semibold mb-4">Quick stats</h2>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div className="rounded-lg border border-border p-4">
              <dt className="text-muted-foreground text-xs uppercase tracking-wide">Entitled</dt>
              <dd className="text-2xl font-bold mt-1">{filters.entitled.length}</dd>
            </div>
            <div className="rounded-lg border border-border p-4">
              <dt className="text-muted-foreground text-xs uppercase tracking-wide">Enabled</dt>
              <dd className="text-2xl font-bold mt-1 text-emerald-600">{filters.enabledIds.length}</dd>
            </div>
            <div className="col-span-2 rounded-lg border border-border p-4">
              <dt className="text-muted-foreground text-xs">Contact email</dt>
              <dd className="font-medium mt-1">{tenant.contactEmail ?? '—'}</dd>
            </div>
            <div className="col-span-2 rounded-lg border border-border p-4">
              <dt className="text-muted-foreground text-xs">Member since</dt>
              <dd className="font-medium mt-1">{new Date(tenant.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' })}</dd>
            </div>
          </dl>
          <p className="text-sm text-muted-foreground mt-4">
            Manage which filters are live in your app from the{' '}
            <a href="/dashboard/filters" className="text-primary font-medium hover:underline">
              Filters
            </a>{' '}
            page. Regenerate your client secret from{' '}
            <a href="/dashboard/settings" className="text-primary font-medium hover:underline">
              Settings
            </a>.
          </p>
        </Card>
      </div>

      <Card>
        <h2 className="font-semibold mb-4">Integration snippet</h2>
        <p className="text-sm text-muted-foreground mb-3">Initialize Wave Lens in your Android app:</p>
        <pre className="text-xs font-mono bg-background/80 border border-border rounded-lg p-4 overflow-x-auto">
{`WaveLens.init(
  context,
  "${tenant.clientId}",
  "<your-client-secret>",
  "${tenant.bundleId}"
);`}
        </pre>
      </Card>
    </>
  );
}
