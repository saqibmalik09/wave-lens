'use client';

import { useState } from 'react';
import { Check, Copy, KeyRound, RefreshCw } from 'lucide-react';
import { Badge, Card, OutlineButton, PrimaryButton } from '@/components/ui';

export function CredentialsPanel({
  clientId,
  bundleId,
  status,
  onRegenerate,
  regenerating,
  newSecret,
}: {
  clientId: string;
  bundleId: string;
  status: string;
  onRegenerate?: () => void;
  regenerating?: boolean;
  newSecret?: string | null;
}) {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (key: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const fields = [
    { key: 'clientId', label: 'Client ID', value: clientId },
    { key: 'bundleId', label: 'Bundle ID', value: bundleId },
  ];

  if (newSecret) {
    fields.push({ key: 'secret', label: 'Client secret (copy now)', value: newSecret });
  }

  return (
    <Card>
      <div className="flex items-center justify-between gap-4 mb-4">
        <h2 className="font-semibold flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-primary" />
          SDK credentials
        </h2>
        <Badge tone={status === 'active' ? 'success' : 'warning'}>{status}</Badge>
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        Add these to your Android app when initializing Wave Lens. The client secret is stored securely —
        regenerate if you lose it.
      </p>

      <div className="space-y-3">
        {fields.map((f) => (
          <div
            key={f.key}
            className={`rounded-lg border p-4 ${
              f.key === 'secret' ? 'border-amber-500/40 bg-amber-500/5' : 'border-border bg-background/50'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{f.label}</span>
              <OutlineButton
                type="button"
                className="h-7 px-2 text-xs inline-flex items-center gap-1"
                onClick={() => copy(f.key, f.value)}
              >
                {copied === f.key ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                Copy
              </OutlineButton>
            </div>
            <code className="text-sm break-all font-mono block">{f.value}</code>
          </div>
        ))}
      </div>

      {onRegenerate && (
        <PrimaryButton
          type="button"
          className="w-auto mt-5 px-5"
          loading={regenerating}
          onClick={onRegenerate}
        >
          <RefreshCw className="w-4 h-4" />
          Regenerate client secret
        </PrimaryButton>
      )}
    </Card>
  );
}
