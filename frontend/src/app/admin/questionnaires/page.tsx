'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { toast } from 'react-toastify';
import {
  Loader2, Plus, Trash2, ChevronUp, ChevronDown, Save, RotateCcw, Lock, GripVertical,
} from 'lucide-react';
import type { Department, QuestionnaireTemplate, QSection, QField, QFieldType } from '@/types';

const DEPT_TABS: { key: Department; label: string }[] = [
  { key: 'CUSTOMER_SERVICE', label: 'Customer Service' },
  { key: 'SALES',            label: 'Sales' },
  { key: 'INTERPRETATION',   label: 'Interpretation' },
];

const TYPE_OPTIONS: { value: QFieldType; label: string }[] = [
  { value: 'text',     label: 'Short text' },
  { value: 'textarea', label: 'Long text' },
  { value: 'number',   label: 'Number' },
  { value: 'radio',    label: 'Single choice' },
  { value: 'checkbox', label: 'Multiple choice' },
  { value: 'select',   label: 'Dropdown' },
  { value: 'vocaroo',  label: 'Voice recording link' },
  { value: 'confirm',  label: 'Confirmation checkbox' },
];

const TYPES_WITH_OPTIONS: QFieldType[] = ['radio', 'checkbox', 'select'];

const cls = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500';

let keyCounter = 0;
const genKey = () => `q_${Date.now()}_${++keyCounter}`;

export default function QuestionnairesPage() {
  const [active,   setActive]   = useState<Department>('CUSTOMER_SERVICE');
  const [sections, setSections] = useState<QSection[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [dirty,    setDirty]    = useState(false);

  const load = async (dept: Department) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/questionnaires/${dept}`);
      setSections((data.data.schema as QuestionnaireTemplate['schema']).sections || []);
      setDirty(false);
    } catch { toast.error('Failed to load questionnaire'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(active); }, [active]);

  const mutate = (fn: (draft: QSection[]) => QSection[]) => {
    setSections((prev) => fn(structuredClone(prev)));
    setDirty(true);
  };

  // ── Section ops ──
  const addSection = () => mutate((s) => [...s, { id: `s_${Date.now()}`, title: 'New Section', fields: [] }]);
  const removeSection = (si: number) => {
    if (!confirm('Delete this entire section and its questions?')) return;
    mutate((s) => s.filter((_, i) => i !== si));
  };
  const moveSection = (si: number, dir: -1 | 1) => mutate((s) => {
    const ni = si + dir;
    if (ni < 0 || ni >= s.length) return s;
    [s[si], s[ni]] = [s[ni], s[si]];
    return s;
  });
  const setSectionTitle = (si: number, title: string) => mutate((s) => { s[si].title = title; return s; });

  // ── Field ops ──
  const addField = (si: number) => mutate((s) => {
    s[si].fields.push({ key: genKey(), label: 'New question', type: 'text' });
    return s;
  });
  const removeField = (si: number, fi: number) => mutate((s) => { s[si].fields.splice(fi, 1); return s; });
  const moveField = (si: number, fi: number, dir: -1 | 1) => mutate((s) => {
    const f = s[si].fields; const ni = fi + dir;
    if (ni < 0 || ni >= f.length) return s;
    [f[fi], f[ni]] = [f[ni], f[fi]];
    return s;
  });
  const updateField = (si: number, fi: number, patch: Partial<QField>) => mutate((s) => {
    s[si].fields[fi] = { ...s[si].fields[fi], ...patch };
    return s;
  });

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/questionnaires/${active}`, { schema: { sections } });
      toast.success('Questionnaire saved');
      setDirty(false);
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const reset = async () => {
    if (!confirm('Reset this questionnaire to the built-in default? Your custom changes will be lost.')) return;
    try {
      const { data } = await api.post(`/questionnaires/${active}/reset`);
      setSections(data.data.schema.sections || []);
      setDirty(false);
      toast.success('Reset to default');
    } catch { toast.error('Failed to reset'); }
  };

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Questionnaires</h1>
          <p className="text-sm text-gray-500">Edit the questions candidates answer for each screening type.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={reset}
            className="flex items-center gap-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-50">
            <RotateCcw size={15} /> Reset to default
          </button>
          <button onClick={save} disabled={saving || !dirty}
            className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {dirty ? 'Save Changes' : 'Saved'}
          </button>
        </div>
      </div>

      {/* Department tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {DEPT_TABS.map((t) => (
          <button key={t.key}
            onClick={() => {
              if (dirty && !confirm('You have unsaved changes. Switch anyway?')) return;
              setActive(t.key);
            }}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              active === t.key ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-400">
        Personal info (name, email, phone, location) is always collected automatically as the first step.
        Questions with a <Lock size={11} className="inline" /> are used by automatic screening rules — you can edit the wording but not remove them.
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-brand-600" /></div>
      ) : (
        <div className="space-y-4">
          {sections.map((sec, si) => (
            <div key={sec.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Section header */}
              <div className="flex items-center gap-2 p-4 bg-gray-50 border-b border-gray-100">
                <span className="w-6 h-6 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center shrink-0">{si + 1}</span>
                <input value={sec.title} onChange={(e) => setSectionTitle(si, e.target.value)}
                  className="flex-1 bg-transparent font-semibold text-gray-800 text-sm focus:outline-none focus:bg-white focus:border focus:border-gray-300 rounded px-2 py-1" />
                <button onClick={() => moveSection(si, -1)} disabled={si === 0} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"><ChevronUp size={16} /></button>
                <button onClick={() => moveSection(si, 1)} disabled={si === sections.length - 1} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"><ChevronDown size={16} /></button>
                <button onClick={() => removeSection(si)} className="p-1 text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
              </div>

              {/* Fields */}
              <div className="divide-y divide-gray-50">
                {sec.fields.map((f, fi) => (
                  <FieldEditor key={f.key} field={f} si={si} fi={fi}
                    isFirst={fi === 0} isLast={fi === sec.fields.length - 1}
                    onChange={(patch) => updateField(si, fi, patch)}
                    onMove={(dir) => moveField(si, fi, dir)}
                    onRemove={() => removeField(si, fi)} />
                ))}
                <button onClick={() => addField(si)}
                  className="w-full flex items-center justify-center gap-1.5 py-3 text-sm text-brand-600 hover:bg-brand-50 transition-colors">
                  <Plus size={15} /> Add Question
                </button>
              </div>
            </div>
          ))}

          <button onClick={addSection}
            className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-gray-300 rounded-2xl text-sm text-gray-500 hover:border-brand-400 hover:text-brand-600 transition-colors">
            <Plus size={16} /> Add Section
          </button>
        </div>
      )}
    </div>
  );
}

function FieldEditor({ field, isFirst, isLast, onChange, onMove, onRemove }: {
  field: QField; si: number; fi: number; isFirst: boolean; isLast: boolean;
  onChange: (patch: Partial<QField>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  const hasOptions = TYPES_WITH_OPTIONS.includes(field.type) && field.optionsSource !== 'languages';
  const locked = field.protected;

  const setOption = (oi: number, value: string) => {
    const opts = [...(field.options || [])];
    opts[oi] = value;
    onChange({ options: opts });
  };
  const addOption = () => onChange({ options: [...(field.options || []), 'New option'] });
  const removeOption = (oi: number) => onChange({ options: (field.options || []).filter((_, i) => i !== oi) });

  return (
    <div className="p-4 hover:bg-gray-50/60">
      <div className="flex items-start gap-2">
        <GripVertical size={16} className="text-gray-300 mt-2 shrink-0" />
        <div className="flex-1 space-y-2">
          {/* Label + type row */}
          <div className="flex gap-2 items-center flex-wrap">
            <input value={field.label} onChange={(e) => onChange({ label: e.target.value })}
              className={`${cls} flex-1 min-w-[200px]`} placeholder="Question text" />
            <select value={field.type} onChange={(e) => onChange({ type: e.target.value as QFieldType })}
              disabled={locked}
              className="rounded-lg border border-gray-300 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-gray-100">
              {TYPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            {locked && <span title="Used by automatic screening rules" className="text-amber-500"><Lock size={14} /></span>}
          </div>

          {/* Options editor */}
          {field.optionsSource === 'languages' && (
            <p className="text-xs text-gray-400 italic">Options are the full interpreter language list (managed by the system).</p>
          )}
          {hasOptions && (
            <div className="pl-2 space-y-1.5">
              {(field.options || []).map((opt, oi) => (
                <div key={oi} className="flex gap-2 items-center">
                  <span className="text-gray-300 text-xs">•</span>
                  <input value={opt} onChange={(e) => setOption(oi, e.target.value)}
                    className="flex-1 rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-400" />
                  <button onClick={() => removeOption(oi)} className="text-red-300 hover:text-red-500"><Trash2 size={13} /></button>
                </div>
              ))}
              <button onClick={addOption} className="text-xs text-brand-600 hover:underline flex items-center gap-1 ml-3">
                <Plus size={12} /> Add option
              </button>
            </div>
          )}

          {/* Meta row */}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={!!field.required} onChange={(e) => onChange({ required: e.target.checked })} className="accent-brand-600" />
              Required
            </label>
            {(field.type === 'text' || field.type === 'textarea' || field.type === 'number') && (
              <input value={field.placeholder || ''} onChange={(e) => onChange({ placeholder: e.target.value })}
                placeholder="Placeholder (optional)" className="rounded border border-gray-200 px-2 py-1 text-xs flex-1 max-w-[260px] focus:outline-none" />
            )}
          </div>
        </div>

        {/* Field controls */}
        <div className="flex flex-col gap-0.5 shrink-0">
          <button onClick={() => onMove(-1)} disabled={isFirst} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"><ChevronUp size={14} /></button>
          <button onClick={() => onMove(1)} disabled={isLast} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"><ChevronDown size={14} /></button>
          {!locked && <button onClick={onRemove} className="p-1 text-red-400 hover:text-red-600"><Trash2 size={14} /></button>}
        </div>
      </div>
    </div>
  );
}
