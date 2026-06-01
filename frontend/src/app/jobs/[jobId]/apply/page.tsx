'use client';
import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { toast } from 'react-toastify';
import { Loader2, AlertCircle, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import type { Job } from '@/types';
import { INTERPRETATION_LANGUAGES } from '@/types';

// ── Shared UI helpers ─────────────────────────────────────────
const cls = 'w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition';

const Field = ({ label, error, children, req }: { label: string; error?: string; children: React.ReactNode; req?: boolean }) => (
  <div className="space-y-1">
    <label className="block text-sm font-medium text-gray-700">{label}{req && <span className="text-red-500 ml-0.5">*</span>}</label>
    {children}
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
);

const Radio = ({ name, value, label, checked, onChange }: { name: string; value: string; label: string; checked: boolean; onChange: () => void }) => (
  <label className="flex items-center gap-2.5 cursor-pointer text-sm text-gray-700 hover:text-gray-900">
    <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="accent-brand-600 w-4 h-4" />
    {label}
  </label>
);

const Checkbox = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) => (
  <label className="flex items-center gap-2.5 cursor-pointer text-sm text-gray-700 hover:text-gray-900">
    <input type="checkbox" checked={checked} onChange={onChange} className="accent-brand-600 w-4 h-4 rounded" />
    {label}
  </label>
);

type Section = { title: string; content: React.ReactNode };

// ── Multi-step shell ──────────────────────────────────────────
const STEP_SIZE = 3;

function MultiStepForm({ sections, onSubmit, saving }: {
  sections: Section[];
  onSubmit: () => Promise<void>;
  saving: boolean;
}) {
  const steps = [];
  for (let i = 0; i < sections.length; i += STEP_SIZE) steps.push(sections.slice(i, i + STEP_SIZE));
  const [step, setStep] = useState(0);
  const totalSteps = steps.length;
  const isLast = step === totalSteps - 1;
  const progress = Math.round(((step + 1) / totalSteps) * 100);

  // Global section offset so numbering is continuous across all steps
  const sectionOffset = step * STEP_SIZE;

  return (
    <div className="space-y-5">
      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-gray-500">
          <span>Step {step + 1} of {totalSteps}</span>
          <span>{progress}% complete</span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-brand-600 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
        {/* Step dots */}
        <div className="flex gap-1.5 justify-center pt-1">
          {steps.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i < step ? 'bg-brand-600 w-5' : i === step ? 'bg-brand-600 w-8' : 'bg-gray-200 w-5'}`} />
          ))}
        </div>
      </div>

      {/* Sections for this step */}
      {steps[step].map((section, idx) => {
        const sectionNum = sectionOffset + idx + 1;
        return (
          <div key={sectionNum} className="space-y-4">
            <div className="flex items-center gap-3 pt-2 border-t border-gray-100 first:border-t-0 first:pt-0">
              <span className="w-7 h-7 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                {sectionNum}
              </span>
              <h3 className="text-base font-semibold text-gray-800">{section.title}</h3>
            </div>
            {section.content}
          </div>
        );
      })}

      {/* Navigation */}
      <div className="flex gap-3 pt-4 border-t border-gray-100">
        {step > 0 && (
          <button onClick={() => setStep((s) => s - 1)}
            className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors">
            <ChevronLeft size={16} /> Previous
          </button>
        )}
        <div className="flex-1" />
        {isLast ? (
          <button onClick={onSubmit} disabled={saving}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold rounded-xl px-6 py-2.5 transition-colors">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            {saving ? 'Submitting…' : 'Submit Application'}
          </button>
        ) : (
          <button onClick={() => setStep((s) => s + 1)}
            className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl px-5 py-2.5 text-sm transition-colors">
            Next <ChevronRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// CUSTOMER SERVICE FORM
// ══════════════════════════════════════════════════════════════
function CustomerServiceForm({ onSubmit, saving }: { onSubmit: (d: Record<string, unknown>) => Promise<void>; saving: boolean }) {
  const [info, setInfo] = useState({ fullName: '', email: '', phone: '', location: '' });
  const si = (k: string) => (v: string) => setInfo((p) => ({ ...p, [k]: v }));
  const [q, setQ] = useState<Record<string, unknown>>({
    englishProficiency: '', workedEnglishEnv: '', comfortSpeakingEnglish: '',
    vocarooUrl: '',
    hasCSExperience: '', csExperienceTypes: [] as string[], csExperienceDesc: '',
    handleUpsetCustomers: '', difficultIssueExample: '', comfortRepetitive: '',
    workedRemotely: '', remoteProductivity: '', comfortFixedSchedule: '',
    feedbackResponse: '', comfortQATracking: '',
    lookingFor: '', whyChanging: '', commitSixMonths: '',
    availableFullTime: '', hasOtherJob: '', otherJobInterference: '',
    availableIn2Weeks: '', upcomingCommitments: '',
    hadAttendanceIssues: '', attendanceExplanation: '', backupPlan: '',
    hasLaptop: '', hasHeadset: '', downloadOk: '', uploadOk: '', workspaceDesc: '',
    finalConfirm: '',
  });
  const sq = (k: string, v: unknown) => setQ((p) => ({ ...p, [k]: v }));
  const tg = (k: string, v: string) => setQ((p) => {
    const a = (p[k] as string[]) || [];
    return { ...p, [k]: a.includes(v) ? a.filter((x) => x !== v) : [...a, v] };
  });

  const handleSubmit = async () => {
    if (!info.fullName || !info.email || !info.phone || !info.location) { toast.error('Please fill in all personal information fields'); return; }
    if (!q.vocarooUrl) { toast.error('Voice recording link is required'); return; }
    if (q.finalConfirm !== 'Yes') { toast.error('Please confirm your final declaration'); return; }
    await onSubmit({ ...info, questionnaireAnswers: q, vocarooUrl: q.vocarooUrl });
  };

  const sections: Section[] = [
    {
      title: 'Location & Basic Information',
      content: (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Full Name" req><input value={info.fullName} onChange={(e) => si('fullName')(e.target.value)} className={cls} placeholder="John Smith" /></Field>
          <Field label="Email Address" req><input type="email" value={info.email} onChange={(e) => si('email')(e.target.value)} className={cls} placeholder="john@example.com" /></Field>
          <Field label="Phone / WhatsApp" req><input value={info.phone} onChange={(e) => si('phone')(e.target.value)} className={cls} placeholder="+1 555 000 0000" /></Field>
          <Field label="City / Country" req><input value={info.location} onChange={(e) => si('location')(e.target.value)} className={cls} placeholder="New York, USA" /></Field>
        </div>
      ),
    },
    {
      title: 'English & Communication Skills',
      content: (
        <div className="space-y-4">
          <Field label="English proficiency level">
            <div className="space-y-2 mt-1">{['Native', 'Near-native / Fluent', 'Intermediate'].map((v) => <Radio key={v} name="ep" value={v} label={v} checked={q.englishProficiency === v} onChange={() => sq('englishProficiency', v)} />)}</div>
          </Field>
          <Field label="Worked in an English-speaking environment?">
            <div className="flex gap-6 mt-1">{['Yes', 'No'].map((v) => <Radio key={v} name="wee" value={v} label={v} checked={q.workedEnglishEnv === v} onChange={() => sq('workedEnglishEnv', v)} />)}</div>
          </Field>
          <Field label="Comfort speaking with customers all day in English?">
            <div className="space-y-2 mt-1">{['Very comfortable', 'Somewhat comfortable', 'Not comfortable'].map((v) => <Radio key={v} name="cse" value={v} label={v} checked={q.comfortSpeakingEnglish === v} onChange={() => sq('comfortSpeakingEnglish', v)} />)}</div>
          </Field>
        </div>
      ),
    },
    {
      title: 'Voice Recording (Mandatory)',
      content: (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 space-y-2">
            <p className="font-semibold">Record using <a href="https://vocaroo.com" target="_blank" rel="noreferrer" className="underline">Vocaroo.com</a> — sound friendly, professional, natural, clear, customer-focused</p>
            <p className="italic text-blue-700 text-xs leading-relaxed">"Hello, thank you for calling. My name is Sarah/John, and I'll be happy to assist you today. I understand how important it is to get this resolved as quickly as possible. Let me review your information and see the best way I can help. Thank you for your patience. I truly appreciate it. Please allow me one moment while I check this for you."</p>
          </div>
          <Field label="Paste Vocaroo link here" req><input value={q.vocarooUrl as string} onChange={(e) => sq('vocarooUrl', e.target.value)} className={cls} placeholder="https://vocaroo.com/..." /></Field>
        </div>
      ),
    },
    {
      title: 'Customer Service Experience',
      content: (
        <div className="space-y-4">
          <Field label="Previous customer service experience?">
            <div className="flex gap-6 mt-1">{['Yes', 'No'].map((v) => <Radio key={v} name="hce" value={v} label={v} checked={q.hasCSExperience === v} onChange={() => sq('hasCSExperience', v)} />)}</div>
          </Field>
          <Field label="Type of experience (select all that apply)">
            <div className="grid grid-cols-2 gap-2 mt-1">{['Call center', 'Chat support', 'Email support', 'Technical support', 'Appointment scheduling', 'Billing support', 'Insurance support', 'Sales support', 'Hospitality / Travel', 'Healthcare support'].map((v) => <Checkbox key={v} label={v} checked={(q.csExperienceTypes as string[]).includes(v)} onChange={() => tg('csExperienceTypes', v)} />)}</div>
          </Field>
          <Field label="Briefly describe your experience"><textarea rows={3} value={q.csExperienceDesc as string} onChange={(e) => sq('csExperienceDesc', e.target.value)} className={cls} /></Field>
        </div>
      ),
    },
    {
      title: 'Customer Handling & Communication',
      content: (
        <div className="space-y-4">
          <Field label="How do you handle upset or frustrated customers?"><textarea rows={3} value={q.handleUpsetCustomers as string} onChange={(e) => sq('handleUpsetCustomers', e.target.value)} className={cls} /></Field>
          <Field label="Describe a difficult customer issue you resolved successfully"><textarea rows={3} value={q.difficultIssueExample as string} onChange={(e) => sq('difficultIssueExample', e.target.value)} className={cls} /></Field>
          <Field label="Comfort with repetitive conversations and multitasking?">
            <div className="space-y-2 mt-1">{['Very comfortable', 'Somewhat comfortable', 'Not comfortable'].map((v) => <Radio key={v} name="cr" value={v} label={v} checked={q.comfortRepetitive === v} onChange={() => sq('comfortRepetitive', v)} />)}</div>
          </Field>
        </div>
      ),
    },
    {
      title: 'Remote Work & Discipline',
      content: (
        <div className="space-y-4">
          <Field label="Worked remotely before?">
            <div className="flex gap-6 mt-1">{['Yes', 'No'].map((v) => <Radio key={v} name="wr" value={v} label={v} checked={q.workedRemotely === v} onChange={() => sq('workedRemotely', v)} />)}</div>
          </Field>
          {q.workedRemotely === 'Yes' && <Field label="How did you stay productive working from home?"><textarea rows={3} value={q.remoteProductivity as string} onChange={(e) => sq('remoteProductivity', e.target.value)} className={cls} /></Field>}
          <Field label="Comfortable with fixed-schedule remote role with attendance expectations?">
            <div className="flex gap-6 mt-1">{['Yes', 'No'].map((v) => <Radio key={v} name="cfs" value={v} label={v} checked={q.comfortFixedSchedule === v} onChange={() => sq('comfortFixedSchedule', v)} />)}</div>
          </Field>
        </div>
      ),
    },
    {
      title: 'Coachability & Teamwork',
      content: (
        <div className="space-y-4">
          <Field label="How do you respond to supervisor feedback?"><textarea rows={3} value={q.feedbackResponse as string} onChange={(e) => sq('feedbackResponse', e.target.value)} className={cls} /></Field>
          <Field label="Comfortable with QA evaluations, attendance tracking, productivity monitoring, and coaching sessions?">
            <div className="flex gap-6 mt-1">{['Yes', 'No'].map((v) => <Radio key={v} name="cqa" value={v} label={v} checked={q.comfortQATracking === v} onChange={() => sq('comfortQATracking', v)} />)}</div>
          </Field>
        </div>
      ),
    },
    {
      title: 'Work Stability & Commitment',
      content: (
        <div className="space-y-4">
          <Field label="What are you primarily looking for?">
            <div className="space-y-2 mt-1">{['Long-term career opportunity', 'Temporary job', 'Additional income', 'Exploring options'].map((v) => <Radio key={v} name="lf" value={v} label={v} checked={q.lookingFor === v} onChange={() => sq('lookingFor', v)} />)}</div>
          </Field>
          <Field label="Why are you interested in changing jobs?"><textarea rows={2} value={q.whyChanging as string} onChange={(e) => sq('whyChanging', e.target.value)} className={cls} /></Field>
          <Field label="Can you commit to this role for at least 6 months?">
            <div className="flex gap-6 mt-1">{['Yes', 'No'].map((v) => <Radio key={v} name="c6" value={v} label={v} checked={q.commitSixMonths === v} onChange={() => sq('commitSixMonths', v)} />)}</div>
          </Field>
        </div>
      ),
    },
    {
      title: 'Schedule & Availability',
      content: (
        <div className="space-y-4">
          <Field label="Available for a fixed full-time schedule?">
            <div className="flex gap-6 mt-1">{['Yes', 'No'].map((v) => <Radio key={v} name="aft" value={v} label={v} checked={q.availableFullTime === v} onChange={() => sq('availableFullTime', v)} />)}</div>
          </Field>
          <Field label="Currently have another job?">
            <div className="flex gap-6 mt-1">{['Yes', 'No'].map((v) => <Radio key={v} name="hoj" value={v} label={v} checked={q.hasOtherJob === v} onChange={() => sq('hasOtherJob', v)} />)}</div>
          </Field>
          {q.hasOtherJob === 'Yes' && <Field label="Will it interfere with your assigned schedule?">
            <div className="flex gap-6 mt-1">{['Yes', 'No'].map((v) => <Radio key={v} name="oji" value={v} label={v} checked={q.otherJobInterference === v} onChange={() => sq('otherJobInterference', v)} />)}</div>
          </Field>}
          <Field label="Available to start within 1–2 weeks?">
            <div className="flex gap-6 mt-1">{['Yes', 'No'].map((v) => <Radio key={v} name="a2w" value={v} label={v} checked={q.availableIn2Weeks === v} onChange={() => sq('availableIn2Weeks', v)} />)}</div>
          </Field>
          <Field label="Any upcoming commitments that may affect availability?"><textarea rows={2} value={q.upcomingCommitments as string} onChange={(e) => sq('upcomingCommitments', e.target.value)} className={cls} placeholder="Travel, studies, second job, etc." /></Field>
        </div>
      ),
    },
    {
      title: 'Attendance & Reliability',
      content: (
        <div className="space-y-4">
          <Field label="Attendance or punctuality issues in previous jobs?">
            <div className="flex gap-6 mt-1">{['Yes', 'No'].map((v) => <Radio key={v} name="hai" value={v} label={v} checked={q.hadAttendanceIssues === v} onChange={() => sq('hadAttendanceIssues', v)} />)}</div>
          </Field>
          {q.hadAttendanceIssues === 'Yes' && <Field label="Please explain"><textarea rows={2} value={q.attendanceExplanation as string} onChange={(e) => sq('attendanceExplanation', e.target.value)} className={cls} /></Field>}
          <Field label="Backup plan if internet or power goes out during your shift?"><textarea rows={2} value={q.backupPlan as string} onChange={(e) => sq('backupPlan', e.target.value)} className={cls} /></Field>
        </div>
      ),
    },
    {
      title: 'Technical Requirements',
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {([['hasLaptop', 'Own laptop or desktop?'], ['hasHeadset', 'USB headset?'], ['downloadOk', 'Download ≥ 20 Mbps?'], ['uploadOk', 'Upload ≥ 10 Mbps?']] as [string, string][]).map(([k, lbl]) => (
              <Field key={k} label={lbl}>
                <div className="flex gap-4 mt-1">{['Yes', 'No'].map((v) => <Radio key={v} name={k} value={v} label={v} checked={q[k] === v} onChange={() => sq(k, v)} />)}</div>
              </Field>
            ))}
          </div>
          <Field label="Describe your workspace (noise, lighting, interruptions)"><textarea rows={2} value={q.workspaceDesc as string} onChange={(e) => sq('workspaceDesc', e.target.value)} className={cls} /></Field>
        </div>
      ),
    },
    {
      title: 'Final Confirmation',
      content: (
        <div className="bg-gray-50 rounded-xl p-4">
          <Checkbox label="I confirm all information is accurate and I understand this is a structured remote position with attendance, QA, and productivity expectations." checked={q.finalConfirm === 'Yes'} onChange={() => sq('finalConfirm', q.finalConfirm === 'Yes' ? '' : 'Yes')} />
        </div>
      ),
    },
  ];

  return <MultiStepForm sections={sections} onSubmit={handleSubmit} saving={saving} />;
}

// ══════════════════════════════════════════════════════════════
// SALES FORM
// ══════════════════════════════════════════════════════════════
const BLOCKED_SALES = ['jamaica', 'philippines', 'egypt'];
const AFRICAN_COUNTRIES = ['Algeria','Angola','Benin','Botswana','Burkina Faso','Burundi','Cabo Verde','Cameroon','Central African Republic','Chad','Comoros','Congo','DR Congo','Djibouti','Egypt','Equatorial Guinea','Eritrea','Eswatini','Ethiopia','Gabon','Gambia','Ghana','Guinea','Guinea-Bissau','Ivory Coast','Kenya','Lesotho','Liberia','Libya','Madagascar','Malawi','Mali','Mauritania','Mauritius','Morocco','Mozambique','Namibia','Niger','Nigeria','Rwanda','São Tomé','Senegal','Seychelles','Sierra Leone','Somalia','South Africa','South Sudan','Sudan','Tanzania','Togo','Tunisia','Uganda','Zambia','Zimbabwe'];

function SalesForm({ onSubmit, saving }: { onSubmit: (d: Record<string, unknown>) => Promise<void>; saving: boolean }) {
  const [info, setInfo] = useState({ fullName: '', email: '', phone: '', location: '' });
  const si = (k: string) => (v: string) => setInfo((p) => ({ ...p, [k]: v }));
  const [disq, setDisq] = useState(false);
  const [q, setQ] = useState<Record<string, unknown>>({
    country: '', city: '', isAfrica: false,
    englishProficiency: '', workedEnglishEnv: '', englishExpDesc: '',
    vocarooUrl: '',
    hasExp: '', expTypes: [] as string[], expDesc: '',
    comfortKPIs: '', metricsUsed: [] as string[],
    workedRemotely: '', remoteProductivity: '', comfortMonitored: '',
    comfortRejection: '', handleObjection: '',
    feedbackResponse: '',
    lookingFor: '',
    hasOtherJob: '', otherJobInterference: '', availableIn2Weeks: '', upcomingCommitments: '',
    hadAttendanceIssues: '', attendanceExplanation: '', backupPlan: '',
    hasLaptop: '', hasHeadset: '', downloadOk: '', uploadOk: '', workspaceDesc: '',
    finalConfirm: '',
  });
  const sq = (k: string, v: unknown) => setQ((p) => ({ ...p, [k]: v }));
  const tg = (k: string, v: string) => setQ((p) => {
    const a = (p[k] as string[]) || [];
    return { ...p, [k]: a.includes(v) ? a.filter((x) => x !== v) : [...a, v] };
  });

  const checkCountry = (country: string) => {
    sq('country', country);
    const lc = country.toLowerCase();
    const blocked = BLOCKED_SALES.some((c) => lc.includes(c));
    const africa = AFRICAN_COUNTRIES.some((c) => c.toLowerCase() === lc.trim());
    sq('isAfrica', africa);
    setDisq(blocked || africa);
  };

  const handleSubmit = async () => {
    if (!info.fullName || !info.email || !info.phone) { toast.error('Please fill in all personal information'); return; }
    if (!q.vocarooUrl) { toast.error('Voice recording link is required'); return; }
    if (q.finalConfirm !== 'Yes') { toast.error('Please confirm your final declaration'); return; }
    await onSubmit({ ...info, location: info.location || (q.city as string) || '', questionnaireAnswers: q, vocarooUrl: q.vocarooUrl });
  };

  const sections: Section[] = [
    {
      title: 'Location & Eligibility',
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Full Name" req><input value={info.fullName} onChange={(e) => si('fullName')(e.target.value)} className={cls} /></Field>
            <Field label="Email Address" req><input type="email" value={info.email} onChange={(e) => si('email')(e.target.value)} className={cls} /></Field>
            <Field label="Phone / WhatsApp" req><input value={info.phone} onChange={(e) => si('phone')(e.target.value)} className={cls} /></Field>
            <Field label="Country of Residence" req>
              <input value={q.country as string} onChange={(e) => checkCountry(e.target.value)} className={cls} placeholder="e.g. United States" />
            </Field>
            <Field label="City"><input value={q.city as string} onChange={(e) => sq('city', e.target.value)} className={cls} /></Field>
          </div>
          {disq && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-800">Location Not Eligible</p>
                <p className="text-sm text-red-700 mt-1">We are not currently accepting applications from your location for this campaign. Thank you for your interest.</p>
              </div>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'English & Communication Skills',
      content: (
        <div className="space-y-4">
          <Field label="English proficiency level">
            <div className="space-y-2 mt-1">{['Native', 'Near-native / Fluent', 'Intermediate'].map((v) => <Radio key={v} name="sep" value={v} label={v} checked={q.englishProficiency === v} onChange={() => sq('englishProficiency', v)} />)}</div>
          </Field>
          <Field label="Worked in an English-speaking environment?">
            <div className="flex gap-6 mt-1">{['Yes', 'No'].map((v) => <Radio key={v} name="swee" value={v} label={v} checked={q.workedEnglishEnv === v} onChange={() => sq('workedEnglishEnv', v)} />)}</div>
          </Field>
          <Field label="Describe your experience communicating with customers in English"><textarea rows={3} value={q.englishExpDesc as string} onChange={(e) => sq('englishExpDesc', e.target.value)} className={cls} /></Field>
        </div>
      ),
    },
    {
      title: 'Voice Recording (Mandatory)',
      content: (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 space-y-2">
            <p className="font-semibold">Record using <a href="https://vocaroo.com" target="_blank" rel="noreferrer" className="underline">Vocaroo.com</a> — sound friendly, natural, conversational, confident</p>
            <p className="italic text-blue-700 text-xs leading-relaxed">"Hi, is this Mr. Jones? Great, my name is Sarah/John on a recorded line, and I'm calling today because our records indicate that you may qualify for a low cost or even free health insurance plan. Now just to make sure you qualify, I need to confirm that you are still not on Medicare or Medicaid, is that correct? Great, it sounds like you may qualify for health insurance benefits that are typically very low cost, or even free. Let me get you over to a licensed insurance agent so they can go over the benefits with you. One moment please."</p>
          </div>
          <Field label="Paste Vocaroo link" req><input value={q.vocarooUrl as string} onChange={(e) => sq('vocarooUrl', e.target.value)} className={cls} placeholder="https://vocaroo.com/..." /></Field>
        </div>
      ),
    },
    {
      title: 'Sales & Customer Service Experience',
      content: (
        <div className="space-y-4">
          <Field label="Previous CS or sales experience?">
            <div className="flex gap-6 mt-1">{['Yes', 'No'].map((v) => <Radio key={v} name="she" value={v} label={v} checked={q.hasExp === v} onChange={() => sq('hasExp', v)} />)}</div>
          </Field>
          <Field label="Type of experience (select all)">
            <div className="grid grid-cols-2 gap-2 mt-1">{['Inbound customer service', 'Outbound sales', 'Lead generation', 'Appointment setting', 'Membership sales', 'Travel industry', 'Collections', 'Technical support'].map((v) => <Checkbox key={v} label={v} checked={(q.expTypes as string[]).includes(v)} onChange={() => tg('expTypes', v)} />)}</div>
          </Field>
          <Field label="Briefly describe your experience"><textarea rows={2} value={q.expDesc as string} onChange={(e) => sq('expDesc', e.target.value)} className={cls} /></Field>
        </div>
      ),
    },
    {
      title: 'Sales Targets & Performance',
      content: (
        <div className="space-y-4">
          <Field label="Comfortable working with sales goals and KPIs?">
            <div className="flex gap-6 mt-1">{['Yes', 'No'].map((v) => <Radio key={v} name="skpi" value={v} label={v} checked={q.comfortKPIs === v} onChange={() => sq('comfortKPIs', v)} />)}</div>
          </Field>
          <Field label="Worked with these metrics? (select all)">
            <div className="grid grid-cols-2 gap-2 mt-1">{['Sales targets', 'Conversion rate', 'Call quotas', 'QA evaluations', 'Attendance metrics', 'Productivity metrics'].map((v) => <Checkbox key={v} label={v} checked={(q.metricsUsed as string[]).includes(v)} onChange={() => tg('metricsUsed', v)} />)}</div>
          </Field>
        </div>
      ),
    },
    {
      title: 'Remote Work & Discipline',
      content: (
        <div className="space-y-4">
          <Field label="Worked remotely before?">
            <div className="flex gap-6 mt-1">{['Yes', 'No'].map((v) => <Radio key={v} name="swr" value={v} label={v} checked={q.workedRemotely === v} onChange={() => sq('workedRemotely', v)} />)}</div>
          </Field>
          {q.workedRemotely === 'Yes' && <Field label="How did you stay productive at home?"><textarea rows={2} value={q.remoteProductivity as string} onChange={(e) => sq('remoteProductivity', e.target.value)} className={cls} /></Field>}
          <Field label="Comfortable with fixed-schedule, monitored remote role?">
            <div className="flex gap-6 mt-1">{['Yes', 'No'].map((v) => <Radio key={v} name="scm" value={v} label={v} checked={q.comfortMonitored === v} onChange={() => sq('comfortMonitored', v)} />)}</div>
          </Field>
        </div>
      ),
    },
    {
      title: 'Sales Mindset & Pressure Tolerance',
      content: (
        <div className="space-y-4">
          <Field label="Comfort handling rejection and repetitive conversations?">
            <div className="space-y-2 mt-1">{['Very comfortable', 'Somewhat comfortable', 'Not comfortable'].map((v) => <Radio key={v} name="scr" value={v} label={v} checked={q.comfortRejection === v} onChange={() => sq('comfortRejection', v)} />)}</div>
          </Field>
          <Field label={"A customer says \"I'm interested, but I need to think about it.\" How do you respond?"}>
            <textarea rows={3} value={q.handleObjection as string} onChange={(e) => sq('handleObjection', e.target.value)} className={cls} />
          </Field>
        </div>
      ),
    },
    {
      title: 'Coachability & Work Stability',
      content: (
        <div className="space-y-4">
          <Field label="How do you respond to supervisor feedback?"><textarea rows={3} value={q.feedbackResponse as string} onChange={(e) => sq('feedbackResponse', e.target.value)} className={cls} /></Field>
          <Field label="What are you primarily looking for?">
            <div className="space-y-2 mt-1">{['Long-term career opportunity', 'Temporary job', 'Additional income', 'Exploring options'].map((v) => <Radio key={v} name="slf" value={v} label={v} checked={q.lookingFor === v} onChange={() => sq('lookingFor', v)} />)}</div>
          </Field>
        </div>
      ),
    },
    {
      title: 'Availability',
      content: (
        <div className="space-y-4">
          <Field label="Currently have another job?">
            <div className="flex gap-6 mt-1">{['Yes', 'No'].map((v) => <Radio key={v} name="soj" value={v} label={v} checked={q.hasOtherJob === v} onChange={() => sq('hasOtherJob', v)} />)}</div>
          </Field>
          {q.hasOtherJob === 'Yes' && <Field label="Will it interfere with your schedule?">
            <div className="flex gap-6 mt-1">{['Yes', 'No'].map((v) => <Radio key={v} name="soji" value={v} label={v} checked={q.otherJobInterference === v} onChange={() => sq('otherJobInterference', v)} />)}</div>
          </Field>}
          <Field label="Available to start within 1–2 weeks?">
            <div className="flex gap-6 mt-1">{['Yes', 'No'].map((v) => <Radio key={v} name="sa2w" value={v} label={v} checked={q.availableIn2Weeks === v} onChange={() => sq('availableIn2Weeks', v)} />)}</div>
          </Field>
          <Field label="Any upcoming commitments?"><textarea rows={2} value={q.upcomingCommitments as string} onChange={(e) => sq('upcomingCommitments', e.target.value)} className={cls} /></Field>
        </div>
      ),
    },
    {
      title: 'Attendance, Technical & Final',
      content: (
        <div className="space-y-4">
          <Field label="Attendance or punctuality issues in previous jobs?">
            <div className="flex gap-6 mt-1">{['Yes', 'No'].map((v) => <Radio key={v} name="sai" value={v} label={v} checked={q.hadAttendanceIssues === v} onChange={() => sq('hadAttendanceIssues', v)} />)}</div>
          </Field>
          {q.hadAttendanceIssues === 'Yes' && <Field label="Please explain"><textarea rows={2} value={q.attendanceExplanation as string} onChange={(e) => sq('attendanceExplanation', e.target.value)} className={cls} /></Field>}
          <Field label="Backup plan if internet/power goes out?"><textarea rows={2} value={q.backupPlan as string} onChange={(e) => sq('backupPlan', e.target.value)} className={cls} /></Field>
          <div className="grid grid-cols-2 gap-3">
            {([['hasLaptop', 'Own laptop or desktop?'], ['hasHeadset', 'USB headset?'], ['downloadOk', 'Download ≥ 20 Mbps?'], ['uploadOk', 'Upload ≥ 10 Mbps?']] as [string, string][]).map(([k, lbl]) => (
              <Field key={k} label={lbl}>
                <div className="flex gap-4 mt-1">{['Yes', 'No'].map((v) => <Radio key={v} name={`st-${k}`} value={v} label={v} checked={q[k] === v} onChange={() => sq(k, v)} />)}</div>
              </Field>
            ))}
          </div>
          <Field label="Describe your workspace"><textarea rows={2} value={q.workspaceDesc as string} onChange={(e) => sq('workspaceDesc', e.target.value)} className={cls} /></Field>
          <div className="bg-gray-50 rounded-xl p-4">
            <Checkbox label="I confirm all information is accurate and I understand this is a structured remote position with attendance, QA, and performance expectations." checked={q.finalConfirm === 'Yes'} onChange={() => sq('finalConfirm', q.finalConfirm === 'Yes' ? '' : 'Yes')} />
          </div>
        </div>
      ),
    },
  ];

  return <MultiStepForm sections={sections} onSubmit={handleSubmit} saving={saving} />;
}

// ══════════════════════════════════════════════════════════════
// INTERPRETATION FORM
// ══════════════════════════════════════════════════════════════
function InterpretationForm({ job, onSubmit, saving }: { job: Job; onSubmit: (d: Record<string, unknown>) => Promise<void>; saving: boolean }) {
  const [info, setInfo] = useState({ fullName: '', email: '', phone: '', location: '' });
  const si = (k: string) => (v: string) => setInfo((p) => ({ ...p, [k]: v }));
  const [q, setQ] = useState<Record<string, unknown>>({
    positionType: job.positionType === 'US_BASED' ? 'us_based' : job.positionType === 'INTERNATIONAL' ? 'international' : '',
    roleType: job.roleType === 'DEDICATED_HOURLY' ? 'dedicated_hourly' : job.roleType === 'PER_MINUTE' ? 'per_minute' : '',
    languagePair: '', proficiencyLevel: '', yearsExperience: '',
    interpretationModes: [] as string[], companiesWorkedWith: '',
    specializations: [] as string[], assignmentDesc: '',
    certifications: '', ridCertified: '',
    residesInUS: '', usCity: '', usState: '', internetProvider: '',
    locationComplianceConfirm: '', connectionType: '',
    intlCountry: '', intlCity: '', intlConnectionType: '', stabilityConfirm: '',
    canCommitSchedule: '', hasOtherJob: '', otherJobInterference: '', scheduleCommitConfirm: '',
    readyForAssessment: '', upcomingCommitments: '',
    hasLaptop: '', hasHeadset: '', downloadOk: '', uploadOk: '', lowLatency: '', hasWebcam: '',
    workedRemoteBefore: '', hasQuietWorkspace: '', workspaceDesc: '',
    familiarWithEthics: '', ethicsScenario: '', askedToOmit: '',
    firstThingOnOPICall: '', availableForPeakHours: '',
    finalConfirm: '',
  });
  const sq = useCallback((k: string, v: unknown) => setQ((p) => ({ ...p, [k]: v })), []);
  const tg = (k: string, v: string) => setQ((p) => {
    const a = (p[k] as string[]) || [];
    return { ...p, [k]: a.includes(v) ? a.filter((x) => x !== v) : [...a, v] };
  });

  const isASL = (q.languagePair as string)?.toLowerCase().includes('asl');
  const isUS = q.positionType === 'us_based' || job.positionType === 'US_BASED';
  const isIntl = q.positionType === 'international' || job.positionType === 'INTERNATIONAL';
  const isPM = q.roleType === 'per_minute' || job.roleType === 'PER_MINUTE';

  const handleSubmit = async () => {
    if (!info.fullName || !info.email || !info.phone || !info.location) { toast.error('Please fill in all personal information'); return; }
    if (!q.languagePair) { toast.error('Language pair is required'); return; }
    if (q.finalConfirm !== 'Yes') { toast.error('Please confirm your final declaration'); return; }
    await onSubmit({ ...info, questionnaireAnswers: q });
  };

  // Build section list dynamically — skip sections pre-set by the job
  const sections: Section[] = [
    {
      title: 'Personal Information',
      content: (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Full Name" req><input value={info.fullName} onChange={(e) => si('fullName')(e.target.value)} className={cls} /></Field>
          <Field label="Email Address" req><input type="email" value={info.email} onChange={(e) => si('email')(e.target.value)} className={cls} /></Field>
          <Field label="Phone / WhatsApp" req><input value={info.phone} onChange={(e) => si('phone')(e.target.value)} className={cls} /></Field>
          <Field label="City / Country" req><input value={info.location} onChange={(e) => si('location')(e.target.value)} className={cls} /></Field>
        </div>
      ),
    },
    // Only show if not pre-set by the job
    ...(!job.positionType ? [{
      title: 'Position Type',
      content: (
        <Field label="Which position are you applying for?">
          <div className="space-y-2 mt-1">
            <Radio name="ipt" value="us_based" label="U.S.-based position (must reside in the United States)" checked={q.positionType === 'us_based'} onChange={() => sq('positionType', 'us_based')} />
            <Radio name="ipt" value="international" label="International position (outside the United States)" checked={q.positionType === 'international'} onChange={() => sq('positionType', 'international')} />
          </div>
        </Field>
      ),
    }] : []),
    ...(!job.roleType ? [{
      title: 'Role Type',
      content: (
        <Field label="Which type of role are you applying for?">
          <div className="space-y-2 mt-1">
            <Radio name="irt" value="dedicated_hourly" label="Dedicated hourly (fixed schedule)" checked={q.roleType === 'dedicated_hourly'} onChange={() => sq('roleType', 'dedicated_hourly')} />
            <Radio name="irt" value="per_minute" label="Per-minute / on-demand" checked={q.roleType === 'per_minute'} onChange={() => sq('roleType', 'per_minute')} />
          </div>
        </Field>
      ),
    }] : []),
    {
      title: 'Language & Qualification',
      content: (
        <div className="space-y-4">
          <Field label="Language pair you are applying for" req>
            <select value={q.languagePair as string} onChange={(e) => sq('languagePair', e.target.value)} className={cls}>
              <option value="">— Select language —</option>
              {INTERPRETATION_LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </Field>
          {isASL && (
            <div className="space-y-3">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">ASL roles require a valid RID certification.</div>
              <Field label="Do you hold a valid RID certification?">
                <div className="flex gap-6 mt-1">{['Yes', 'No'].map((v) => <Radio key={v} name="rid" value={v} label={v} checked={q.ridCertified === v} onChange={() => sq('ridCertified', v)} />)}</div>
              </Field>
            </div>
          )}
          <Field label="Proficiency level in each language">
            <div className="space-y-2 mt-1">{['Native', 'Bilingual', 'Professional working proficiency'].map((v) => <Radio key={v} name="ipl" value={v} label={v} checked={q.proficiencyLevel === v} onChange={() => sq('proficiencyLevel', v)} />)}</div>
          </Field>
          <Field label="Years of professional interpreting experience">
            <input type="number" min="0" value={q.yearsExperience as string} onChange={(e) => sq('yearsExperience', e.target.value)} className={cls} />
          </Field>
        </div>
      ),
    },
    {
      title: 'Interpretation Experience',
      content: (
        <div className="space-y-4">
          <Field label="Have you interpreted via:">
            <div className="grid grid-cols-2 gap-2 mt-1">{['Phone (OPI)', 'Video (VRI)', 'Both', 'Onsite (Face to Face)'].map((v) => <Checkbox key={v} label={v} checked={(q.interpretationModes as string[]).includes(v)} onChange={() => tg('interpretationModes', v)} />)}</div>
          </Field>
          <Field label="Companies or platforms you've worked with"><textarea rows={2} value={q.companiesWorkedWith as string} onChange={(e) => sq('companiesWorkedWith', e.target.value)} className={cls} placeholder="e.g. Language Line, TransPerfect…" /></Field>
        </div>
      ),
    },
    {
      title: 'Specialization & Certifications',
      content: (
        <div className="space-y-4">
          <Field label="Fields you've worked in (select all that apply)">
            <div className="grid grid-cols-2 gap-2 mt-1">{['Medical', 'Legal', 'Financial', 'Social Services', 'Emergency', 'None'].map((v) => <Checkbox key={v} label={v} checked={(q.specializations as string[]).includes(v)} onChange={() => tg('specializations', v)} />)}</div>
          </Field>
          <Field label="Describe type of assignments handled"><textarea rows={2} value={q.assignmentDesc as string} onChange={(e) => sq('assignmentDesc', e.target.value)} className={cls} placeholder="e.g. ICU discharge, court hearings, 911 calls…" /></Field>
          <Field label="Interpreter certifications held (name + issuing body)"><textarea rows={2} value={q.certifications as string} onChange={(e) => sq('certifications', e.target.value)} className={cls} placeholder="e.g. CMI-Spanish (NBCMI)…" /></Field>
        </div>
      ),
    },
    // U.S.-based location section
    ...(isUS ? [{
      title: 'U.S. Location & Compliance',
      content: (
        <div className="space-y-4">
          <Field label="Are you currently residing in the United States?">
            <div className="flex gap-6 mt-1">{['Yes', 'No'].map((v) => <Radio key={v} name="rus" value={v} label={v} checked={q.residesInUS === v} onChange={() => sq('residesInUS', v)} />)}</div>
          </Field>
          {q.residesInUS === 'No' && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 font-medium">This is a U.S.-based position. You must reside in the U.S. to qualify.</div>}
          {q.residesInUS === 'Yes' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="City"><input value={q.usCity as string} onChange={(e) => sq('usCity', e.target.value)} className={cls} /></Field>
                <Field label="State"><input value={q.usState as string} onChange={(e) => sq('usState', e.target.value)} className={cls} /></Field>
              </div>
              <Field label="Internet provider"><input value={q.internetProvider as string} onChange={(e) => sq('internetProvider', e.target.value)} className={cls} /></Field>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">I confirm I will work from my true U.S. physical location and will not use any tools that mask my location.</div>
              <Field label="Confirm the above?">
                <div className="flex gap-6 mt-1">{['Yes, I confirm', 'No'].map((v) => <Radio key={v} name="lcc" value={v} label={v} checked={q.locationComplianceConfirm === v} onChange={() => sq('locationComplianceConfirm', v)} />)}</div>
              </Field>
              <Field label="Internet connection type">
                <div className="space-y-2 mt-1">{['Direct home internet (ISP-based)', 'Office/corporate network', 'Shared or remote desktop', 'I connect through another system'].map((v) => <Radio key={v} name="ict" value={v} label={v} checked={q.connectionType === v} onChange={() => sq('connectionType', v)} />)}</div>
              </Field>
            </div>
          )}
        </div>
      ),
    }] : []),
    // International location section
    ...(isIntl ? [{
      title: 'International Location Details',
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Country"><input value={q.intlCountry as string} onChange={(e) => sq('intlCountry', e.target.value)} className={cls} /></Field>
            <Field label="City"><input value={q.intlCity as string} onChange={(e) => sq('intlCity', e.target.value)} className={cls} /></Field>
          </div>
          <Field label="Internet connection type">
            <div className="space-y-2 mt-1">{['Direct home internet', 'Office/corporate network', 'Shared or remote system'].map((v) => <Radio key={v} name="iict" value={v} label={v} checked={q.intlConnectionType === v} onChange={() => sq('intlConnectionType', v)} />)}</div>
          </Field>
          <Field label="I confirm I will work from a stable, consistent location supporting uninterrupted service quality">
            <div className="flex gap-6 mt-1">{['Yes', 'No'].map((v) => <Radio key={v} name="isc" value={v} label={v} checked={q.stabilityConfirm === v} onChange={() => sq('stabilityConfirm', v)} />)}</div>
          </Field>
        </div>
      ),
    }] : []),
    {
      title: 'Availability & Schedule Commitment',
      content: (
        <div className="space-y-4">
          {job.workWindow && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
              <p className="font-semibold">Work Window for This Position</p>
              <p className="mt-1">Our work window is <strong>{job.workWindow}</strong>. Your shift will be assigned based on business needs.</p>
            </div>
          )}
          <Field label="Able to commit to a fixed schedule within this window?">
            <div className="space-y-2 mt-1">{['Yes', 'No', 'Need to discuss'].map((v) => <Radio key={v} name="ics" value={v} label={v} checked={q.canCommitSchedule === v} onChange={() => sq('canCommitSchedule', v)} />)}</div>
          </Field>
          <Field label="Currently have another job?">
            <div className="flex gap-6 mt-1">{['Yes', 'No'].map((v) => <Radio key={v} name="ioj" value={v} label={v} checked={q.hasOtherJob === v} onChange={() => sq('hasOtherJob', v)} />)}</div>
          </Field>
          {q.hasOtherJob === 'Yes' && !isPM && <Field label="Will it interfere with your dedicated schedule?">
            <div className="flex gap-6 mt-1">{['Yes', 'No'].map((v) => <Radio key={v} name="ioji" value={v} label={v} checked={q.otherJobInterference === v} onChange={() => sq('otherJobInterference', v)} />)}</div>
          </Field>}
          <Field label="Do you confirm full commitment to your assigned schedule?">
            <div className="flex gap-6 mt-1">{['Yes', 'No'].map((v) => <Radio key={v} name="iscc" value={v} label={v} checked={q.scheduleCommitConfirm === v} onChange={() => sq('scheduleCommitConfirm', v)} />)}</div>
          </Field>
        </div>
      ),
    },
    {
      title: 'Readiness to Start',
      content: (
        <div className="space-y-4">
          <Field label="Available to complete client assessment and protocol training within 1–2 weeks?">
            <div className="flex gap-6 mt-1">{['Yes', 'No'].map((v) => <Radio key={v} name="ira" value={v} label={v} checked={q.readyForAssessment === v} onChange={() => sq('readyForAssessment', v)} />)}</div>
          </Field>
          <Field label="Any upcoming commitments that may affect your start date?"><textarea rows={2} value={q.upcomingCommitments as string} onChange={(e) => sq('upcomingCommitments', e.target.value)} className={cls} placeholder="Study / Travel / Other" /></Field>
        </div>
      ),
    },
    {
      title: 'Technical Requirements',
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {([['hasLaptop', 'Own laptop or desktop?'], ['hasHeadset', 'USB headset?'], ['downloadOk', 'Download ≥ 20 Mbps?'], ['uploadOk', 'Upload ≥ 10 Mbps?'], ['lowLatency', 'Latency below 250 ms?'], ['hasWebcam', 'Webcam (min 720p)?']] as [string, string][]).map(([k, lbl]) => (
              <Field key={k} label={lbl}>
                <div className="flex gap-4 mt-1">{['Yes', 'No'].map((v) => <Radio key={v} name={`it-${k}`} value={v} label={v} checked={q[k] === v} onChange={() => sq(k, v)} />)}</div>
              </Field>
            ))}
          </div>
          <Field label="Worked fully remotely before?">
            <div className="flex gap-6 mt-1">{['Yes', 'No'].map((v) => <Radio key={v} name="iwrb" value={v} label={v} checked={q.workedRemoteBefore === v} onChange={() => sq('workedRemoteBefore', v)} />)}</div>
          </Field>
          <Field label="Quiet, interruption-free workspace?">
            <div className="flex gap-6 mt-1">{['Yes', 'No'].map((v) => <Radio key={v} name="iqw" value={v} label={v} checked={q.hasQuietWorkspace === v} onChange={() => sq('hasQuietWorkspace', v)} />)}</div>
          </Field>
          <Field label="Describe your workspace"><textarea rows={2} value={q.workspaceDesc as string} onChange={(e) => sq('workspaceDesc', e.target.value)} className={cls} /></Field>
        </div>
      ),
    },
    {
      title: 'Ethics & Compliance',
      content: (
        <div className="space-y-4">
          <Field label="Familiar with interpreter code of ethics and HIPAA?">
            <div className="space-y-2 mt-1">{['Yes, both', 'Only code of ethics', 'Only HIPAA', 'No'].map((v) => <Radio key={v} name="ife" value={v} label={v} checked={q.familiarWithEthics === v} onChange={() => sq('familiarWithEthics', v)} />)}</div>
          </Field>
          <Field label="Describe a situation where you applied confidentiality, impartiality, accuracy, or protected sensitive information"><textarea rows={3} value={q.ethicsScenario as string} onChange={(e) => sq('ethicsScenario', e.target.value)} className={cls} /></Field>
          <Field label="Have you ever been asked to omit information or take sides during an interaction? What did you do?"><textarea rows={3} value={q.askedToOmit as string} onChange={(e) => sq('askedToOmit', e.target.value)} className={cls} /></Field>
        </div>
      ),
    },
    {
      title: 'Performance & Final Confirmation',
      content: (
        <div className="space-y-4">
          <Field label="What is the first thing you do when you receive an OPI call?">
            <div className="space-y-2 mt-1">{['Introduce myself as the interpreter and follow protocol', 'Wait for the parties to start speaking', 'Ask who called first', "I'm not sure"].map((v) => <Radio key={v} name="iopi" value={v} label={v} checked={q.firstThingOnOPICall === v} onChange={() => sq('firstThingOnOPICall', v)} />)}</div>
          </Field>
          {isPM && <Field label="Able to stay available and responsive during peak hours?">
            <div className="flex gap-6 mt-1">{['Yes', 'No'].map((v) => <Radio key={v} name="iph" value={v} label={v} checked={q.availableForPeakHours === v} onChange={() => sq('availableForPeakHours', v)} />)}</div>
          </Field>}
          <div className="bg-gray-50 rounded-xl p-4">
            <Checkbox label="I confirm that all information provided is accurate and truthful." checked={q.finalConfirm === 'Yes'} onChange={() => sq('finalConfirm', q.finalConfirm === 'Yes' ? '' : 'Yes')} />
          </div>
        </div>
      ),
    },
  ];

  return <MultiStepForm sections={sections} onSubmit={handleSubmit} saving={saving} />;
}

// ══════════════════════════════════════════════════════════════
// ROOT PAGE
// ══════════════════════════════════════════════════════════════
export default function JobApplyPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const router    = useRouter();
  const [job,      setJob]     = useState<Job | null>(null);
  const [loading,  setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving,   setSaving]  = useState(false);

  useEffect(() => {
    api.get(`/jobs/public/${jobId}`)
      .then(({ data }) => setJob(data.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [jobId]);

  const handleSubmit = async (payload: Record<string, unknown>) => {
    setSaving(true);
    try {
      const { data } = await api.post(`/candidates/job/${jobId}`, payload);
      const { candidateId, autoDisqualified, reason } = data.data;
      if (autoDisqualified) {
        toast.info(reason || 'Your application has been received.');
        router.push(`/jobs/${jobId}/complete?disqualified=true`);
      } else {
        toast.success('Application submitted!');
        router.push(`/jobs/${jobId}/system-check?id=${candidateId}`);
      }
    } catch (err: unknown) {
      const res = (err as { response?: { data?: { message?: string; data?: { id: string; status: string } } } })?.response?.data;
      if (res?.message === 'already_applied' && res?.data) {
        const { id, status } = res.data;
        toast.info('Resuming your application…');
        if (status === 'PENDING' || status === 'SYSTEM_CHECK_FAILED') {
          router.push(`/jobs/${jobId}/system-check?id=${id}`);
        } else {
          router.push(`/jobs/${jobId}/complete`);
        }
        return;
      }
      toast.error(res?.message || 'Submission failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-brand-700 to-brand-900 flex items-center justify-center">
      <Loader2 size={36} className="animate-spin text-white" />
    </div>
  );

  if (notFound || !job) return (
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-700 to-brand-900 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <Image src="/logo.webp" alt="Logo" width={150} height={44} className="object-contain mx-auto mb-4" unoptimized />
          <div className="inline-flex items-center gap-2 bg-white/10 text-white rounded-full px-4 py-1.5 text-sm mb-3">
            {DEPT_LABELS_MAP[job.department]} Application
          </div>
          <h1 className="text-2xl font-bold text-white">{job.title}</h1>
          {job.description && <p className="text-brand-100 text-sm mt-2 max-w-lg mx-auto">{job.description}</p>}
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8">
          {job.department === 'CUSTOMER_SERVICE' && <CustomerServiceForm onSubmit={handleSubmit} saving={saving} />}
          {job.department === 'SALES'            && <SalesForm onSubmit={handleSubmit} saving={saving} />}
          {job.department === 'INTERPRETATION'   && <InterpretationForm job={job} onSubmit={handleSubmit} saving={saving} />}
        </div>
      </div>
    </div>
  );
}
