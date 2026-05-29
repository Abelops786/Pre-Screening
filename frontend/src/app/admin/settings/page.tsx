'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, Link as LinkIcon, RefreshCw, AlertCircle } from 'lucide-react';

function SettingsContent() {
  const searchParams = useSearchParams();
  const [msConnected, setMsConnected] = useState<boolean | null>(null);

  useEffect(() => {
    const connected = searchParams.get('ms_connected');
    if (connected === 'true') {
      setMsConnected(true);
    } else if (connected === 'false') {
      setMsConnected(false);
    }
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

      {msConnected === true && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="text-green-600" size={20} />
          <p className="text-sm font-medium">Successfully connected to Microsoft 365!</p>
        </div>
      )}

      {msConnected === false && (
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
          
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
            <div>
              <h3 className="font-medium text-gray-900">Microsoft Teams Scheduling</h3>
              <p className="text-sm text-gray-500 mt-1">
                Connect your Microsoft Entra ID (Azure AD) to automatically generate Teams meeting links for candidates who pass the initial screening.
              </p>
            </div>
            
            <button
              onClick={handleConnectMicrosoft}
              className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors flex items-center gap-2 whitespace-nowrap ml-4"
            >
              <RefreshCw size={16} />
              Connect Microsoft
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading settings...</div>}>
      <SettingsContent />
    </Suspense>
  );
}
