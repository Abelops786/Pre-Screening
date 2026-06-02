'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import type { Candidate, CandidateStatus } from '@/types';
import { STATUS_LABELS, STATUS_COLORS } from '@/types';
import { getStoredUser } from '@/lib/auth';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import {
  ArrowLeft, FileText, Mic, Wifi, Monitor, Loader2, Send,
  CheckCircle, XCircle, AlertTriangle, Flag, Video, ClipboardList,
} from 'lucide-react';
import { DEPT_LABELS, DEPT_COLORS } from '@/types';

const EDITABLE_STATUSES: CandidateStatus[] = [
  'PENDING', 'SYSTEM_CHECK_FAILED', 'AUDIO_PENDING', 'PROCESSING',
  'LEVEL1_PASSED', 'REJECTED', 'AUTO_DISQUALIFIED',
];

export default function CandidateProfilePage() {
  const params      = useParams();
  const router      = useRouter();
  const candidateId = params.id as string;
  const currentUser = getStoredUser();

  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [noteText,  setNoteText]  = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [statusChanging, setStatusChanging] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [teamsLink, setTeamsLink] = useState<string | null>(null);

  const fetchCandidate = async () => {
    try {
      const { data } = await api.get(`/admin/candidates/${candidateId}`);
      setCandidate(data.data);
    } catch {
      toast.error('Candidate not found');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidate();
  }, [candidateId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (candidate?.interviews?.[0]?.msTeamsLink) {
      setTeamsLink(candidate.interviews[0].msTeamsLink);
    }
  }, [candidate]);

  const generateTeamsLink = async () => {
    setGeneratingLink(true);
    try {
      const { data } = await api.post(`/admin/candidates/${candidateId}/generate-teams-link`);
      setTeamsLink(data.data.teamsLink);
      toast.success('Teams meeting link generated!');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg || 'Failed to generate Teams link');
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    setStatusChanging(true);
    try {
      await api.patch(`/admin/candidates/${candidateId}/status`, { status });
      await fetchCandidate();
      toast.success('Status updated');
    } catch { toast.error('Failed to update status'); }
    finally { setStatusChanging(false); }
  };

  const addNote = async () => {
    if (!noteText.trim()) return;
    setAddingNote(true);
    try {
      await api.post(`/admin/candidates/${candidateId}/notes`, { note: noteText });
      setNoteText('');
      await fetchCandidate();
      toast.success('Note added');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Failed to add note');
    } finally { setAddingNote(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-brand-600" />
      </div>
    );
  }
  if (!candidate) return null;

  const sc = candidate.systemCheck;
  const ar = candidate.audioRecording;
  const fr = candidate.filterResult;
  const qa = candidate.questionnaireAnswers;

  // Format questionnaire answers for display — skip empty/array-empty/boolean-false values
  const formatQAValue = (v: unknown): string => {
    if (v === null || v === undefined || v === '') return '–';
    if (Array.isArray(v)) return v.length ? v.join(', ') : '–';
    if (typeof v === 'boolean') return v ? 'Yes' : 'No';
    return String(v);
  };
  const qaLabel = (key: string): string =>
    key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()).trim();

  const Section = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-brand-600">{icon}</span>
        <h2 className="text-base font-semibold text-gray-800">{title}</h2>
      </div>
      {children}
    </div>
  );

  const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex items-start justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500 shrink-0 mr-4">{label}</span>
      <span className="text-sm font-medium text-gray-900 text-right">{value}</span>
    </div>
  );

  return (
    <div className="max-w-4xl space-y-5">
      {/* Back + header */}
      <div>
        <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3">
          <ArrowLeft size={16} /> Back to Candidates
        </button>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{candidate.fullName}</h1>
            <p className="text-gray-500 text-sm">{candidate.email} · Applied {format(new Date(candidate.createdAt), 'dd MMM yyyy, HH:mm')}</p>
          </div>
          <span className={`text-sm font-semibold px-3 py-1.5 rounded-full ${STATUS_COLORS[candidate.status]}`}>
            {STATUS_LABELS[candidate.status]}
          </span>
        </div>
      </div>

      {/* Personal Details */}
      <Section title="Personal Information" icon={<FileText size={18} />}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
          <Row label="Phone"    value={candidate.phone} />
          <Row label="Location" value={candidate.location} />
          {candidate.job ? (
            <Row label="Position" value={
              <div className="flex flex-col items-end gap-1">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${DEPT_COLORS[candidate.job.department as keyof typeof DEPT_COLORS] ?? 'bg-gray-100 text-gray-600'}`}>
                  {candidate.job.departmentLabel || DEPT_LABELS[candidate.job.department as keyof typeof DEPT_LABELS] || candidate.job.department}
                </span>
                <span className="text-xs text-gray-500">{candidate.job.title}</span>
              </div>
            } />
          ) : (
            <>
              <Row label="Experience"    value={`${candidate.yearsExperience ?? '–'} year(s)`} />
              <Row label="Shift"         value={candidate.availabilityShift ?? '–'} />
              <Row label="Language"      value={<span className="capitalize">{candidate.selectedLanguage ?? '–'}</span>} />
              <Row label="Certifications" value={candidate.certifications.join(', ') || '–'} />
            </>
          )}
        </div>
        {candidate.vocarooUrl && (
          <div className="mt-4">
            <a href={candidate.vocarooUrl} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 border border-brand-200 hover:bg-brand-50 rounded-lg px-3 py-1.5 transition-colors">
              🎙 Listen to Voice Recording
            </a>
          </div>
        )}
        {candidate.autoDisqualifyReason && (
          <div className="mt-4 bg-rose-50 border border-rose-200 rounded-xl p-3 text-sm text-rose-700">
            <span className="font-semibold">Auto-disqualified:</span> {candidate.autoDisqualifyReason}
          </div>
        )}
        <div className="flex gap-3 mt-4 flex-wrap">
          {candidate.cvUrl && (
            <a href={candidate.cvUrl} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 border border-brand-200 hover:bg-brand-50 rounded-lg px-3 py-1.5 transition-colors">
              <FileText size={14} /> View CV
            </a>
          )}
          {candidate.certificateUrl && (
            <a href={candidate.certificateUrl} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 border border-brand-200 hover:bg-brand-50 rounded-lg px-3 py-1.5 transition-colors">
              <FileText size={14} /> View Certificate
            </a>
          )}
        </div>
      </Section>

      {/* Questionnaire Answers (job-based candidates only) */}
      {qa && Object.keys(qa).length > 0 && (
        <Section title="Screening Questionnaire Answers" icon={<ClipboardList size={18} />}>
          <div className="space-y-0 divide-y divide-gray-50">
            {Object.entries(qa)
              .filter(([, v]) => v !== '' && v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0))
              .map(([key, value]) => (
                <div key={key} className="flex items-start justify-between py-2 gap-4">
                  <span className="text-sm text-gray-500 shrink-0 max-w-[45%]">{qaLabel(key)}</span>
                  <span className="text-sm font-medium text-gray-900 text-right break-words max-w-[55%]">
                    {formatQAValue(value)}
                  </span>
                </div>
              ))}
          </div>
        </Section>
      )}

      {/* System Check */}
      <Section title="System Check" icon={<Monitor size={18} />}>
        {sc ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
            <Row label="Download Speed" value={
              <span className="flex items-center gap-1">
                {sc.downloadSpeed} Mbps
                {sc.downloadSpeed >= 5 ? <CheckCircle size={14} className="text-green-500" /> : <XCircle size={14} className="text-red-500" />}
              </span>
            } />
            <Row label="Upload Speed" value={
              <span className="flex items-center gap-1">
                {sc.uploadSpeed} Mbps
                {sc.uploadSpeed >= 2 ? <CheckCircle size={14} className="text-green-500" /> : <XCircle size={14} className="text-red-500" />}
              </span>
            } />
            <Row label="Microphone" value={sc.micPermitted ? <span className="text-green-600">Granted</span> : <span className="text-red-600">Denied</span>} />
            <Row label="Device" value={`${sc.os} / ${sc.browser} (${sc.deviceType})`} />
            <Row label="Result" value={sc.passed ? <span className="text-green-600 font-semibold">Passed</span> : <span className="text-red-600 font-semibold">Failed</span>} />
          </div>
        ) : <p className="text-sm text-gray-400">No system check data</p>}
      </Section>

      {/* Audio Recording */}
      <Section title="Audio Interview" icon={<Mic size={18} />}>
        {ar ? (
          <div className="space-y-4">
            <audio src={ar.audioUrl} controls className="w-full" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
              <Row label="Fluency Score" value={ar.fluencyScore != null ? `${ar.fluencyScore}%` : '–'} />
              <Row label="Language Detected" value={ar.languageDetected ?? '–'} />
              <Row label="Duration" value={ar.durationSeconds ? `${Math.round(ar.durationSeconds)}s` : '–'} />
              <Row label="Human Review" value={ar.flaggedForHumanReview
                ? <span className="flex items-center gap-1 text-amber-600"><Flag size={14} /> Flagged</span>
                : 'No'} />
            </div>
            {ar.transcript && (
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Whisper Transcript</p>
                <p className="text-sm text-gray-700 leading-relaxed">{ar.transcript}</p>
              </div>
            )}
          </div>
        ) : <p className="text-sm text-gray-400">No audio recording</p>}
      </Section>

      {/* Filter Result */}
      {fr && (
        <Section title="Filter Engine Result" icon={<Wifi size={18} />}>
          <div className="mb-3 flex items-center gap-2">
            {fr.qualified
              ? <><CheckCircle size={18} className="text-green-500" /><span className="font-semibold text-green-700">Qualified</span></>
              : <><AlertTriangle size={18} className="text-red-500" /><span className="font-semibold text-red-700">Not Qualified</span></>}
          </div>
          {fr.rejectionReasons.length > 0 && (
            <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
              {fr.rejectionReasons.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          )}
        </Section>
      )}

      {/* Teams Meeting Link (Admin+, Level 1 Passed only) */}
      {currentUser && ['SUPER_ADMIN', 'ADMIN'].includes(currentUser.role) && candidate.status === 'LEVEL1_PASSED' && (
        <Section title="Microsoft Teams Interview" icon={<Video size={18} />}>
          {teamsLink ? (
            <div className="space-y-3">
              <a
                href={teamsLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition-colors"
              >
                <Video size={15} /> Join Teams Meeting
              </a>
              <p className="text-xs text-gray-400 break-all">{teamsLink}</p>
              <button
                onClick={generateTeamsLink}
                disabled={generatingLink}
                className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 underline"
              >
                {generatingLink ? <Loader2 size={13} className="animate-spin" /> : null}
                Regenerate link
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <button
                onClick={generateTeamsLink}
                disabled={generatingLink}
                className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition-colors"
              >
                {generatingLink ? <Loader2 size={15} className="animate-spin" /> : <Video size={15} />}
                {generatingLink ? 'Generating…' : 'Generate Teams Link'}
              </button>
              <p className="text-sm text-gray-400">No meeting link yet.</p>
            </div>
          )}
        </Section>
      )}

      {/* Manual Status Change (Admin+) */}
      {currentUser && ['SUPER_ADMIN', 'ADMIN'].includes(currentUser.role) && (
        <Section title="Manual Status Override" icon={<Flag size={18} />}>
          <div className="flex items-center gap-3 flex-wrap">
            <select
              defaultValue={candidate.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={statusChanging}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {EDITABLE_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
            {statusChanging && <Loader2 size={16} className="animate-spin text-brand-600" />}
          </div>
        </Section>
      )}

      {/* Internal Notes */}
      <Section title="Internal Notes" icon={<Send size={18} />}>
        <div className="space-y-3 mb-4 max-h-64 overflow-y-auto pr-1">
          {candidate.internalNotes && candidate.internalNotes.length > 0 ? (
            candidate.internalNotes.map((n) => (
              <div key={n.id} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-brand-600">{n.user.name}</span>
                  <span className="text-xs text-gray-400">{format(new Date(n.createdAt), 'dd MMM yyyy, HH:mm')}</span>
                </div>
                <p className="text-sm text-gray-700">{n.note}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-400">No notes yet</p>
          )}
        </div>
        <div className="flex gap-2">
          <input
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && addNote()}
            placeholder="Add an internal note…"
            className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            onClick={addNote}
            disabled={addingNote || !noteText.trim()}
            className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 flex items-center gap-1.5 transition-colors"
          >
            {addingNote ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Add
          </button>
        </div>
      </Section>
    </div>
  );
}
