import React, { useState } from 'react';
import { Lock, ArrowLeft, ShieldCheck } from 'lucide-react';
import { AdminUser } from '../types';
import { api, setAdminToken } from '../lib/api';
import { useToast } from '../components/Toast';

interface AdminLoginPageProps {
  pendingPasswordChangeUser: AdminUser | null;
  onAuthenticated: (user: AdminUser) => void;
  onNavigate: (path: string) => void;
}

export function AdminLoginPage({
  pendingPasswordChangeUser,
  onAuthenticated,
  onNavigate,
}: AdminLoginPageProps) {
  const { showToast } = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      showToast('Enter username/email and password.', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post<{ token: string; admin: AdminUser }>('/api/admin/login', {
        username: username.trim(),
        password,
      });
      setAdminToken(res.token);
      if (res.admin.mustChangePassword) {
        setCurrentPassword(password);
        showToast('First-run security check: please set a new password.', 'info');
      } else {
        showToast(`Signed in as ${res.admin.username} (${res.admin.role}).`, 'success');
      }
      onAuthenticated(res.admin);
    } catch (err: any) {
      showToast(err.message || 'Login failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      showToast('New password must be at least 8 characters.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('New password and confirmation do not match.', 'error');
      return;
    }
    if (newPassword === currentPassword) {
      showToast('Please choose a password different from the default password.', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post<{ token: string; admin: AdminUser }>(
        '/api/admin/change-password',
        {
          currentPassword,
          newPassword,
        }
      );
      setAdminToken(res.token);
      showToast('Password updated. Welcome to Muscle Arena Admin.', 'success');
      onAuthenticated(res.admin);
    } catch (err: any) {
      showToast(err.message || 'Could not update password.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#09090B] px-4 py-12">
      <div className="w-full max-w-md rounded-sm border border-white/10 bg-[#111114] p-8">
        <button
          type="button"
          onClick={() => onNavigate('/')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400 hover:text-[#B4F000] cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Public Website</span>
        </button>

        {!pendingPasswordChangeUser ? (
          <>
            <div className="mt-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-[#B4F000] text-[#09090B]">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <h1 className="font-display text-3xl tracking-wide text-white">ADMIN PORTAL</h1>
                <p className="text-xs text-zinc-400">Muscle Arena Management Console</p>
              </div>
            </div>

            <form onSubmit={handleLogin} className="mt-8 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  Username or Email
                </label>
                <input
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="owner"
                  className="min-h-[44px] w-full rounded-sm border border-white/15 bg-[#09090B] px-3.5 text-sm text-white focus:border-[#B4F000] focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  Password
                </label>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="min-h-[44px] w-full rounded-sm border border-white/15 bg-[#09090B] px-3.5 text-sm text-white focus:border-[#B4F000] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 inline-flex min-h-[46px] w-full items-center justify-center rounded-sm bg-[#B4F000] text-xs font-bold uppercase tracking-wider text-[#09090B] hover:bg-[#C9FF24] disabled:opacity-60 cursor-pointer"
              >
                {loading ? 'Signing In...' : 'Sign In to Admin'}
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="mt-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-amber-500/20 text-amber-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h1 className="font-display text-3xl tracking-wide text-white">
                  CHANGE DEFAULT PASSWORD
                </h1>
                <p className="text-xs text-zinc-400">
                  Required before accessing {pendingPasswordChangeUser.username} dashboard
                </p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="mt-8 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="min-h-[44px] w-full rounded-sm border border-white/15 bg-[#09090B] px-3.5 text-sm text-white focus:border-[#B4F000] focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  New Password (min 8 characters)
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="min-h-[44px] w-full rounded-sm border border-white/15 bg-[#09090B] px-3.5 text-sm text-white focus:border-[#B4F000] focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="min-h-[44px] w-full rounded-sm border border-white/15 bg-[#09090B] px-3.5 text-sm text-white focus:border-[#B4F000] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 inline-flex min-h-[46px] w-full items-center justify-center rounded-sm bg-[#B4F000] text-xs font-bold uppercase tracking-wider text-[#09090B] hover:bg-[#C9FF24] disabled:opacity-60 cursor-pointer"
              >
                {loading ? 'Updating...' : 'Save New Password & Continue'}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
