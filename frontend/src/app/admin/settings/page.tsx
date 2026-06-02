'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { CheckCircle, Link as LinkIcon, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';

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
