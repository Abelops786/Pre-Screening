'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import api from '@/lib/api';
import { toast } from 'react-toastify';
import { Loader2, FileText, AlertCircle } from 'lucide-react';
import type { Job } from '@/types';
import { INTERPRETATION_LANGUAGES } from '@/types';

// ── Shared input styles ────────────────────────────────────────
const cls = 'w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition';
const Field = ({ label, error, children, required }: { label: string; error?: string; children: React.ReactNode; required?: boolean }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}{required && ' *'}</label>
    {children}
    {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
  </div>
);
const Radio = ({ name, value, label, checked, onChange }: { name: string; value: string; label: string; checked: boolean; onChange: () => void }) => (
  <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
    <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="accent-brand-600" />
    {label}
  </label>
);
const Checkbox = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) => (
  <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
    <input type="checkbox" checked={checked} onChange={onChange} className="accent-brand-600 rounded" />
    {label}
  </label>
);
const SectionTitle = ({ n, title }: { n: number; title: string }) => (
  <div className="flex items-center gap-3 pt-4 pb-1 border-t border-gray-100 mt-4">
    <span className="w-7 h-7 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center shrink-0">{n}</span>
    <h3 className="text-base font-semibold text-gray-800">{title}</h3>
  </div>
);

// ── AFRICAN COUNTRIES (for Sales disqualifier) ─────────────────
const AFRICAN_COUNTRIES = [
  'Algeria','Angola','Benin','Botswana','Burkina Faso','Burundi','Cabo Verde',
  'Cameroon','Central African Republic','Chad','Comoros','Congo','DR Congo',
  'Djibouti','Egypt','Equatorial Guinea','Eritrea','Eswatini','Ethiopia',
  'Gabon','Gambia','Ghana','Guinea','Guinea-Bissau','Ivory Coast','Kenya',
  'Lesotho','Liberia','Libya','Madagascar','Malawi','Mali','Mauritania',
  'Mauritius','Morocco','Mozambique','Namibia','Niger','Nigeria','Rwanda',
  'São Tomé and Príncipe','Senegal','Seychelles','Sierra Leone','Somalia',
  'South Africa','South Sudan','Sudan','Tanzania','Togo','Tunisia','Uganda',
  'Zambia','Zimbabwe',
];
const BLOCKED_SALES_COUNTRIES = ['jamaica','philippines','egypt'];

// ══════════════════════════════════════════════════════════════
// CUSTOMER SERVICE FORM
// ══════════════════════════════════════════════════════════════
function CustomerServiceForm({ job, onSubmit }: { job: Job; onSubmit: (data: Record<string, unknown>) => Promise<void> }) {
  const [saving, setSaving] = useState(false);
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
  const set = (k: string, v: unknown) => setQ((p) => ({ ...p, [k]: v }));
  const toggle = (k: string, v: string) => setQ((p) => {
    const arr = (p[k] as string[]) || [];
    return { ...p, [k]: arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v] };
  });

  const [basicInfo, setBasicInfo] = useState({ fullName: '', email: '', phone: '', location: '' });
  const setB = (k: string, v: string) => setBasicInfo((p) => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!basicInfo.fullName || !basicInfo.email || !basicInfo.phone || !basicInfo.location) {
      toast.error('Please fill in all required personal information'); return;
    }
    if (!q.vocarooUrl) { toast.error('Voice recording link is required'); return; }
    if (!q.finalConfirm) { toast.error('Please confirm your submission'); return; }
    setSaving(true);
    await onSubmit({ ...basicInfo, questionnaireAnswers: q, vocarooUrl: q.vocarooUrl });
    setSaving(false);
  };

  return (
    <div className="space-y-3">
      <SectionTitle n={1} title="Location & Basic Information" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Full Name" required><input value={basicInfo.fullName} onChange={(e) => setB('fullName', e.target.value)} className={cls} placeholder="John Smith" /></Field>
        <Field label="Email Address" required><input type="email" value={basicInfo.email} onChange={(e) => setB('email', e.target.value)} className={cls} placeholder="john@example.com" /></Field>
        <Field label="Phone / WhatsApp" required><input value={basicInfo.phone} onChange={(e) => setB('phone', e.target.value)} className={cls} placeholder="+1 555 000 0000" /></Field>
        <Field label="City / Country" required><input value={basicInfo.location} onChange={(e) => setB('location', e.target.value)} className={cls} placeholder="New York, USA" /></Field>
      </div>

      <SectionTitle n={2} title="English & Communication Skills" />
      <Field label="English proficiency level">
        <div className="space-y-1.5 mt-1">{['Native','Near-native / Fluent','Intermediate'].map((v) => <Radio key={v} name="eng" value={v} label={v} checked={q.englishProficiency === v} onChange={() => set('englishProficiency', v)} />)}</div>
      </Field>
      <Field label="Worked in an English-speaking environment?">
        <div className="flex gap-6 mt-1">{['Yes','No'].map((v) => <Radio key={v} name="engEnv" value={v} label={v} checked={q.workedEnglishEnv === v} onChange={() => set('workedEnglishEnv', v)} />)}</div>
      </Field>
      <Field label="Comfort speaking with customers all day in English?">
        <div className="space-y-1.5 mt-1">{['Very comfortable','Somewhat comfortable','Not comfortable'].map((v) => <Radio key={v} name="engComfort" value={v} label={v} checked={q.comfortSpeakingEnglish === v} onChange={() => set('comfortSpeakingEnglish', v)} />)}</div>
      </Field>

      <SectionTitle n={3} title="Voice Recording (Mandatory)" />
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <p className="font-semibold mb-2">Please record yourself reading the script below using <a href="https://vocaroo.com" target="_blank" rel="noreferrer" className="underline">Vocaroo.com</a></p>
        <p className="italic text-blue-700 mb-3">"Hello, thank you for calling. My name is Sarah/John, and I'll be happy to assist you today. I understand how important it is to get this resolved as quickly as possible. Let me review your information and see the best way I can help. Thank you for your patience. I truly appreciate it. Please allow me one moment while I check this for you."</p>
        <p className="text-xs">Sound: Friendly · Professional · Natural · Clear · Customer-focused</p>
      </div>
      <Field label="Paste your Vocaroo link here" required>
        <input value={q.vocarooUrl as string} onChange={(e) => set('vocarooUrl', e.target.value)} className={cls} placeholder="https://vocaroo.com/..." />
      </Field>

      <SectionTitle n={4} title="Customer Service Experience" />
      <Field label="Previous customer service experience?">
        <div className="flex gap-6 mt-1">{['Yes','No'].map((v) => <Radio key={v} name="hasCS" value={v} label={v} checked={q.hasCSExperience === v} onChange={() => set('hasCSExperience', v)} />)}</div>
      </Field>
      <Field label="Type of experience (select all that apply)">
        <div className="grid grid-cols-2 gap-1.5 mt-1">{['Call center','Chat support','Email support','Technical support','Appointment scheduling','Billing support','Insurance support','Sales support','Hospitality / Travel','Healthcare support'].map((v) => <Checkbox key={v} label={v} checked={(q.csExperienceTypes as string[]).includes(v)} onChange={() => toggle('csExperienceTypes', v)} />)}</div>
      </Field>
      <Field label="Briefly describe your experience"><textarea rows={3} value={q.csExperienceDesc as string} onChange={(e) => set('csExperienceDesc', e.target.value)} className={cls} /></Field>

      <SectionTitle n={5} title="Customer Handling & Communication" />
      <Field label="How do you handle upset or frustrated customers?"><textarea rows={3} value={q.handleUpsetCustomers as string} onChange={(e) => set('handleUpsetCustomers', e.target.value)} className={cls} /></Field>
      <Field label="Describe a difficult customer issue you solved successfully"><textarea rows={3} value={q.difficultIssueExample as string} onChange={(e) => set('difficultIssueExample', e.target.value)} className={cls} /></Field>
      <Field label="Comfort with repetitive conversations and multitasking?">
        <div className="space-y-1.5 mt-1">{['Very comfortable','Somewhat comfortable','Not comfortable'].map((v) => <Radio key={v} name="repComp" value={v} label={v} checked={q.comfortRepetitive === v} onChange={() => set('comfortRepetitive', v)} />)}</div>
      </Field>

      <SectionTitle n={6} title="Remote Work & Discipline" />
      <Field label="Worked remotely before?">
        <div className="flex gap-6 mt-1">{['Yes','No'].map((v) => <Radio key={v} name="remote" value={v} label={v} checked={q.workedRemotely === v} onChange={() => set('workedRemotely', v)} />)}</div>
      </Field>
      {q.workedRemotely === 'Yes' && <Field label="How did you stay productive working from home?"><textarea rows={3} value={q.remoteProductivity as string} onChange={(e) => set('remoteProductivity', e.target.value)} className={cls} /></Field>}
      <Field label="Comfortable with fixed-schedule remote role with attendance expectations?">
        <div className="flex gap-6 mt-1">{['Yes','No'].map((v) => <Radio key={v} name="fixedSchedule" value={v} label={v} checked={q.comfortFixedSchedule === v} onChange={() => set('comfortFixedSchedule', v)} />)}</div>
      </Field>

      <SectionTitle n={7} title="Coachability & Teamwork" />
      <Field label="How do you respond to supervisor feedback?"><textarea rows={3} value={q.feedbackResponse as string} onChange={(e) => set('feedbackResponse', e.target.value)} className={cls} /></Field>
      <Field label="Comfortable with QA evaluations, attendance tracking, and coaching sessions?">
        <div className="flex gap-6 mt-1">{['Yes','No'].map((v) => <Radio key={v} name="qaComfort" value={v} label={v} checked={q.comfortQATracking === v} onChange={() => set('comfortQATracking', v)} />)}</div>
      </Field>

      <SectionTitle n={8} title="Work Stability & Commitment" />
      <Field label="What are you primarily looking for?">
        <div className="space-y-1.5 mt-1">{['Long-term career opportunity','Temporary job','Additional income','Exploring options'].map((v) => <Radio key={v} name="lookingFor" value={v} label={v} checked={q.lookingFor === v} onChange={() => set('lookingFor', v)} />)}</div>
      </Field>
      <Field label="Why are you interested in changing jobs?"><textarea rows={2} value={q.whyChanging as string} onChange={(e) => set('whyChanging', e.target.value)} className={cls} /></Field>
      <Field label="Can you commit to this role for at least 6 months?">
        <div className="flex gap-6 mt-1">{['Yes','No'].map((v) => <Radio key={v} name="commit6" value={v} label={v} checked={q.commitSixMonths === v} onChange={() => set('commitSixMonths', v)} />)}</div>
      </Field>

      <SectionTitle n={9} title="Schedule & Availability" />
      <Field label="Available to work a fixed full-time schedule?">
        <div className="flex gap-6 mt-1">{['Yes','No'].map((v) => <Radio key={v} name="fullTime" value={v} label={v} checked={q.availableFullTime === v} onChange={() => set('availableFullTime', v)} />)}</div>
      </Field>
      <Field label="Do you currently have another job?">
        <div className="flex gap-6 mt-1">{['Yes','No'].map((v) => <Radio key={v} name="otherJob" value={v} label={v} checked={q.hasOtherJob === v} onChange={() => set('hasOtherJob', v)} />)}</div>
      </Field>
      {q.hasOtherJob === 'Yes' && <Field label="Will it interfere with your assigned schedule?">
        <div className="flex gap-6 mt-1">{['Yes','No'].map((v) => <Radio key={v} name="jobInterf" value={v} label={v} checked={q.otherJobInterference === v} onChange={() => set('otherJobInterference', v)} />)}</div>
      </Field>}
      <Field label="Available to start within 1–2 weeks?">
        <div className="flex gap-6 mt-1">{['Yes','No'].map((v) => <Radio key={v} name="start2w" value={v} label={v} checked={q.availableIn2Weeks === v} onChange={() => set('availableIn2Weeks', v)} />)}</div>
      </Field>
      <Field label="Any upcoming commitments that may affect availability?"><textarea rows={2} value={q.upcomingCommitments as string} onChange={(e) => set('upcomingCommitments', e.target.value)} className={cls} placeholder="Travel, studies, second job, etc." /></Field>

      <SectionTitle n={10} title="Attendance & Reliability" />
      <Field label="Had attendance or punctuality issues in previous jobs?">
        <div className="flex gap-6 mt-1">{['Yes','No'].map((v) => <Radio key={v} name="attendance" value={v} label={v} checked={q.hadAttendanceIssues === v} onChange={() => set('hadAttendanceIssues', v)} />)}</div>
      </Field>
      {q.hadAttendanceIssues === 'Yes' && <Field label="Please explain"><textarea rows={2} value={q.attendanceExplanation as string} onChange={(e) => set('attendanceExplanation', e.target.value)} className={cls} /></Field>}
      <Field label="Backup plan if internet or power goes out during your shift?"><textarea rows={2} value={q.backupPlan as string} onChange={(e) => set('backupPlan', e.target.value)} className={cls} /></Field>

      <SectionTitle n={11} title="Technical Requirements" />
      <div className="grid grid-cols-2 gap-3">
        {[['hasLaptop','Own laptop or desktop?'],['hasHeadset','USB headset?'],['downloadOk','Download speed ≥ 20 Mbps?'],['uploadOk','Upload speed ≥ 10 Mbps?']].map(([k, label]) => (
          <Field key={k} label={label}>
            <div className="flex gap-4 mt-1">{['Yes','No'].map((v) => <Radio key={v} name={k} value={v} label={v} checked={q[k] === v} onChange={() => set(k, v)} />)}</div>
          </Field>
        ))}
      </div>
      <Field label="Describe your workspace (noise, lighting, interruptions)"><textarea rows={2} value={q.workspaceDesc as string} onChange={(e) => set('workspaceDesc', e.target.value)} className={cls} /></Field>

      <SectionTitle n={12} title="Final Confirmation" />
      <div className="bg-gray-50 rounded-xl p-4">
        <Checkbox label="I confirm all information is accurate and I understand this is a structured remote position with attendance, QA, and productivity expectations." checked={q.finalConfirm === 'Yes'} onChange={() => set('finalConfirm', q.finalConfirm === 'Yes' ? '' : 'Yes')} />
      </div>

      <button onClick={handleSubmit} disabled={saving}
        className="w-full mt-4 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold rounded-xl py-3 flex items-center justify-center gap-2 transition-colors">
        {saving ? <><Loader2 size={18} className="animate-spin" /> Submitting…</> : 'Submit Application & Continue →'}
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// SALES FORM
// ══════════════════════════════════════════════════════════════
function SalesForm({ job, onSubmit }: { job: Job; onSubmit: (data: Record<string, unknown>) => Promise<void> }) {
  const [saving, setSaving] = useState(false);
  const [disqualified, setDisqualified] = useState(false);
  const [q, setQ] = useState<Record<string, unknown>>({
    country: '', city: '', isAfrica: false,
    englishProficiency: '', workedEnglishEnv: '', englishExpDesc: '',
    vocarooUrl: '',
    hasCSOrSalesExp: '', experienceTypes: [] as string[], expDesc: '',
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
  const set = (k: string, v: unknown) => setQ((p) => ({ ...p, [k]: v }));
  const toggle = (k: string, v: string) => setQ((p) => {
    const arr = (p[k] as string[]) || [];
    return { ...p, [k]: arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v] };
  });

  const [basicInfo, setBasicInfo] = useState({ fullName: '', email: '', phone: '', location: '' });
  const setB = (k: string, v: string) => setBasicInfo((p) => ({ ...p, [k]: v }));

  const checkCountry = (country: string) => {
    const lc = country.toLowerCase();
    const blocked = BLOCKED_SALES_COUNTRIES.some((c) => lc.includes(c));
    const africa = AFRICAN_COUNTRIES.some((c) => c.toLowerCase() === lc);
    if (blocked || africa) setDisqualified(true);
    else setDisqualified(false);
    set('country', country);
    set('isAfrica', africa);
  };

  const handleSubmit = async () => {
    if (!basicInfo.fullName || !basicInfo.email || !basicInfo.phone) {
      toast.error('Please fill in all required personal information'); return;
    }
    if (!q.vocarooUrl) { toast.error('Voice recording link is required'); return; }
    if (!q.finalConfirm) { toast.error('Please confirm your submission'); return; }
    setSaving(true);
    await onSubmit({ ...basicInfo, location: basicInfo.location || (q.city as string) || '', questionnaireAnswers: { ...q, country: q.country || basicInfo.location }, vocarooUrl: q.vocarooUrl });
    setSaving(false);
  };

  return (
    <div className="space-y-3">
      <SectionTitle n={1} title="Location & Eligibility" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Full Name" required><input value={basicInfo.fullName} onChange={(e) => setB('fullName', e.target.value)} className={cls} /></Field>
        <Field label="Email Address" required><input type="email" value={basicInfo.email} onChange={(e) => setB('email', e.target.value)} className={cls} /></Field>
        <Field label="Phone / WhatsApp" required><input value={basicInfo.phone} onChange={(e) => setB('phone', e.target.value)} className={cls} /></Field>
        <Field label="Country of Residence" required>
          <input value={q.country as string} onChange={(e) => checkCountry(e.target.value)} className={cls} placeholder="e.g. United States" />
        </Field>
        <Field label="City"><input value={q.city as string} onChange={(e) => set('city', e.target.value)} className={cls} /></Field>
      </div>

      {disqualified && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-800">Location Not Eligible</p>
            <p className="text-sm text-red-700 mt-1">We are currently not accepting applications for this campaign from your location. Thank you for your interest.</p>
          </div>
        </div>
      )}

      {!disqualified && <>
        <SectionTitle n={2} title="English & Communication Skills" />
        <Field label="English proficiency level">
          <div className="space-y-1.5 mt-1">{['Native','Near-native / Fluent','Intermediate'].map((v) => <Radio key={v} name="engProf" value={v} label={v} checked={q.englishProficiency === v} onChange={() => set('englishProficiency', v)} />)}</div>
        </Field>
        <Field label="Worked in an English-speaking environment?">
          <div className="flex gap-6 mt-1">{['Yes','No'].map((v) => <Radio key={v} name="engEnv" value={v} label={v} checked={q.workedEnglishEnv === v} onChange={() => set('workedEnglishEnv', v)} />)}</div>
        </Field>
        <Field label="Describe your experience communicating with customers in English"><textarea rows={2} value={q.englishExpDesc as string} onChange={(e) => set('englishExpDesc', e.target.value)} className={cls} /></Field>

        <SectionTitle n={3} title="Voice Recording (Mandatory)" />
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
          <p className="font-semibold mb-2">Record yourself reading the script using <a href="https://vocaroo.com" target="_blank" rel="noreferrer" className="underline">Vocaroo.com</a> — sound friendly, natural, conversational, confident</p>
          <p className="italic text-blue-700">"Hi, is this Mr. Jones? Great, my name is Sarah/John on a recorded line, and I'm calling today because our records indicate that you may qualify for a low cost or even free health insurance plan. Now just to make sure you qualify, I need to confirm that you are still not on Medicare or Medicaid, is that correct? Great, it sounds like you may qualify for health insurance benefits that are typically very low cost, or even free. Let me get you over to a licensed insurance agent so they can go over the benefits with you. One moment please."</p>
        </div>
        <Field label="Paste your Vocaroo link" required>
          <input value={q.vocarooUrl as string} onChange={(e) => set('vocarooUrl', e.target.value)} className={cls} placeholder="https://vocaroo.com/..." />
        </Field>

        <SectionTitle n={4} title="Sales & Customer Service Experience" />
        <Field label="Previous CS or sales experience?">
          <div className="flex gap-6 mt-1">{['Yes','No'].map((v) => <Radio key={v} name="hasSales" value={v} label={v} checked={q.hasCSOrSalesExp === v} onChange={() => set('hasCSOrSalesExp', v)} />)}</div>
        </Field>
        <Field label="Type of experience (select all)">
          <div className="grid grid-cols-2 gap-1.5 mt-1">{['Inbound customer service','Outbound sales','Lead generation','Appointment setting','Membership sales','Travel industry','Collections','Technical support'].map((v) => <Checkbox key={v} label={v} checked={(q.experienceTypes as string[]).includes(v)} onChange={() => toggle('experienceTypes', v)} />)}</div>
        </Field>
        <Field label="Briefly describe your experience"><textarea rows={2} value={q.expDesc as string} onChange={(e) => set('expDesc', e.target.value)} className={cls} /></Field>

        <SectionTitle n={5} title="Sales Targets & Performance" />
        <Field label="Comfortable with performance-driven environment with sales goals and KPIs?">
          <div className="flex gap-6 mt-1">{['Yes','No'].map((v) => <Radio key={v} name="kpiComf" value={v} label={v} checked={q.comfortKPIs === v} onChange={() => set('comfortKPIs', v)} />)}</div>
        </Field>
        <Field label="Worked with these metrics? (select all)">
          <div className="grid grid-cols-2 gap-1.5 mt-1">{['Sales targets','Conversion rate','Call quotas','QA evaluations','Attendance metrics','Productivity metrics'].map((v) => <Checkbox key={v} label={v} checked={(q.metricsUsed as string[]).includes(v)} onChange={() => toggle('metricsUsed', v)} />)}</div>
        </Field>

        <SectionTitle n={6} title="Remote Work & Discipline" />
        <Field label="Worked remotely before?">
          <div className="flex gap-6 mt-1">{['Yes','No'].map((v) => <Radio key={v} name="remoteS" value={v} label={v} checked={q.workedRemotely === v} onChange={() => set('workedRemotely', v)} />)}</div>
        </Field>
        {q.workedRemotely === 'Yes' && <Field label="How did you stay productive at home?"><textarea rows={2} value={q.remoteProductivity as string} onChange={(e) => set('remoteProductivity', e.target.value)} className={cls} /></Field>}
        <Field label="Comfortable with fixed-schedule, monitored remote role?">
          <div className="flex gap-6 mt-1">{['Yes','No'].map((v) => <Radio key={v} name="monitorComp" value={v} label={v} checked={q.comfortMonitored === v} onChange={() => set('comfortMonitored', v)} />)}</div>
        </Field>

        <SectionTitle n={7} title="Sales Mindset & Pressure Tolerance" />
        <Field label="Comfort handling rejection and repetitive conversations?">
          <div className="space-y-1.5 mt-1">{['Very comfortable','Somewhat comfortable','Not comfortable'].map((v) => <Radio key={v} name="rejComp" value={v} label={v} checked={q.comfortRejection === v} onChange={() => set('comfortRejection', v)} />)}</div>
        </Field>
        <Field label={'A customer says "I\'m interested, but I need to think about it." How do you respond?'}>
          <textarea rows={3} value={q.handleObjection as string} onChange={(e) => set('handleObjection', e.target.value)} className={cls} />
        </Field>

        <SectionTitle n={8} title="Coachability" />
        <Field label="How do you respond to supervisor feedback?"><textarea rows={2} value={q.feedbackResponse as string} onChange={(e) => set('feedbackResponse', e.target.value)} className={cls} /></Field>

        <SectionTitle n={9} title="Work Stability" />
        <Field label="What are you primarily looking for?">
          <div className="space-y-1.5 mt-1">{['Long-term career opportunity','Temporary job','Additional income','Exploring options'].map((v) => <Radio key={v} name="lookS" value={v} label={v} checked={q.lookingFor === v} onChange={() => set('lookingFor', v)} />)}</div>
        </Field>

        <SectionTitle n={10} title="Availability" />
        <Field label="Currently have another job?">
          <div className="flex gap-6 mt-1">{['Yes','No'].map((v) => <Radio key={v} name="otherJobS" value={v} label={v} checked={q.hasOtherJob === v} onChange={() => set('hasOtherJob', v)} />)}</div>
        </Field>
        {q.hasOtherJob === 'Yes' && <Field label="Will it interfere with your assigned schedule?">
          <div className="flex gap-6 mt-1">{['Yes','No'].map((v) => <Radio key={v} name="jobIntS" value={v} label={v} checked={q.otherJobInterference === v} onChange={() => set('otherJobInterference', v)} />)}</div>
        </Field>}
        <Field label="Available to start within 1–2 weeks?">
          <div className="flex gap-6 mt-1">{['Yes','No'].map((v) => <Radio key={v} name="start2wS" value={v} label={v} checked={q.availableIn2Weeks === v} onChange={() => set('availableIn2Weeks', v)} />)}</div>
        </Field>
        <Field label="Upcoming commitments affecting availability?"><textarea rows={2} value={q.upcomingCommitments as string} onChange={(e) => set('upcomingCommitments', e.target.value)} className={cls} /></Field>

        <SectionTitle n={11} title="Attendance & Reliability" />
        <Field label="Attendance or punctuality issues in previous jobs?">
          <div className="flex gap-6 mt-1">{['Yes','No'].map((v) => <Radio key={v} name="attS" value={v} label={v} checked={q.hadAttendanceIssues === v} onChange={() => set('hadAttendanceIssues', v)} />)}</div>
        </Field>
        {q.hadAttendanceIssues === 'Yes' && <Field label="Please explain"><textarea rows={2} value={q.attendanceExplanation as string} onChange={(e) => set('attendanceExplanation', e.target.value)} className={cls} /></Field>}
        <Field label="Backup plan if internet/power goes out?"><textarea rows={2} value={q.backupPlan as string} onChange={(e) => set('backupPlan', e.target.value)} className={cls} /></Field>

        <SectionTitle n={12} title="Technical Requirements" />
        <div className="grid grid-cols-2 gap-3">
          {[['hasLaptop','Own laptop or desktop?'],['hasHeadset','USB headset?'],['downloadOk','Download ≥ 20 Mbps?'],['uploadOk','Upload ≥ 10 Mbps?']].map(([k, label]) => (
            <Field key={k} label={label}>
              <div className="flex gap-4 mt-1">{['Yes','No'].map((v) => <Radio key={v} name={k} value={v} label={v} checked={q[k] === v} onChange={() => set(k, v)} />)}</div>
            </Field>
          ))}
        </div>
        <Field label="Describe your workspace"><textarea rows={2} value={q.workspaceDesc as string} onChange={(e) => set('workspaceDesc', e.target.value)} className={cls} /></Field>

        <SectionTitle n={13} title="Final Confirmation" />
        <div className="bg-gray-50 rounded-xl p-4">
          <Checkbox label="I confirm all information is accurate and I understand this is a structured remote position with attendance, QA, and performance expectations." checked={q.finalConfirm === 'Yes'} onChange={() => set('finalConfirm', q.finalConfirm === 'Yes' ? '' : 'Yes')} />
        </div>

        <button onClick={handleSubmit} disabled={saving}
          className="w-full mt-4 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold rounded-xl py-3 flex items-center justify-center gap-2 transition-colors">
          {saving ? <><Loader2 size={18} className="animate-spin" /> Submitting…</> : 'Submit Application & Continue →'}
        </button>
      </>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// INTERPRETATION FORM
// ══════════════════════════════════════════════════════════════
function InterpretationForm({ job, onSubmit }: { job: Job; onSubmit: (data: Record<string, unknown>) => Promise<void> }) {
  const [saving, setSaving] = useState(false);
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
  const set = (k: string, v: unknown) => setQ((p) => ({ ...p, [k]: v }));
  const toggle = (k: string, v: string) => setQ((p) => {
    const arr = (p[k] as string[]) || [];
    return { ...p, [k]: arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v] };
  });

  const [basicInfo, setBasicInfo] = useState({ fullName: '', email: '', phone: '', location: '' });
  const setB = (k: string, v: string) => setBasicInfo((p) => ({ ...p, [k]: v }));

  const isASL = (q.languagePair as string)?.toLowerCase().includes('asl');
  const notRID = isASL && q.ridCertified === 'No';
  const notUSResident = job.positionType === 'US_BASED' && q.residesInUS === 'No';
  const locationDeclined = job.positionType === 'US_BASED' && q.locationComplianceConfirm === 'No';

  const autoDisq = notRID || notUSResident || locationDeclined;

  const handleSubmit = async () => {
    if (!basicInfo.fullName || !basicInfo.email || !basicInfo.phone || !basicInfo.location) {
      toast.error('Please fill in all required personal information'); return;
    }
    if (!q.languagePair) { toast.error('Language pair is required'); return; }
    if (!q.finalConfirm) { toast.error('Please confirm your submission'); return; }
    setSaving(true);
    await onSubmit({ ...basicInfo, questionnaireAnswers: q });
    setSaving(false);
  };

  return (
    <div className="space-y-3">
      {/* Basic info */}
      <SectionTitle n={1} title="Personal Information" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Full Name" required><input value={basicInfo.fullName} onChange={(e) => setB('fullName', e.target.value)} className={cls} /></Field>
        <Field label="Email Address" required><input type="email" value={basicInfo.email} onChange={(e) => setB('email', e.target.value)} className={cls} /></Field>
        <Field label="Phone / WhatsApp" required><input value={basicInfo.phone} onChange={(e) => setB('phone', e.target.value)} className={cls} /></Field>
        <Field label="City / Country" required><input value={basicInfo.location} onChange={(e) => setB('location', e.target.value)} className={cls} /></Field>
      </div>

      {/* Position type — only show if not locked from job */}
      {!job.positionType && <>
        <SectionTitle n={2} title="Position Type" />
        <Field label="Which position are you applying for?">
          <div className="space-y-1.5 mt-1">
            <Radio name="posType" value="us_based" label="U.S.-based position (must reside in the United States)" checked={q.positionType === 'us_based'} onChange={() => set('positionType', 'us_based')} />
            <Radio name="posType" value="international" label="International position (outside the United States)" checked={q.positionType === 'international'} onChange={() => set('positionType', 'international')} />
          </div>
        </Field>
      </>}

      {/* Role type — only show if not locked from job */}
      {!job.roleType && <>
        <SectionTitle n={3} title="Role Type" />
        <Field label="Which type of role are you applying for?">
          <div className="space-y-1.5 mt-1">
            <Radio name="roleType" value="dedicated_hourly" label="Dedicated hourly (fixed schedule)" checked={q.roleType === 'dedicated_hourly'} onChange={() => set('roleType', 'dedicated_hourly')} />
            <Radio name="roleType" value="per_minute" label="Per-minute / on-demand" checked={q.roleType === 'per_minute'} onChange={() => set('roleType', 'per_minute')} />
          </div>
        </Field>
      </>}

      <SectionTitle n={4} title="Language & Qualification" />
      <Field label="Language pair you are applying for" required>
        <select value={q.languagePair as string} onChange={(e) => set('languagePair', e.target.value)} className={cls}>
          <option value="">— Select language —</option>
          {INTERPRETATION_LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
      </Field>
      {isASL && <>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
          ASL roles require a valid certification from the Registry of Interpreters for the Deaf (RID).
        </div>
        <Field label="Do you hold a valid RID certification?">
          <div className="flex gap-6 mt-1">{['Yes','No'].map((v) => <Radio key={v} name="rid" value={v} label={v} checked={q.ridCertified === v} onChange={() => set('ridCertified', v)} />)}</div>
        </Field>
      </>}
      {notRID && <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3"><AlertCircle size={20} className="text-red-500 shrink-0" /><div><p className="font-semibold text-red-800">Certification Required</p><p className="text-sm text-red-700">ASL positions require a valid RID certification. Your application will be submitted but cannot advance without this certification.</p></div></div>}

      <Field label="Proficiency level in each language">
        <div className="space-y-1.5 mt-1">{['Native','Bilingual','Professional working proficiency'].map((v) => <Radio key={v} name="profLevel" value={v} label={v} checked={q.proficiencyLevel === v} onChange={() => set('proficiencyLevel', v)} />)}</div>
      </Field>
      <Field label="Years of professional interpreting experience">
        <input type="number" min="0" value={q.yearsExperience as string} onChange={(e) => set('yearsExperience', e.target.value)} className={cls} />
      </Field>

      <SectionTitle n={5} title="Interpretation Experience" />
      <Field label="Have you interpreted via:">
        <div className="grid grid-cols-2 gap-1.5 mt-1">{['Phone (OPI)','Video (VRI)','Both','Onsite (Face to Face)'].map((v) => <Checkbox key={v} label={v} checked={(q.interpretationModes as string[]).includes(v)} onChange={() => toggle('interpretationModes', v)} />)}</div>
      </Field>
      <Field label="Companies or platforms you've worked with"><textarea rows={2} value={q.companiesWorkedWith as string} onChange={(e) => set('companiesWorkedWith', e.target.value)} className={cls} placeholder="e.g. Language Line, TransPerfect, KUDO…" /></Field>

      <SectionTitle n={6} title="Specialization" />
      <Field label="Fields you've worked in (select all that apply)">
        <div className="grid grid-cols-2 gap-1.5 mt-1">{['Medical','Legal','Financial','Social Services','Emergency','None'].map((v) => <Checkbox key={v} label={v} checked={(q.specializations as string[]).includes(v)} onChange={() => toggle('specializations', v)} />)}</div>
      </Field>
      <Field label="Describe type of assignments handled"><textarea rows={2} value={q.assignmentDesc as string} onChange={(e) => set('assignmentDesc', e.target.value)} className={cls} placeholder="e.g. ICU discharge, court hearings, 911 calls…" /></Field>

      <SectionTitle n={7} title="Certifications" />
      <Field label="Interpreter certifications held (name + issuing body)"><textarea rows={2} value={q.certifications as string} onChange={(e) => set('certifications', e.target.value)} className={cls} placeholder="e.g. CMI-Spanish (NBCMI), CHI (CCHI)…" /></Field>

      {/* U.S.-BASED SECTION */}
      {(q.positionType === 'us_based' || job.positionType === 'US_BASED') && <>
        <SectionTitle n={8} title="U.S.-Based Position Requirements" />
        <Field label="Are you currently residing in the United States?">
          <div className="flex gap-6 mt-1">{['Yes','No'].map((v) => <Radio key={v} name="residesUS" value={v} label={v} checked={q.residesInUS === v} onChange={() => set('residesInUS', v)} />)}</div>
        </Field>
        {notUSResident && <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3"><AlertCircle size={20} className="text-red-500 shrink-0" /><p className="text-sm text-red-700 font-medium">This is a U.S.-based position. You must reside in the United States to apply.</p></div>}
        {q.residesInUS === 'Yes' && <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="City"><input value={q.usCity as string} onChange={(e) => set('usCity', e.target.value)} className={cls} /></Field>
            <Field label="State"><input value={q.usState as string} onChange={(e) => set('usState', e.target.value)} className={cls} /></Field>
          </div>
          <Field label="Internet provider"><input value={q.internetProvider as string} onChange={(e) => set('internetProvider', e.target.value)} className={cls} /></Field>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            <p className="font-semibold mb-1">Location Compliance</p>
            <p>I confirm that I will work from my true physical U.S. location, will not use any tools that mask my location, and understand that verification checks will be conducted.</p>
          </div>
          <Field label="Do you confirm the above?">
            <div className="flex gap-6 mt-1">{['Yes, I confirm','No'].map((v) => <Radio key={v} name="locCompliance" value={v} label={v} checked={q.locationComplianceConfirm === v} onChange={() => set('locationComplianceConfirm', v)} />)}</div>
          </Field>
          <Field label="Internet connection type">
            <div className="space-y-1.5 mt-1">{['Direct home internet connection (ISP-based)','Office/corporate network','Shared or remote desktop environment','I connect through another system or location'].map((v) => <Radio key={v} name="connType" value={v} label={v} checked={q.connectionType === v} onChange={() => set('connectionType', v)} />)}</div>
          </Field>
        </>}
      </>}

      {/* INTERNATIONAL SECTION */}
      {(q.positionType === 'international' || job.positionType === 'INTERNATIONAL') && <>
        <SectionTitle n={8} title="International Position Details" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Country"><input value={q.intlCountry as string} onChange={(e) => set('intlCountry', e.target.value)} className={cls} /></Field>
          <Field label="City"><input value={q.intlCity as string} onChange={(e) => set('intlCity', e.target.value)} className={cls} /></Field>
        </div>
        <Field label="Internet connection type">
          <div className="space-y-1.5 mt-1">{['Direct home internet','Office/corporate network','Shared or remote system'].map((v) => <Radio key={v} name="intlConn" value={v} label={v} checked={q.intlConnectionType === v} onChange={() => set('intlConnectionType', v)} />)}</div>
        </Field>
        <Field label="I confirm I will work from a stable, consistent location supporting uninterrupted service quality">
          <div className="flex gap-6 mt-1">{['Yes','No'].map((v) => <Radio key={v} name="stabConf" value={v} label={v} checked={q.stabilityConfirm === v} onChange={() => set('stabilityConfirm', v)} />)}</div>
        </Field>
      </>}

      <SectionTitle n={9} title="Availability & Commitment" />
      {job.workWindow && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
          <p className="font-semibold">Work Window for This Position</p>
          <p className="mt-1">Our work window is <strong>{job.workWindow}</strong>. Your shift will be assigned based on business needs.</p>
        </div>
      )}
      <Field label="Able to commit to a fixed schedule within this window?">
        <div className="space-y-1.5 mt-1">{['Yes','No','Need to discuss'].map((v) => <Radio key={v} name="schedCommit" value={v} label={v} checked={q.canCommitSchedule === v} onChange={() => set('canCommitSchedule', v)} />)}</div>
      </Field>
      <Field label="Currently have another job?">
        <div className="flex gap-6 mt-1">{['Yes','No'].map((v) => <Radio key={v} name="otherJobI" value={v} label={v} checked={q.hasOtherJob === v} onChange={() => set('hasOtherJob', v)} />)}</div>
      </Field>
      {q.hasOtherJob === 'Yes' && q.roleType === 'dedicated_hourly' && <Field label="Will it interfere with your dedicated schedule?">
        <div className="flex gap-6 mt-1">{['Yes','No'].map((v) => <Radio key={v} name="jobIntI" value={v} label={v} checked={q.otherJobInterference === v} onChange={() => set('otherJobInterference', v)} />)}</div>
      </Field>}
      <Field label="This is a schedule-based role. Do you confirm full commitment to your assigned schedule?">
        <div className="flex gap-6 mt-1">{['Yes','No'].map((v) => <Radio key={v} name="schedFull" value={v} label={v} checked={q.scheduleCommitConfirm === v} onChange={() => set('scheduleCommitConfirm', v)} />)}</div>
      </Field>

      <SectionTitle n={10} title="Readiness to Start" />
      <Field label="Available to complete client assessment and protocol training within 1–2 weeks?">
        <div className="flex gap-6 mt-1">{['Yes','No'].map((v) => <Radio key={v} name="readyAssess" value={v} label={v} checked={q.readyForAssessment === v} onChange={() => set('readyForAssessment', v)} />)}</div>
      </Field>
      <Field label="Any upcoming commitments that may affect your start date?"><textarea rows={2} value={q.upcomingCommitments as string} onChange={(e) => set('upcomingCommitments', e.target.value)} className={cls} placeholder="Study / Travel / Other" /></Field>

      <SectionTitle n={11} title="Technical Requirements" />
      <div className="grid grid-cols-2 gap-3">
        {[['hasLaptop','Own laptop or desktop?'],['hasHeadset','USB headset?'],['downloadOk','Download ≥ 20 Mbps?'],['uploadOk','Upload ≥ 10 Mbps?'],['lowLatency','Latency below 250 ms?'],['hasWebcam','Webcam (min 720p)?']].map(([k, label]) => (
          <Field key={k} label={label}>
            <div className="flex gap-4 mt-1">{['Yes','No'].map((v) => <Radio key={v} name={k} value={v} label={v} checked={q[k] === v} onChange={() => set(k, v)} />)}</div>
          </Field>
        ))}
      </div>
      <Field label="Worked in a fully remote role before?">
        <div className="flex gap-6 mt-1">{['Yes','No'].map((v) => <Radio key={v} name="remoteI" value={v} label={v} checked={q.workedRemoteBefore === v} onChange={() => set('workedRemoteBefore', v)} />)}</div>
      </Field>
      <Field label="Quiet, interruption-free workspace?">
        <div className="flex gap-6 mt-1">{['Yes','No'].map((v) => <Radio key={v} name="quietWS" value={v} label={v} checked={q.hasQuietWorkspace === v} onChange={() => set('hasQuietWorkspace', v)} />)}</div>
      </Field>
      <Field label="Describe your workspace (lighting, background, noise, setup)"><textarea rows={2} value={q.workspaceDesc as string} onChange={(e) => set('workspaceDesc', e.target.value)} className={cls} /></Field>

      <SectionTitle n={12} title="Ethics, Compliance & Real-World Scenarios" />
      <Field label="Familiar with interpreter code of ethics and HIPAA?">
        <div className="space-y-1.5 mt-1">{['Yes, both','Only code of ethics','Only HIPAA','No'].map((v) => <Radio key={v} name="ethics" value={v} label={v} checked={q.familiarWithEthics === v} onChange={() => set('familiarWithEthics', v)} />)}</div>
      </Field>
      <Field label="Describe a situation where you applied confidentiality, impartiality, accuracy, or protected sensitive information"><textarea rows={3} value={q.ethicsScenario as string} onChange={(e) => set('ethicsScenario', e.target.value)} className={cls} /></Field>
      <Field label="Have you ever been asked to omit information or take sides during an interaction? What did you do?"><textarea rows={3} value={q.askedToOmit as string} onChange={(e) => set('askedToOmit', e.target.value)} className={cls} /></Field>

      <SectionTitle n={13} title="Performance & Responsiveness" />
      <Field label="What is the first thing you do when you receive an OPI call?">
        <div className="space-y-1.5 mt-1">{['Introduce myself as the interpreter and follow protocol','Wait for the parties to start speaking','Ask who called first','I\'m not sure'].map((v) => <Radio key={v} name="opiFirst" value={v} label={v} checked={q.firstThingOnOPICall === v} onChange={() => set('firstThingOnOPICall', v)} />)}</div>
      </Field>
      {(q.roleType === 'per_minute' || job.roleType === 'PER_MINUTE') && <Field label="Able to stay available and responsive during peak hours?">
        <div className="flex gap-6 mt-1">{['Yes','No'].map((v) => <Radio key={v} name="peakHours" value={v} label={v} checked={q.availableForPeakHours === v} onChange={() => set('availableForPeakHours', v)} />)}</div>
      </Field>}

      <SectionTitle n={14} title="Final Confirmation" />
      <div className="bg-gray-50 rounded-xl p-4">
        <Checkbox label="I confirm that all information provided is accurate and truthful." checked={q.finalConfirm === 'Yes'} onChange={() => set('finalConfirm', q.finalConfirm === 'Yes' ? '' : 'Yes')} />
      </div>

      <button onClick={handleSubmit} disabled={saving}
        className="w-full mt-4 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold rounded-xl py-3 flex items-center justify-center gap-2 transition-colors">
        {saving ? <><Loader2 size={18} className="animate-spin" /> Submitting…</> : 'Submit Application & Continue →'}
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ROOT PAGE — loads job and renders correct form
// ══════════════════════════════════════════════════════════════
export default function JobApplyPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const router = useRouter();
  const [job,     setJob]     = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api.get(`/jobs/public/${jobId}`)
      .then(({ data }) => setJob(data.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [jobId]);

  const handleSubmit = async (payload: Record<string, unknown>) => {
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
        if (status === 'PENDING' || status === 'SYSTEM_CHECK_FAILED') {
          toast.info('Resuming your application…');
          router.push(`/jobs/${jobId}/system-check?id=${id}`);
        } else {
          toast.info('Your application has already been submitted.');
          router.push(`/jobs/${jobId}/complete`);
        }
        return;
      }
      toast.error(res?.message || 'Submission failed. Please try again.');
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
        {/* Header */}
        <div className="text-center mb-6">
          <Image src="/logo.webp" alt="Logo" width={150} height={44} className="object-contain mx-auto mb-4" />
          <div className="inline-flex items-center gap-2 bg-white/10 text-white rounded-full px-4 py-1.5 text-sm mb-3">
            <FileText size={14} />
            {DEPT_LABELS_MAP[job.department]} Application
          </div>
          <h1 className="text-2xl font-bold text-white">{job.title}</h1>
          {job.description && <p className="text-brand-100 text-sm mt-2 max-w-lg mx-auto">{job.description}</p>}
        </div>

        {/* Form card */}
        <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8">
          {job.department === 'CUSTOMER_SERVICE' && <CustomerServiceForm job={job} onSubmit={handleSubmit} />}
          {job.department === 'SALES'            && <SalesForm job={job} onSubmit={handleSubmit} />}
          {job.department === 'INTERPRETATION'   && <InterpretationForm job={job} onSubmit={handleSubmit} />}
        </div>
      </div>
    </div>
  );
}
