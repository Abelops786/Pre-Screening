'use client';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { toast } from 'react-toastify';
import { Loader2, AlertCircle, ChevronLeft, ChevronRight, ChevronDown, Check, Upload } from 'lucide-react';
import type { Job, QSection, QField, QuestionnaireSchema } from '@/types';
import { INTERPRETATION_LANGUAGES } from '@/types';
import { COUNTRY_CODES } from '@/lib/countryCodes';

const cls = 'w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition';
const STEP_SIZE = 3;
// City/Country are collected once in Personal Information; these questionnaire
// fields duplicate that, so they're hidden from the form.
const DUPLICATE_LOCATION_KEYS = new Set(['city', 'country', 'usCity', 'intlCity', 'intlCountry']);

type Answers = Record<string, string | string[]>;

export default function JobApplyPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const router    = useRouter();

  const [job,      setJob]      = useState<Job | null>(null);
  const [schema,   setSchema]   = useState<QuestionnaireSchema | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [step,     setStep]     = useState(0);

  const [info,    setInfo]    = useState({ fullName: '', email: '', phone: '', location: '' });
  const [answers, setAnswers] = useState<Answers>({});
  const [cvFile,   setCvFile]   = useState<File | null>(null);
  const [certFile, setCertFile] = useState<File | null>(null);
  const cvInputRef   = useRef<HTMLInputElement>(null);
  const certInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let dept = '';
    api.get(`/jobs/public/${jobId}`)
      .then(({ data }) => { setJob(data.data); dept = data.data.department; })
      .then(() => api.get(`/questionnaires/public/${dept}`))
      .then(({ data }) => setSchema(data.data.schema))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [jobId]);

  const setInfoField = (k: string) => (v: string) => setInfo((p) => ({ ...p, [k]: v }));
  const setAnswer = (key: string, v: string | string[]) => setAnswers((p) => ({ ...p, [key]: v }));

  // This job is for a fixed language — lock the "language pair" answer to it so
  // candidates can't pick a mismatching language (which then fails the voice test).
  useEffect(() => {
    if (!job?.language || !schema) return;
    const langField = schema.sections.flatMap((s) => s.fields).find((f) => f.optionsSource === 'languages');
    if (langField) setAnswer(langField.key, job.language);
  }, [job, schema]); // eslint-disable-line react-hooks/exhaustive-deps
  const toggleMulti = (key: string, v: string) => setAnswers((p) => {
    const arr = (p[key] as string[]) || [];
    return { ...p, [key]: arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v] };
  });

  // Effective position/role: from the job if pre-set, else from the candidate's answer
  const effPosition = job?.positionType
    || (answers.positionType === 'us_based' ? 'US_BASED' : answers.positionType === 'international' ? 'INTERNATIONAL' : null);
  const effRole = job?.roleType
    || (answers.roleType === 'dedicated_hourly' ? 'DEDICATED_HOURLY' : answers.roleType === 'per_minute' ? 'PER_MINUTE' : null);

  const fieldVisible = (f: QField): boolean => {
    // Admin hid this question — keep it in the schema but don't show candidates.
    if (f.hidden) return false;
    // City/Country are already collected once in Personal Information ("City /
    // Country"), so don't ask for them again in the questionnaire.
    if (DUPLICATE_LOCATION_KEYS.has(f.key)) return false;
    if (f.hideIfJobHas === 'positionType' && job?.positionType) return false;
    if (f.hideIfJobHas === 'roleType' && job?.roleType) return false;
    const s = f.showIf;
    if (!s) return true;
    if (s.jobPositionType) return effPosition === s.jobPositionType;
    if (s.jobRoleType) return effRole === s.jobRoleType;
    if (s.key && s.equals !== undefined) return answers[s.key] === s.equals;
    if (s.key && s.includes !== undefined) return String(answers[s.key] || '').toLowerCase().includes(s.includes);
    return true;
  };

  const visibleFields = (sec: QSection) => sec.fields.filter(fieldVisible);

  const sectionVisible = (sec: QSection): boolean => {
    if (sec.showIf?.jobPositionType && effPosition !== sec.showIf.jobPositionType) return false;
    if (sec.showIf?.jobRoleType && effRole !== sec.showIf.jobRoleType) return false;
    return visibleFields(sec).length > 0;
  };

  // Personal info is always the first section; then the visible dynamic sections
  const dynSections = (schema?.sections || []).filter(sectionVisible);
  const allSections: ({ personal: true } | { personal: false; sec: QSection })[] = [
    { personal: true },
    ...dynSections.map((sec) => ({ personal: false as const, sec })),
  ];

  const steps: typeof allSections[] = [];
  for (let i = 0; i < allSections.length; i += STEP_SIZE) steps.push(allSections.slice(i, i + STEP_SIZE));
  const totalSteps = steps.length || 1;
  const safeStep = Math.min(step, totalSteps - 1);
  const isLast = safeStep === totalSteps - 1;
  const progress = Math.round(((safeStep + 1) / totalSteps) * 100);

  // ── Validation for the current step ──
  const validateStep = (entries: typeof allSections): string | null => {
    for (const item of entries) {
      if (item.personal) {
        if (!info.fullName.trim()) return 'Full name is required';
        if (!info.email.trim()) return 'Email is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(info.email.trim())) return 'Please enter a valid email address';
        if (!info.phone.trim()) return 'Phone is required';
        // The number part (after the dial code) must have at least 6 digits
        if ((info.phone.replace(/^\+\d{1,4}/, '').match(/\d/g) || []).length < 6) return 'Please enter a valid phone number (digits only)';
        if (!info.location.trim()) return 'Location is required';
        if (!cvFile) return 'Please upload your CV / Resume';
      } else {
        for (const f of visibleFields(item.sec)) {
          // Every visible screening question is mandatory — candidates can't skip any.
          const v = answers[f.key];
          if (f.type === 'checkbox') { if (!Array.isArray(v) || v.length === 0) return `"${f.label}" is required`; }
          else if (f.type === 'confirm') { if (v !== 'Yes') return `Please confirm: "${f.label}"`; }
          else if (!v || (typeof v === 'string' && !v.trim())) return `"${f.label}" is required`;
        }
      }
    }
    return null;
  };

  // On step change, jump back to the top so each step starts at its heading.
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [step]);

  const next = () => {
    const err = validateStep(steps[safeStep]);
    if (err) { toast.error(err); return; }
    setStep(safeStep + 1);
  };

  const submit = async () => {
    const err = validateStep(steps[safeStep]);
    if (err) { toast.error(err); return; }
    // full validation across all steps
    const allErr = validateStep(allSections);
    if (allErr) { toast.error(allErr); return; }

    const vocarooField = (schema?.sections || []).flatMap((s) => s.fields).find((f) => f.type === 'vocaroo');
    const vocarooUrl = vocarooField ? (answers[vocarooField.key] as string) : undefined;

    setSaving(true);
    try {
      const { data } = await api.post(`/candidates/job/${jobId}`, {
        ...info,
        questionnaireAnswers: answers,
        vocarooUrl,
      });
      const { candidateId, autoDisqualified, reason } = data.data;

      // Upload CV / certificate (best-effort, non-blocking)
      if (candidateId && (cvFile || certFile)) {
        try {
          const fd = new FormData();
          if (cvFile) fd.append('cv', cvFile);
          if (certFile) fd.append('certificate', certFile);
          await api.post(`/upload/${candidateId}/documents`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        } catch { /* don't block the application on an upload hiccup */ }
      }

      if (autoDisqualified) {
        toast.info(reason || 'Your application has been received.');
        router.push(`/jobs/${jobId}/complete?disqualified=true`);
      } else {
        toast.success('Application submitted!');
        router.push(`/jobs/${jobId}/system-check?id=${candidateId}`);
      }
    } catch (e: unknown) {
      const res = (e as { response?: { data?: { message?: string; error?: string; data?: { id: string; status: string } } } })?.response?.data;
      if (res?.message === 'already_applied' && res?.data) {
        const { id, status } = res.data;
        if (status === 'LEVEL1_PASSED') {
          // Already passed — send them to their interview booking, which shows
          // their existing booking (with the Teams link) or lets them book.
          toast.info('You have already passed — taking you to your interview booking.');
          router.push(`/book/${id}`);
        } else {
          toast.info('Resuming your application…');
          router.push(status === 'PENDING' || status === 'SYSTEM_CHECK_FAILED'
            ? `/jobs/${jobId}/system-check?id=${id}` : `/jobs/${jobId}/complete`);
        }
        return;
      }
      toast.error(res?.error || res?.message || 'Submission failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-brand-700 to-brand-900 flex items-center justify-center">
      <Loader2 size={36} className="animate-spin text-white" />
    </div>
  );

  if (notFound || !job || !schema) return (
    <div className="min-h-screen bg-gradient-to-br from-brand-700 to-brand-900 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl p-8 max-w-sm text-center">
        <AlertCircle size={40} className="text-red-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Position Not Found</h2>
        <p className="text-gray-500 text-sm mb-4">This job posting is no longer available.</p>
        <button onClick={() => router.push('/')} className="bg-brand-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-brand-700">View All Positions</button>
      </div>
    </div>
  );

  const DEPT_LABELS_MAP = { INTERPRETATION: 'Interpretation', SALES: 'Sales', CUSTOMER_SERVICE: 'Customer Service' };
  const deptName = job.departmentLabel || DEPT_LABELS_MAP[job.department];

  // global section numbering offset for the current step
  let runningNumber = safeStep * STEP_SIZE;

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-700 to-brand-900 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <div className="bg-white rounded-xl px-4 py-2.5 shadow-md">
              <Image src="/logo.webp" alt="Logo" width={150} height={44} className="object-contain h-9 w-auto" unoptimized />
            </div>
          </div>
          <div className="inline-flex items-center gap-2 bg-white/10 text-white rounded-full px-4 py-1.5 text-sm mb-3">
            {deptName} Application
          </div>
          <h1 className="text-2xl font-bold text-white">{job.title}</h1>
          {job.description && <p className="text-brand-100 text-sm mt-2 max-w-lg mx-auto">{job.description}</p>}
          <a href="https://careers.gruponoainternational.com" target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1.5 mt-4 text-sm font-medium text-white bg-white/10 hover:bg-white/20 border border-white/30 rounded-lg px-4 py-2 transition-colors">
            View all open positions
          </a>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 space-y-5">
          {/* Progress */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Step {safeStep + 1} of {totalSteps}</span>
              <span>{progress}% complete</span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-brand-600 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {/* Sections for this step */}
          {steps[safeStep]?.map((item) => {
            runningNumber += 1;
            const num = runningNumber;
            return (
              <div key={item.personal ? 'personal' : item.sec.id} className="space-y-4">
                <div className="flex items-center gap-3 pt-2 border-t border-gray-100 first:border-t-0 first:pt-0">
                  <span className="w-7 h-7 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center shrink-0">{num}</span>
                  <h3 className="text-base font-semibold text-gray-800">
                    {item.personal ? 'Personal Information' : item.sec.title}
                  </h3>
                </div>

                {item.personal ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FieldWrap label="Full Name" req><input value={info.fullName} onChange={(e) => setInfoField('fullName')(e.target.value)} className={cls} placeholder="John Smith" /></FieldWrap>
                      <FieldWrap label="Email Address" req><input type="email" value={info.email} onChange={(e) => setInfoField('email')(e.target.value)} className={cls} placeholder="john@example.com" /></FieldWrap>
                      <FieldWrap label="Phone / WhatsApp" req><PhoneInput value={info.phone} onChange={setInfoField('phone')} /></FieldWrap>
                      <FieldWrap label="City / Country" req><input value={info.location} onChange={(e) => setInfoField('location')(e.target.value)} className={cls} placeholder="New York, USA" /></FieldWrap>
                    </div>

                    {/* CV / Certificate uploads */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">CV / Resume <span className="text-red-500">*</span></label>
                        <input ref={cvInputRef} type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden"
                          onChange={(e) => setCvFile(e.target.files?.[0] || null)} />
                        <button type="button" onClick={() => cvInputRef.current?.click()}
                          className="w-full border-2 border-dashed border-gray-300 hover:border-brand-400 hover:bg-gray-50 rounded-xl p-4 text-center transition-colors">
                          <Upload size={20} className="mx-auto text-gray-400 mb-1" />
                          {cvFile ? <span className="text-sm text-green-600 font-medium truncate block">{cvFile.name}</span>
                                  : <><span className="text-sm text-gray-600 block">Click to upload your CV</span><span className="text-xs text-gray-400">PDF or DOCX, max 10MB</span></>}
                        </button>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Certificates (optional)</label>
                        <input ref={certInputRef} type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden"
                          onChange={(e) => setCertFile(e.target.files?.[0] || null)} />
                        <button type="button" onClick={() => certInputRef.current?.click()}
                          className="w-full border-2 border-dashed border-gray-300 hover:border-brand-400 hover:bg-gray-50 rounded-xl p-4 text-center transition-colors">
                          <Upload size={20} className="mx-auto text-gray-400 mb-1" />
                          {certFile ? <span className="text-sm text-green-600 font-medium truncate block">{certFile.name}</span>
                                    : <><span className="text-sm text-gray-600 block">Click to upload certificate</span><span className="text-xs text-gray-400">PDF or DOCX, max 10MB</span></>}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Work-window banner for the interpretation availability section */}
                    {job.workWindow && item.sec.fields.some((f) => f.key === 'canCommitSchedule') && (
                      <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 text-sm text-brand-800">
                        <p className="font-semibold">Work Window for This Position</p>
                        <p className="mt-1">Our work window is <strong>{job.workWindow}</strong>. Your shift will be assigned based on business needs.</p>
                      </div>
                    )}
                    {visibleFields(item.sec).map((f) => (
                      <DynField key={f.key} field={f}
                        value={answers[f.key]}
                        onChange={(v) => setAnswer(f.key, v)}
                        onToggle={(v) => toggleMulti(f.key, v)}
                        lockedLanguage={job.language || undefined} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Navigation */}
          <div className="flex gap-3 pt-4 border-t border-gray-100">
            {safeStep > 0 && (
              <button onClick={() => setStep(safeStep - 1)}
                className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors">
                <ChevronLeft size={16} /> Previous
              </button>
            )}
            <div className="flex-1" />
            {isLast ? (
              <button onClick={submit} disabled={saving}
                className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold rounded-xl px-6 py-2.5 transition-colors">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                {saving ? 'Submitting…' : 'Submit Application'}
              </button>
            ) : (
              <button onClick={next}
                className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl px-5 py-2.5 text-sm transition-colors">
                Next <ChevronRight size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── helpers ──
function FieldWrap({ label, children, req }: { label: string; children: React.ReactNode; req?: boolean }) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">{label}{req && <span className="text-red-500 ml-0.5">*</span>}</label>
      {children}
    </div>
  );
}

// Flag image from flagcdn (renders real flags on every OS, unlike emoji flags)
function Flag({ iso }: { iso: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/24x18/${iso}.png`}
      srcSet={`https://flagcdn.com/48x36/${iso}.png 2x`}
      width={20} height={15} alt=""
      className="rounded-sm shrink-0 object-cover"
    />
  );
}

// Phone input with a flag-based country / area code dropdown. The combined
// value "<dial> <number>" is stored as the candidate's phone.
function PhoneInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const parse = (v: string): { dial: string; num: string } => {
    const m = (v || '').match(/^(\+\d{1,4})\s*(.*)$/);
    if (m) return { dial: m[1], num: m[2] };
    return { dial: '+1', num: v || '' };
  };
  const init = parse(value);
  const initIdx = COUNTRY_CODES.findIndex((c) => c.code === init.dial);
  const [idx,  setIdx]  = useState(initIdx === -1 ? 0 : initIdx);
  const [num,  setNum]  = useState(init.num);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const emit = (i: number, n: string) => onChange(n.trim() ? `${COUNTRY_CODES[i].code} ${n.trim()}` : '');
  const sel = COUNTRY_CODES[idx];

  const q = query.trim().toLowerCase();
  const filtered = q
    ? COUNTRY_CODES.map((c, i) => ({ c, i })).filter(({ c }) => c.label.toLowerCase().includes(q) || c.code.includes(q))
    : COUNTRY_CODES.map((c, i) => ({ c, i }));

  return (
    <div className="flex gap-2">
      <div ref={ref} className="relative">
        <button type="button" onClick={() => { setOpen((o) => !o); setQuery(''); }}
          className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-2.5 py-2.5 text-sm bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500 h-full">
          <Flag iso={sel.iso} />
          <span className="text-gray-700">{sel.code}</span>
          <ChevronDown size={14} className="text-gray-400" />
        </button>
        {open && (
          <div className="absolute z-30 mt-1 w-64 rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden">
            <div className="p-2 border-b border-gray-100">
              <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder="Search country…"
                className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-400" />
            </div>
            <div className="max-h-56 overflow-auto">
              {filtered.length === 0 && <p className="px-3 py-3 text-xs text-gray-400">No matches</p>}
              {filtered.map(({ c, i }) => (
                <button type="button" key={`${c.iso}-${i}`}
                  onClick={() => { setIdx(i); setOpen(false); emit(i, num); }}
                  className={`flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-brand-50 ${i === idx ? 'bg-brand-50' : ''}`}>
                  <Flag iso={c.iso} />
                  <span className="flex-1 text-gray-700 truncate">{c.label}</span>
                  <span className="text-gray-400">{c.code}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <input
        type="tel"
        inputMode="numeric"
        value={num}
        onChange={(e) => {
          // Only digits and basic phone separators — block letters/symbols
          const clean = e.target.value.replace(/[^\d\s()+\-]/g, '');
          setNum(clean);
          emit(idx, clean);
        }}
        className={`${cls} flex-1`}
        placeholder="555 000 0000"
      />
    </div>
  );
}

function DynField({ field, value, onChange, onToggle, lockedLanguage }: {
  field: QField;
  value: string | string[] | undefined;
  onChange: (v: string) => void;
  onToggle: (v: string) => void;
  lockedLanguage?: string;
}) {
  const label = (
    <label className="block text-sm font-medium text-gray-700">
      {field.label}{field.required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
  const optLabel = (o: string) => field.optionLabels?.[o] || o;

  switch (field.type) {
    case 'text':
    case 'number':
      return (
        <div className="space-y-1">{label}
          <input type={field.type === 'number' ? 'number' : 'text'} value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)} className={cls} placeholder={field.placeholder} />
        </div>
      );
    case 'textarea':
      return (
        <div className="space-y-1">{label}
          <textarea rows={3} value={(value as string) || ''} onChange={(e) => onChange(e.target.value)} className={cls} placeholder={field.placeholder} />
        </div>
      );
    case 'select': {
      // For a job with a fixed language, the language field is locked to that
      // language (read-only) instead of offering the full list — so candidates
      // can't pick a different language than the one the voice test assesses.
      if (field.optionsSource === 'languages' && lockedLanguage) {
        return (
          <div className="space-y-1">{label}
            <input value={lockedLanguage} readOnly disabled
              className={`${cls} bg-gray-50 text-gray-600 cursor-not-allowed`} />
            <p className="text-xs text-gray-400">Set by this position — you&apos;re applying for {lockedLanguage}.</p>
          </div>
        );
      }
      const options = field.optionsSource === 'languages' ? INTERPRETATION_LANGUAGES : (field.options || []);
      return (
        <div className="space-y-1">{label}
          <select value={(value as string) || ''} onChange={(e) => onChange(e.target.value)} className={cls}>
            <option value="">— Select —</option>
            {options.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      );
    }
    case 'radio':
      return (
        <div className="space-y-1">{label}
          <div className="space-y-2 mt-1">
            {(field.options || []).map((o) => (
              <label key={o} className="flex items-center gap-2.5 cursor-pointer text-sm text-gray-700">
                <input type="radio" name={field.key} checked={value === o} onChange={() => onChange(o)} className="accent-brand-600 w-4 h-4" />
                {optLabel(o)}
              </label>
            ))}
          </div>
        </div>
      );
    case 'checkbox':
      return (
        <div className="space-y-1">{label}
          <div className="grid grid-cols-2 gap-2 mt-1">
            {(field.options || []).map((o) => (
              <label key={o} className="flex items-center gap-2.5 cursor-pointer text-sm text-gray-700">
                <input type="checkbox" checked={Array.isArray(value) && value.includes(o)} onChange={() => onToggle(o)} className="accent-brand-600 w-4 h-4 rounded" />
                {optLabel(o)}
              </label>
            ))}
          </div>
        </div>
      );
    case 'vocaroo':
      return (
        <div className="space-y-3">
          <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 text-sm text-brand-800 space-y-2">
            {field.guidance && <p className="font-semibold">Record using <a href="https://vocaroo.com" target="_blank" rel="noreferrer" className="underline">Vocaroo.com</a> — {field.guidance}</p>}
            {field.script && <p className="italic text-brand-700 text-xs leading-relaxed">&ldquo;{field.script}&rdquo;</p>}
          </div>
          <div className="space-y-1">{label}
            <input value={(value as string) || ''} onChange={(e) => onChange(e.target.value)} className={cls} placeholder="https://vocaroo.com/..." />
          </div>
        </div>
      );
    case 'confirm':
      return (
        <div className="bg-gray-50 rounded-xl p-4">
          <label className="flex items-start gap-2.5 cursor-pointer text-sm text-gray-700">
            <input type="checkbox" checked={value === 'Yes'} onChange={(e) => onChange(e.target.checked ? 'Yes' : '')} className="accent-brand-600 w-4 h-4 rounded mt-0.5" />
            <span>{field.label}{field.required && <span className="text-red-500 ml-0.5">*</span>}</span>
          </label>
        </div>
      );
    default:
      return null;
  }
}
