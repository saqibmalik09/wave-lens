'use client';

import { PageHeader } from '@/components/dashboard/layout';
import { SettingsPanel } from '@/components/dashboard/settings-panel';

export default function AdminSettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Manage your administrator profile and password."
      />
      <SettingsPanel />
    </>
  );
}
