'use client';

import { useCallback, useEffect, useState } from 'react';
import { Copy, Check, Save, KeyRound } from 'lucide-react';
import { RequireAuth } from '@/components/require-auth';
import { StudioHeader } from '@/components/studio-header';
import { Badge, Card, DashboardShell, OutlineButton, PrimaryButton } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { apiFetch, ApiError, type TenantOverview } from '@/lib/utils';

export default function DashboardPage() {
  return (
    <RequireAuth role="TENANT">
      <TenantDashboard />
    </RequireAuth>
  );
}

function TenantDashboard() {
  const { token } = useAuth();
  const [data, setData] = useState<TenantOverview | null>(null);
  const [enabled, setEnabled] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const overview = await apiFetch<TenantOverview>('/v1/studio/overview', {}, token);
      setData(overview);
      setEnabled(overview.filters.enabledIds);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleFilter = (id: string) => {
    setEnabled((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    setSaved(false);
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
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save filters');
    } finally {
      setSaving(false);
    }
  };

  const copy = async (label: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) {
    return (
      <DashboardShell>
        <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading dashboard...</div>
      </DashboardShell>
    );
  }

  if (!data) {
    return (
      <DashboardShell>
        <div className="min-h-screen flex items-center justify-center text-red-600">{error || 'Unable to load'}</div>
      </DashboardShell>
    );
  }

  const { tenant, filters } = data;

  return (
    <DashboardShell>
      <StudioHeader title={tenant.name} subtitle="Tenant dashboard" />

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {error && <div className="text-sm text-red-600 bg-red-500/10 border border-red-500/20 rounded-lg p-3">{error}</div>}

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-primary" />
                SDK credentials
              </h2>
              <Badge tone={tenant.status === 'active' ? 'success' : 'warning'}>{tenant.status}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Use these in your Android app with Wave Lens SDK. The secret is stored hashed — contact support if you need a reset.
            </p>
            <div className="space-y-3">
              {[
                ['Client ID', tenant.clientId],
                ['Bundle ID', tenant.bundleId],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-border bg-background/50 p-3">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs text-muted-foreground">{label}</span>
                    <OutlineButton
                      type="button"
                      className="h-7 px-2 text-xs inline-flex items-center gap-1"
                      onClick={() => copy(label, value)}
                    >
                      {copied === label ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      Copy
                    </OutlineButton>
                  </div>
                  <code className="text-xs break-all font-mono">{value}</code>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="font-semibold mb-2">Account</h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Contact email</dt>
                <dd className="font-medium">{tenant.contactEmail ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Tenant since</dt>
                <dd className="font-medium">{new Date(tenant.createdAt).toLocaleDateString()}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Entitled filters</dt>
                <dd className="font-medium">{filters.entitled.length}</dd>
              </div>
            </dl>
          </Card>
        </div>

        <Card>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="font-semibold text-lg">Enabled filters</h2>
              <p className="text-sm text-muted-foreground">Toggle which filters appear in your app (must be entitled).</p>
            </div>
            <PrimaryButton
              type="button"
              loading={saving}
              className="w-auto px-5"
              onClick={save}
            >
              <Save className="w-4 h-4" />
              {saved ? 'Saved' : 'Save changes'}
            </PrimaryButton>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filters.entitled.map((filter) => {
              const on = enabled.includes(filter.id);
              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => toggleFilter(filter.id)}
                  className={`text-left rounded-lg border p-4 transition-all ${
                    on
                      ? 'border-primary/40 bg-primary/5 shadow-sm'
                      : 'border-border bg-background/40 hover:bg-accent/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm">{filter.name}</span>
                    <span
                      className={`w-10 h-6 rounded-full relative transition-colors ${
                        on ? 'bg-primary' : 'bg-muted'
                      }`}
                    >
                      <span
                        className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                          on ? 'left-5' : 'left-1'
                        }`}
                      />
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 capitalize">
                    {filter.category} · {filter.type}
                  </p>
                </button>
              );
            })}
          </div>
        </Card>
      </main>
    </DashboardShell>
  );
}
