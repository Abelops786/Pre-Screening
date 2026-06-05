'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'react-toastify';
import api from '@/lib/api';
import type { ScoringConfig, User } from '@/types';
import { getStoredUser, storeAuth, getStoredToken } from '@/lib/auth';
import { CheckCircle, Link as LinkIcon, RefreshCw, AlertCircle, Loader2, SlidersHorizontal, Save, UserCog, Eye, EyeOff } from 'lucide-react';

function AccountCard() {
  const [name, setName]   = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const u = getStoredUser();
    if (u) { setName(u.name || ''); setEmail(u.email || ''); }
  }, []);

  const save = async () => {
    const changingEmail = email.trim() !== (getStoredUser()?.email || '');
    const changingPw    = !!newPassword;

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { toast.error('Please enter a valid email address'); return; }
    if (changingPw && newPassword.length < 8) { toast.error('New password must be at least 8 characters'); return; }
    if (changingPw && newPassword !== confirmPassword) { toast.error('New password and confirmation do not match'); return; }
    if ((changingEmail || changingPw) && !currentPassword) { toast.error('Enter your current password to change email or password'); return; }

    setSaving(true);
    try {
      const payload: Record<string, string> = { name: name.trim(), email: email.trim() };
      if (currentPassword) payload.currentPassword = currentPassword;
      if (changingPw)      payload.newPassword = newPassword;

      const { data } = await api.patch('/auth/me', payload);
      // Persist the refreshed token + user so the change takes effect immediately.
      const token = data.data?.token || getStoredToken();
      if (token && data.data?.user) storeAuth(token, data.data.user as User);
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      toast.success('Account updated successfully');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Failed to update account');
    } finally { setSaving(false); }
  };

  const field = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-1 flex items-center gap-2">
        <UserCog size={18} className="text-brand-600" /> My Account
      </h2>
      <p className="text-sm text-gray-500 mb-4">Change your own login email and password. Your current password is required to change either.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={field} placeholder="Your name" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="username" className={field} placeholder="you@example.com" />
        </div>
      </div>

      <div className="mt-4 border-t border-gray-100 pt-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Change password</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="relative">
            <label className="block text-xs font-medium text-gray-600 mb-1">Current password</label>
            <input value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} type={showPw ? 'text' : 'password'} autoComplete="current-password" className={field} placeholder="Required to change" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">New password</label>
            <input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} type={showPw ? 'text' : 'password'} autoComplete="new-password" className={field} placeholder="Min. 8 characters" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Confirm new password</label>
            <input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} type={showPw ? 'text' : 'password'} autoComplete="new-password" className={field} placeholder="Re-type new password" />
          </div>
        </div>
        <button type="button" onClick={() => setShowPw((s) => !s)} className="mt-2 inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
          {showPw ? <EyeOff size={13} /> : <Eye size={13} />} {showPw ? 'Hide' : 'Show'} passwords
        </button>
        <p className="text-xs text-gray-400 mt-1">Leave the password fields blank if you only want to change your name or email.</p>
      </div>

      <div className="flex justify-end mt-5">
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save Account
        </button>
      </div>
    </div>
  );
}

function ScoringCard() {
  const [cfg, setCfg] = useState<ScoringConfig | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/admin/scoring-config').then(({ data }) => setCfg(data.data)).catch(() => {});
  }, []);

  const set = (k: keyof ScoringConfig, v: number) => setCfg((c) => (c ? { ...c, [k]: v } : c));

  const save = async () => {
    if (!cfg) return;
    setSaving(true);
    try {
      await api.patch('/admin/scoring-config', cfg);
      toast.success('Scoring settings saved');
    } catch { toast.error('Failed to save scoring settings'); }
    finally { setSaving(false); }
  };

  const weightSum = cfg ? cfg.weightQuestionnaire + cfg.weightAudio + cfg.weightSpeed + cfg.weightHeadphone : 0;

  const Weight = ({ label, k }: { label: string; k: keyof ScoringConfig }) => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input type="number" step="0.05" min="0" max="1" value={cfg ? cfg[k] : 0}
        onChange={(e) => set(k, Number(e.target.value))}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
    </div>
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-1 flex items-center gap-2">
        <SlidersHorizontal size={18} className="text-brand-600" /> Scoring &amp; Pass Mark
      </h2>
      <p className="text-sm text-gray-500 mb-4">Set how much each component counts toward a candidate&apos;s overall score, and the pass threshold.</p>

      {!cfg ? (
        <div className="py-6 text-center"><Loader2 size={22} className="animate-spin text-brand-600 mx-auto" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Weight label="Questionnaire weight" k="weightQuestionnaire" />
            <Weight label="Audio (AI) weight" k="weightAudio" />
            <Weight label="Internet speed weight" k="weightSpeed" />
            <Weight label="Headphone weight" k="weightHeadphone" />
          </div>
          <p className={`text-xs mt-2 ${Math.abs(weightSum - 1) < 0.001 ? 'text-gray-400' : 'text-amber-600'}`}>
            Weights total {weightSum.toFixed(2)} (they are auto-normalised, so they don&apos;t have to sum to exactly 1).
          </p>
          <div className="mt-4 max-w-xs">
            <label className="block text-xs font-medium text-gray-600 mb-1">Pass threshold (%)</label>
            <input type="number" min="0" max="100" value={cfg.passThreshold}
              onChange={(e) => set('passThreshold', Number(e.target.value))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            <p className="text-xs text-gray-400 mt-1">A candidate passes if their weighted total is at least this percentage.</p>
          </div>
          <div className="flex justify-end mt-5">
            <button onClick={save} disabled={saving}
              className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save Scoring
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function SettingsContent() {
  const searchParams = useSearchParams();
  const [connected, setConnected] = useState<boolean | null>(null);
  const [justFailed, setJustFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch the real connection status from the backend (token stored?)
  const fetchStatus = async () => {
    try {
      const { data } = await api.get('/auth/ms/status');
      setConnected(!!data.data.connected);
    } catch {
      setConnected(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const flag = searchParams.get('ms_connected');
    if (flag === 'false') setJustFailed(true);
    fetchStatus();
  }, [searchParams]);

  const handleConnectMicrosoft = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/ms/login`;
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Platform Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your platform integrations and global configurations.</p>
      </div>

      {justFailed && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="text-red-600" size={20} />
          <p className="text-sm font-medium">Failed to connect to Microsoft. Please check your credentials and try again.</p>
        </div>
      )}

      <AccountCard />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <LinkIcon size={18} className="text-brand-600" />
            Integrations
          </h2>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100 gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-medium text-gray-900">Microsoft Teams Scheduling</h3>
                {!loading && connected && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                    <CheckCircle size={12} /> Connected
                  </span>
                )}
                {!loading && connected === false && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                    Not connected
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Connect your Microsoft Entra ID (Azure AD) to automatically generate Teams meeting links for candidates who pass the initial screening.
              </p>
            </div>

            <button
              onClick={handleConnectMicrosoft}
              className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              {connected ? 'Reconnect' : 'Connect Microsoft'}
            </button>
          </div>

          {!loading && connected && (
            <p className="text-xs text-gray-400 mt-3">
              Your Microsoft account is connected. Teams links are generated automatically when a candidate passes Level 1.
            </p>
          )}
        </div>
      </div>

      <ScoringCard />
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading settings…</div>}>
      <SettingsContent />
    </Suspense>
  );
}
