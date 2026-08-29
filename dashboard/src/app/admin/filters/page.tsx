'use client';

import { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '@/components/dashboard/layout';
import { Badge, Card } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { apiFetch, ApiError, type FilterItem } from '@/lib/utils';

export default function AdminFiltersPage() {
  const { token } = useAuth();
  const [filters, setFilters] = useState<FilterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      setFilters(await apiFetch<FilterItem[]>('/v1/admin/filters', {}, token));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load filters');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const byCategory = filters.reduce<Record<string, FilterItem[]>>((acc, f) => {
    (acc[f.category] ??= []).push(f);
    return acc;
  }, {});

  return (
    <>
      <PageHeader
        title="Filter catalog"
        description="Full Wave Lens filter library. Assign filters to each company from their company page."
      />

      {error && (
        <p className="mb-4 text-sm text-red-600 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">{error}</p>
      )}

      {loading ? (
        <p className="text-muted-foreground py-12 text-center">Loading catalog…</p>
      ) : (
        <div className="space-y-8">
          {Object.entries(byCategory).map(([category, items]) => (
            <Card key={category}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold capitalize">{category} filters</h2>
                <Badge>{items.length} filters</Badge>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {items.map((f) => (
                  <div key={f.id} className="rounded-lg border border-border bg-background/50 p-4">
                    <p className="font-medium text-sm">{f.name}</p>
                    <p className="text-xs font-mono text-muted-foreground mt-1">{f.id}</p>
                    <p className="text-xs text-muted-foreground mt-2 capitalize">{f.type}</p>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
