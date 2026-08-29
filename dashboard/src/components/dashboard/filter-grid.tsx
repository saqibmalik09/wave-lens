'use client';

import type { FilterItem } from '@/lib/utils';

export function FilterToggleGrid({
  filters,
  enabledIds,
  onToggle,
  disabled,
}: {
  filters: FilterItem[];
  enabledIds: string[];
  onToggle: (id: string) => void;
  disabled?: boolean;
}) {
  if (!filters.length) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No filters assigned yet. Contact your administrator to entitle filters for your app.
      </p>
    );
  }

  const byCategory = filters.reduce<Record<string, FilterItem[]>>((acc, f) => {
    (acc[f.category] ??= []).push(f);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      {Object.entries(byCategory).map(([category, items]) => (
        <div key={category}>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 capitalize">
            {category}
          </h3>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {items.map((filter) => {
              const on = enabledIds.includes(filter.id);
              return (
                <button
                  key={filter.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => onToggle(filter.id)}
                  className={`text-left rounded-xl border p-4 transition-all disabled:opacity-60 ${
                    on
                      ? 'border-primary/40 bg-primary/5 shadow-sm ring-1 ring-primary/10'
                      : 'border-border bg-background/40 hover:bg-accent/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{filter.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 font-mono">{filter.id}</p>
                    </div>
                    <span
                      className={`shrink-0 w-11 h-6 rounded-full relative transition-colors ${
                        on ? 'bg-primary' : 'bg-muted'
                      }`}
                    >
                      <span
                        className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                          on ? 'left-6' : 'left-1'
                        }`}
                      />
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 capitalize">{filter.type}</p>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
