'use client';

import { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '@/components/dashboard/layout';
import { CredentialsPanel } from '@/components/dashboard/credentials-panel';
import { SettingsPanel } from '@/components/dashboard/settings-panel';
import { useAuth } from '@/lib/auth';
import { apiFetch, ApiError, type TenantOverview } from '@/lib/utils';

export default function TenantSettingsPage() {
  const { token } = useAuth();
  const [regenerating, setRegenerating] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [overview, setOverview] = useState<TenantOverview | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setOverview(await apiFetch<TenantOverview>('/v1/studio/overview', {}, token));
    } catch {
      setError('Failed to load credentials');
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const regenerate = async () => {
    if (!token || !confirm('Regenerate your client secret? Update your app immediately — the old secret will stop working.')) return;
    setRegenerating(true);
    setError('');
    try {
      const res = await apiFetch<{ clientId: string; clientSecret: string; bundleId: string }>(
        '/v1/studio/regenerate-secret',
        { method: 'POST' },
        token,
      );
      setNewSecret(res.clientSecret);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to regenerate secret');
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Settings"
        description="Update your profile, change your password, and manage SDK credentials."
      />

      {error && (
        <p className="mb-4 text-sm text-red-600 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">{error}</p>
      )}

      {overview && (
        <div className="mb-8 max-w-2xl">
          <CredentialsPanel
            clientId={overview.tenant.clientId}
            bundleId={overview.tenant.bundleId}
            status={overview.tenant.status}
            onRegenerate={regenerate}
            regenerating={regenerating}
            newSecret={newSecret}
          />
        </div>
      )}

      <SettingsPanel />
    </>
  );
}
