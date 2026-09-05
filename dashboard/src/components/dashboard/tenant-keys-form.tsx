'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, KeyRound, RefreshCw, Save } from 'lucide-react';
import { Badge, Card, FieldLabel, OutlineButton, PrimaryButton, TextInput } from '@/components/ui';

export type TenantKeysValue = {
  id: number;
  name: string;
  contactEmail: string | null;
  bundleId: string;
  clientId: string;
  status: string;
};

export function TenantKeysForm({
  value,
  newSecret,
  saving,
  regenerating,
  onSave,
  onRegenerate,
  apiUrl = 'https://api.wavelens.online',
}: {
  value: TenantKeysValue;
  newSecret?: string | null;
  saving?: boolean;
  regenerating?: boolean;
  onSave: (input: { name: string; contactEmail: string; bundleId: string }) => Promise<void> | void;
  onRegenerate?: () => void;
  apiUrl?: string;
}) {
  const [name, setName] = useState(value.name);
  const [contactEmail, setContactEmail] = useState(value.contactEmail ?? '');
  const [bundleId, setBundleId] = useState(value.bundleId);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    setName(value.name);
    setContactEmail(value.contactEmail ?? '');
    setBundleId(value.bundleId);
  }, [value.id, value.name, value.contactEmail, value.bundleId]);

  const copy = async (key: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const CopyBtn = ({ id, text }: { id: string; text: string }) => (
    <OutlineButton
      type="button"
      className="h-8 px-2 text-xs inline-flex items-center gap-1 shrink-0"
      onClick={() => copy(id, text)}
    >
      {copied === id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      Copy
    </OutlineButton>
  );

  return (
    <Card>
      <div className="flex items-center justify-between gap-4 mb-2">
        <h2 className="font-semibold flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-primary" />
          App keys &amp; package
        </h2>
        <Badge tone={value.status === 'active' ? 'success' : 'warning'}>{value.status}</Badge>
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        Save your app name and Android package / iOS bundle ID. Copy Client ID into your project.
        Regenerate the secret only if it was lost — the old one stops working immediately.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 mb-5">
        <div className="space-y-1.5">
          <FieldLabel>App / company name</FieldLabel>
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="My Live App" />
        </div>
        <div className="space-y-1.5">
          <FieldLabel>Contact email</FieldLabel>
          <TextInput
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            placeholder="dev@company.com"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <FieldLabel>Package / Bundle ID</FieldLabel>
          <div className="flex gap-2">
            <TextInput
              className="font-mono"
              value={bundleId}
              onChange={(e) => setBundleId(e.target.value)}
              placeholder="com.yourcompany.app"
            />
            <CopyBtn id="bundle" text={bundleId} />
          </div>
          <p className="text-xs text-muted-foreground">Must match your Android applicationId or iOS bundle identifier.</p>
        </div>
      </div>

      <div className="space-y-3 mb-5">
        <div className="rounded-lg border border-border bg-background/50 p-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Client ID</span>
            <CopyBtn id="clientId" text={value.clientId} />
          </div>
          <code className="text-sm break-all font-mono block">{value.clientId}</code>
        </div>

        <div className="rounded-lg border border-border bg-background/50 p-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">API URL</span>
            <CopyBtn id="api" text={apiUrl} />
          </div>
          <code className="text-sm break-all font-mono block">{apiUrl}</code>
        </div>

        {newSecret ? (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-medium text-amber-800 uppercase tracking-wide">
                Client secret (copy now — shown once)
              </span>
              <CopyBtn id="secret" text={newSecret} />
            </div>
            <code className="text-sm break-all font-mono block">{newSecret}</code>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            Client secret is not stored in plain text. Use <strong>Regenerate</strong> if you need a new one.
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <PrimaryButton
          type="button"
          className="w-auto px-5"
          loading={saving}
          onClick={() => onSave({ name, contactEmail, bundleId })}
        >
          <Save className="w-4 h-4" />
          Save details
        </PrimaryButton>
        {onRegenerate && (
          <OutlineButton
            type="button"
            className="w-auto px-4 inline-flex items-center gap-2"
            disabled={regenerating}
            onClick={onRegenerate}
          >
            <RefreshCw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
            Regenerate secret
          </OutlineButton>
        )}
      </div>
    </Card>
  );
}
