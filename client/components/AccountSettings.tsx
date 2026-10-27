'use client';
import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useUserAuth } from '@/lib/auth';
import type { User } from '@/lib/types';

export default function AccountSettings() {
  const { session: user, updateSession } = useUserAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileBusy, setProfileBusy] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileBusy(true); setProfileError(null); setProfileSaved(false);
    try {
      const updated = await api.put<User>('/api/auth/me', { name, email });
      updateSession(updated);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    } catch (e) {
      setProfileError(e instanceof ApiError ? e.message : 'Could not save your details.');
    } finally {
      setProfileBusy(false);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordBusy(true); setPasswordError(null); setPasswordSaved(false);
    try {
      await api.post('/api/auth/change-password', { currentPassword, newPassword });
      setCurrentPassword(''); setNewPassword('');
      setPasswordSaved(true);
      setTimeout(() => setPasswordSaved(false), 2500);
    } catch (e) {
      setPasswordError(e instanceof ApiError ? e.message : 'Could not change your password.');
    } finally {
      setPasswordBusy(false);
    }
  }

  if (!user) return null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 12 }}>
      <form onSubmit={saveProfile} className="panel">
        <h3 style={{ fontSize: 17, marginBottom: 16 }}>Your details</h3>
        <div className="form-field">
          <label>Name</label>
          <input required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="form-field">
          <label>Email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        {profileError && <p className="form-error">{profileError}</p>}
        {profileSaved && <p className="form-success">Saved.</p>}
        <button className="btn btn-primary" type="submit" disabled={profileBusy}>
          {profileBusy ? 'Saving…' : 'Save details'}
        </button>
      </form>

      <form onSubmit={savePassword} className="panel">
        <h3 style={{ fontSize: 17, marginBottom: 16 }}>Change password</h3>
        <div className="form-field">
          <label>Current password</label>
          <input type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
        </div>
        <div className="form-field">
          <label>New password (min. 6 characters)</label>
          <input type="password" required minLength={6} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        </div>
        {passwordError && <p className="form-error">{passwordError}</p>}
        {passwordSaved && <p className="form-success">Password updated.</p>}
        <button className="btn btn-ghost" type="submit" disabled={passwordBusy}>
          {passwordBusy ? 'Updating…' : 'Change password'}
        </button>
      </form>
    </div>
  );
}
