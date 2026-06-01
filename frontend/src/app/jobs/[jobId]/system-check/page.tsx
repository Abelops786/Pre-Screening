'use client';
import { useEffect, useState, useRef, Suspense } from 'react';
import Image from 'next/image';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { toast } from 'react-toastify';
import { Wifi, CheckCircle, XCircle, Loader2, Monitor, Mic } from 'lucide-react';

type SpeedResult = { download: number; upload: number };

async function measureSpeed(): Promise<SpeedResult> {
  let download = 0;
  let upload = 0;
  try {
    const dlStart = performance.now();
    const res = await fetch('https://speed.cloudflare.com/__down?bytes=5000000', { cache: 'no-store' });
    await res.blob();
    const dlTime = (performance.now() - dlStart) / 1000;
    download = parseFloat(((5 * 8) / dlTime).toFixed(2));
  } catch { download = 0; }
  try {
    const blob = new Blob([new ArrayBuffer(2 * 1024 * 1024)]);
    const ulStart = performance.now();
    await fetch('https://speed.cloudflare.com/__up', { method: 'POST', body: blob, cache: 'no-store' }).catch(() => null);
    const ulTime = (performance.now() - ulStart) / 1000;
    upload = parseFloat(((2 * 8) / ulTime).toFixed(2));
  } catch { upload = 0; }
  return { download, upload };
}

function SystemCheckContent() {
  const { jobId }     = useParams<{ jobId: string }>();
  const router        = useRouter();
  const searchParams  = useSearchParams();
  const candidateId   = searchParams.get('id') || '';

  const [step,       setStep]       = useState<'idle' | 'testing' | 'done'>('idle');
  const [speed,      setSpeed]      = useState<SpeedResult | null>(null);
  const [micGranted, setMicGranted] = useState<boolean | null>(null);
  const [device,     setDevice]     = useState({ os: '', browser: '', deviceType: '', label: '' });
  const [submitting, setSubmitting] = useState(false);
  const [minDown,    setMinDown]    = useState(20);
  const [minUp,      setMinUp]      = useState(10);
  const hasRun = useRef(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    const os = /Windows/.test(ua) ? 'Windows' : /Mac/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux'
      : /Android/.test(ua) ? 'Android' : /iOS|iPhone|iPad/.test(ua) ? 'iOS' : 'Unknown';
    const browser = /Chrome/.test(ua) && !/Edg/.test(ua) ? 'Chrome' : /Firefox/.test(ua) ? 'Firefox'
      : /Safari/.test(ua) ? 'Safari' : /Edg/.test(ua) ? 'Edge' : 'Other';
    const deviceType = /Mobi|Android/.test(ua) ? 'mobile' : 'desktop';
    setDevice({ os, browser, deviceType, label: `${os} / ${browser} (${deviceType})` });

    api.get(`/jobs/public/${jobId}`).then(({ data }) => {
      setMinDown(data.data.minDownloadSpeed ?? 20);
      setMinUp(data.data.minUploadSpeed ?? 10);
    }).catch(() => {});
  }, [jobId]);

  const runChecks = async () => {
    if (hasRun.current) return;
    hasRun.current = true;
    setStep('testing');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setMicGranted(true);
    } catch { setMicGranted(false); }
    const result = await measureSpeed();
    setSpeed(result);
    setStep('done');
  };

  const submit = async () => {
    if (!speed || micGranted === null || !candidateId) { toast.error('Run the system check first'); return; }
    setSubmitting(true);
    try {
      await api.post(`/candidates/${candidateId}/system-check`, {
        downloadSpeed: speed.download, uploadSpeed: speed.upload,
        deviceType: device.deviceType, os: device.os, browser: device.browser,
        micPermitted: micGranted, speakerPermitted: true,
      });
      toast.success('System check complete!');
      // Always go to audio recording next (voice screening)
      router.push(`/jobs/${jobId}/audio?id=${candidateId}`);
    } catch { toast.error('Failed to save system check. Please try again.'); }
    finally { setSubmitting(false); }
  };

  const dlOk  = speed ? speed.download >= minDown : null;
  const ulOk  = speed ? speed.upload >= minUp : null;
  const allOk = dlOk && ulOk && micGranted;

  const Row = ({ icon, label, value, ok }: { icon: React.ReactNode; label: string; value: string; ok: boolean | null }) => (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-2.5 text-sm text-gray-700">
        <span className="text-brand-500">{icon}</span>
        {label}
      </div>
      <div className="flex items-center gap-2 text-sm">
        {value && <span className="text-gray-600 font-medium">{value}</span>}
        {ok === null ? <span className="text-gray-300 text-xs">—</span>
          : ok ? <CheckCircle size={17} className="text-green-500" />
          : <XCircle size={17} className="text-red-500" />}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-700 to-brand-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Image src="/logo.webp" alt="Logo" width={140} height={42} className="object-contain mx-auto mb-4" unoptimized />
          <div className="inline-flex items-center gap-2 bg-white/10 text-white rounded-full px-4 py-1.5 text-sm mb-3">
            <Monitor size={14} /> Step 2 of 3 – System &amp; Hardware Check
          </div>
          <h1 className="text-2xl font-bold text-white">System Readiness Check</h1>
          <p className="text-brand-100 text-sm mt-1">We are verifying your connection and device</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-6">
          <div className="mb-5">
            <Row icon={<Wifi size={15} />}   label={`Download Speed`}   value={speed ? `${speed.download} Mbps` : ''} ok={dlOk} />
            <Row icon={<Wifi size={15} />}   label={`Upload Speed`}     value={speed ? `${speed.upload} Mbps` : ''}   ok={ulOk} />
            <Row icon={<Mic size={15} />}    label="Microphone Access"   value={micGranted === true ? 'Granted' : micGranted === false ? 'Denied' : ''} ok={micGranted} />
            <Row icon={<Monitor size={15} />} label="Device"             value={step !== 'idle' ? device.label : ''} ok={step !== 'idle' ? true : null} />
          </div>

          {step === 'idle' && (
            <button onClick={runChecks}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl py-3 flex items-center justify-center gap-2 transition-colors">
              <Wifi size={18} /> Start System Check
            </button>
          )}

          {step === 'testing' && (
            <div className="text-center py-4">
              <Loader2 size={32} className="animate-spin text-brand-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Running checks, please wait…</p>
            </div>
          )}

          {step === 'done' && (
            <div className="space-y-3">
              {allOk ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2 text-green-700">
                  <CheckCircle size={18} className="text-green-500 shrink-0" />
                  <p className="text-sm font-semibold">All checks passed! You may proceed to the audio interview.</p>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
                  <p className="font-semibold">Some requirements not met</p>
                  <p className="text-xs mt-1">Your application will still be submitted but may not advance past this stage.</p>
                </div>
              )}
              <button onClick={submit} disabled={submitting}
                className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold rounded-xl py-3 flex items-center justify-center gap-2 transition-colors">
                {submitting ? <Loader2 size={18} className="animate-spin" /> : null}
                {submitting ? 'Saving…' : 'Continue to Audio Interview →'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function JobSystemCheckPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-brand-700 to-brand-900 flex items-center justify-center"><Loader2 size={32} className="animate-spin text-white" /></div>}>
      <SystemCheckContent />
    </Suspense>
  );
}
