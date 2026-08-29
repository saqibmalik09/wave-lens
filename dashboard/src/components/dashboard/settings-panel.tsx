'use client';

import { useEffect, useState } from 'react';
import { User, Lock } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { apiFetch, ApiError } from '@/lib/utils';
import { Card, ErrorAlert, FieldLabel, PrimaryButton, TextInput } from '@/components/ui';

export function SettingsPanel() {
  const { token, user, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [profileErr, setProfileErr] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState('');
  const [pwErr, setPwErr] = useState('');

  useEffect(() => {
    setName(user?.name ?? '');
  }, [user?.name]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setProfileLoading(true);
    setProfileErr('');
    setProfileMsg('');
    try {
      await apiFetch('/v1/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({ name: name.trim() }),
      }, token);
      await refreshUser();
      setProfileMsg('Profile updated successfully.');
    } catch (err) {
      setProfileErr(err instanceof ApiError ? err.message : 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (newPassword !== confirmPassword) {
      setPwErr('New passwords do not match');
      return;
    }
    setPwLoading(true);
    setPwErr('');
    setPwMsg('');
    try {
      await apiFetch('/v1/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      }, token);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPwMsg('Password changed successfully.');
    } catch (err) {
      setPwErr(err instanceof ApiError ? err.message : 'Failed to change password');
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6 max-w-4xl">
      <Card>
        <h2 className="font-semibold text-lg mb-1">Profile</h2>
        <p className="text-sm text-muted-foreground mb-5">Update your display name and account details.</p>
        <form onSubmit={saveProfile} className="space-y-4">
          <div>
            <FieldLabel>Email</FieldLabel>
            <TextInput value={user?.email ?? ''} disabled className="mt-1 opacity-70" />
          </div>
          <div>
            <FieldLabel>Display name</FieldLabel>
            <TextInput
              icon={User}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="mt-1"
            />
          </div>
          {profileErr && <ErrorAlert message={profileErr} />}
          {profileMsg && (
            <p className="text-xs text-emerald-700 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
              {profileMsg}
            </p>
          )}
          <PrimaryButton type="submit" loading={profileLoading} className="w-auto px-6">
            Save profile
          </PrimaryButton>
        </form>
      </Card>

      <Card>
        <h2 className="font-semibold text-lg mb-1">Password</h2>
        <p className="text-sm text-muted-foreground mb-5">Choose a strong password you don&apos;t use elsewhere.</p>
        <form onSubmit={savePassword} className="space-y-4">
          <div>
            <FieldLabel>Current password</FieldLabel>
            <TextInput
              icon={Lock}
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="mt-1"
            />
          </div>
          <div>
            <FieldLabel>New password</FieldLabel>
            <TextInput
              icon={Lock}
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              className="mt-1"
            />
          </div>
          <div>
            <FieldLabel>Confirm new password</FieldLabel>
            <TextInput
              icon={Lock}
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="mt-1"
            />
          </div>
          {pwErr && <ErrorAlert message={pwErr} />}
          {pwMsg && (
            <p className="text-xs text-emerald-700 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
              {pwMsg}
            </p>
          )}
          <PrimaryButton type="submit" loading={pwLoading} className="w-auto px-6">
            Change password
          </PrimaryButton>
        </form>
      </Card>
    </div>
  );
}
