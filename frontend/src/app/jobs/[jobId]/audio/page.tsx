'use client';
import { useEffect, useRef, useState, Suspense } from 'react';
import Image from 'next/image';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-toastify';
import api from '@/lib/api';
import { Mic, Square, Upload, Loader2, RefreshCw, Clock, CheckCircle } from 'lucide-react';

const MAX_SECONDS = 120;
const MIN_SECONDS = 15;

const PROMPT = `Please speak clearly for 1–2 minutes on the following topic:

"Tell us about your most recent work experience, your key responsibilities, and what you feel makes you a strong candidate for this role."

Speak naturally and confidently. The recording will begin when you press the microphone button.`;

function AudioContent() {
  const { jobId }    = useParams<{ jobId: string }>();
  const router       = useRouter();
  const params       = useSearchParams();
  const candidateId  = params.get('id');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef        = useRef<Blob[]>([]);
  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null);

  const [phase,     setPhase]    = useState<'ready' | 'recording' | 'recorded' | 'uploading' | 'done'>('ready');
  const [elapsed,   setElapsed]  = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl,  setAudioUrl]  = useState<string | null>(null);
  const [result,    setResult]    = useState<{ qualified: boolean; fluencyScore: number | null; flaggedForHumanReview?: boolean } | null>(null);

  useEffect(() => {
    if (!candidateId) router.replace('/');
  }, [candidateId, router]);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  const stopRecording = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== 'inactive') { mr.requestData(); mr.stop(); }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4'
        : 'audio/ogg';

      const mr = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        setPhase('recorded');
      };
      mr.start(250);
      setPhase('recording');
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed((prev) => {
          if (prev + 1 >= MAX_SECONDS) { stopRecording(); return MAX_SECONDS; }
          return prev + 1;
        });
      }, 1000);
    } catch {
      toast.error('Microphone access denied. Please allow microphone permissions.');
    }
  };

  const reset = () => {
    setPhase('ready'); setElapsed(0);
    setAudioBlob(null); setAudioUrl(null); setResult(null);
    chunksRef.current = [];
  };

  const submit = async () => {
    if (!audioBlob || !candidateId) return;
    if (elapsed < MIN_SECONDS) { toast.warning(`Please record at least ${MIN_SECONDS} seconds.`); return; }
    setPhase('uploading');
    try {
      const form = new FormData();
      form.append('audio', audioBlob, 'recording.webm');
      const { data } = await api.post(`/audio/${candidateId}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120_000,
      });
      setResult(data.data);
      setPhase('done');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Upload failed. Please try again.';
      toast.error(msg);
      setPhase('recorded');
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  const progress = (elapsed / MAX_SECONDS) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-700 to-brand-900 flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <div className="bg-white rounded-xl px-4 py-2.5 shadow-md">
              <Image src="/logo.webp" alt="Logo" width={140} height={42} className="object-contain h-9 w-auto" unoptimized />
            </div>
          </div>
          <div className="inline-flex items-center gap-2 bg-white/10 text-white rounded-full px-4 py-1.5 text-sm mb-3">
            <Mic size={16} /> Step 3 of 3 – Voice Screening
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Voice Screening</h1>
          <p className="text-brand-100 text-sm">Record a short spoken response — this helps us assess your communication skills</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-6 space-y-5">
          {phase !== 'done' && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Recording Prompt</p>
              <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{PROMPT}</p>
            </div>
          )}

          {phase === 'ready' && (
            <div className="text-center space-y-4">
              <p className="text-sm text-gray-500">Speak for <strong>at least 15 seconds</strong>. Press the button to begin.</p>
              <button onClick={startRecording} className="mx-auto flex flex-col items-center gap-2 group">
                <div className="w-20 h-20 rounded-full bg-brand-600 hover:bg-brand-700 flex items-center justify-center shadow-lg transition-all">
                  <Mic size={32} className="text-white" />
                </div>
                <span className="text-sm font-medium text-brand-600">Start Recording</span>
              </button>
            </div>
          )}

          {phase === 'recording' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-red-500 font-medium">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> Recording…
                </div>
                <div className="flex items-center gap-1 text-gray-600">
                  <Clock size={14} />
                  <span className="font-mono">{formatTime(elapsed)} / {formatTime(MAX_SECONDS)}</span>
                </div>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-red-500 transition-all duration-1000" style={{ width: `${progress}%` }} />
              </div>
              <button onClick={stopRecording}
                className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl py-3 flex items-center justify-center gap-2 transition-colors">
                <Square size={18} /> Stop Recording
              </button>
            </div>
          )}

          {phase === 'recorded' && audioUrl && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Playback your recording:</p>
                <audio src={audioUrl} controls className="w-full" />
                <p className="text-xs text-gray-400 mt-1">Duration: {formatTime(elapsed)}</p>
              </div>
              <div className="flex gap-3">
                <button onClick={reset}
                  className="flex-1 border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-xl py-2.5 flex items-center justify-center gap-2 text-sm transition-colors">
                  <RefreshCw size={16} /> Re-record
                </button>
                <button onClick={submit}
                  className="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl py-2.5 flex items-center justify-center gap-2 text-sm transition-colors">
                  <Upload size={16} /> Submit Recording
                </button>
              </div>
            </div>
          )}

          {phase === 'uploading' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 size={40} className="animate-spin text-brand-600" />
              <p className="text-gray-600 text-sm text-center">Analyzing your audio…<br />This may take up to 60 seconds.</p>
            </div>
          )}

          {phase === 'done' && result && (
            <div className="text-center space-y-4">
              {result.qualified ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                    <CheckCircle size={32} className="text-green-500" />
                  </div>
                  <h2 className="text-xl font-bold text-green-700">Level 1 Passed!</h2>
                  <p className="text-gray-600 text-sm">Congratulations! You have successfully passed the initial screening. A recruiter will be in touch via email.</p>
                  {result.fluencyScore !== null && (
                    <div className="inline-block bg-green-50 border border-green-200 rounded-xl px-4 py-2">
                      <p className="text-xs text-green-600 font-medium">Fluency Score</p>
                      <p className="text-2xl font-bold text-green-700">{result.fluencyScore}%</p>
                    </div>
                  )}
                </>
              ) : (
                /* Neutral message for everyone who did not auto-pass — never indicate a "fail" */
                <>
                  <div className="w-16 h-16 rounded-full bg-brand-50 flex items-center justify-center mx-auto">
                    <CheckCircle size={32} className="text-brand-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Submission Complete</h2>
                  <p className="text-gray-600 text-sm">Thank you! Your responses have been received and are now under review. Our team will be in touch by email regarding the next steps.</p>
                </>
              )}
              <button onClick={() => router.push(`/jobs/${jobId}/complete`)}
                className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl py-3 transition-colors">
                Finish →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function JobAudioPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-brand-700 to-brand-900 flex items-center justify-center"><Loader2 size={32} className="animate-spin text-white" /></div>}>
      <AudioContent />
    </Suspense>
  );
}
