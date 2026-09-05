'use client';

import { useMemo, useState } from 'react';
import { Download, BookOpen } from 'lucide-react';
import { Badge, Card, OutlineButton, PrimaryButton } from '@/components/ui';
import { downloadTextPdf } from '@/lib/download-pdf';
import {
  buildGuide,
  guideToPlainText,
  platformLabel,
  techLabel,
  techsForPlatform,
  type IntegrationCredentials,
  type PlatformId,
  type TechId,
} from '@/lib/integration-guide';
import { cn } from '@/lib/utils';

export function IntegrationGuidePanel({
  credentials,
}: {
  credentials: IntegrationCredentials;
}) {
  const [platform, setPlatform] = useState<PlatformId>('android');
  const techs = techsForPlatform(platform);
  const [tech, setTech] = useState<TechId>('kotlin');

  const activeTech = techs.includes(tech) ? tech : techs[0];
  const guide = useMemo(
    () => buildGuide(platform, activeTech, credentials),
    [platform, activeTech, credentials],
  );

  const onPlatform = (p: PlatformId) => {
    setPlatform(p);
    setTech(techsForPlatform(p)[0]);
  };

  const downloadPdf = () => {
    const text = guideToPlainText(guide, credentials);
    const slug = `${platform}-${activeTech}`;
    downloadTextPdf(
      `wavelens-integration-${slug}.pdf`,
      `Wave Lens — ${guide.title}`,
      text,
    );
  };

  return (
    <Card>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
        <div>
          <h2 className="font-semibold flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Integration guide
          </h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            Choose your platform and stack. Follow the steps, then download a PDF for your developers.
          </p>
        </div>
        <PrimaryButton type="button" className="w-auto px-4 shrink-0" onClick={downloadPdf}>
          <Download className="w-4 h-4" />
          Download PDF
        </PrimaryButton>
      </div>

      <div className="mb-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Platform</p>
        <div className="flex flex-wrap gap-2">
          {(['android', 'ios'] as PlatformId[]).map((p) => (
            <OutlineButton
              key={p}
              type="button"
              className={cn(
                'w-auto px-4',
                platform === p && 'border-primary bg-primary/10 text-primary',
              )}
              onClick={() => onPlatform(p)}
            >
              {platformLabel(p)}
            </OutlineButton>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Technology</p>
        <div className="flex flex-wrap gap-2">
          {techs.map((t) => (
            <OutlineButton
              key={t}
              type="button"
              className={cn(
                'w-auto px-3',
                activeTech === t && 'border-primary bg-primary/10 text-primary',
              )}
              onClick={() => setTech(t)}
            >
              {techLabel(t)}
            </OutlineButton>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-background/40 p-4 sm:p-5 mb-5">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <h3 className="font-semibold">{guide.title}</h3>
          <Badge tone={guide.availability === 'live' ? 'success' : 'warning'}>
            {guide.availability === 'live' ? 'Available now' : 'Coming soon'}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{guide.summary}</p>
      </div>

      <ol className="space-y-4">
        {guide.steps.map((step, i) => (
          <li key={step.title} className="rounded-lg border border-border p-4">
            <p className="text-xs font-semibold text-primary mb-1">Step {i + 1}</p>
            <h4 className="font-medium mb-1">{step.title}</h4>
            <p className="text-sm text-muted-foreground mb-3">{step.body}</p>
            {step.code && (
              <pre className="text-xs sm:text-sm font-mono whitespace-pre-wrap break-all rounded-lg bg-muted/60 border border-border p-3 overflow-x-auto">
                {step.code}
              </pre>
            )}
          </li>
        ))}
      </ol>
    </Card>
  );
}
