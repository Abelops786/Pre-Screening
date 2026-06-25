'use client';
import { useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import { toast } from 'react-toastify';
import {
  Loader2, Plus, Trash2, ChevronUp, ChevronDown, Save, RotateCcw, Lock, Unlock, GripVertical, Star, Copy, Eye, EyeOff,
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
  // Holds a copied questionnaire to drop into the next department we switch to.
  const pendingCopy = useRef<QSection[] | null>(null);

  const load = async (dept: Department) => {
    // If a "duplicate to" is pending, use the copy instead of loading from the API.
    if (pendingCopy.current) {
      setSections(pendingCopy.current);
      pendingCopy.current = null;
      setDirty(true);
      setLoading(false);
      return;
    }
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
  // Clone a question (fresh key, never inherits the system "protected" flag or
  // the important mark) and drop it in right after the original.
  const duplicateField = (si: number, fi: number) => mutate((s) => {
    const orig = s[si].fields[fi];
    const copy: QField = { ...structuredClone(orig), key: genKey(), protected: false, important: false, importantWeight: undefined, correctAnswer: undefined, locked: false, label: `${orig.label} (copy)` };
    s[si].fields.splice(fi + 1, 0, copy);
    return s;
  });

  // Copy the whole questionnaire. To another department → opens it there to
  // review + Save. To the SAME department → appends a duplicate set of all its
  // sections/questions (review and trim/save).
  const duplicateQuestionnaire = (target: Department) => {
    const targetLabel = DEPT_TABS.find((d) => d.key === target)?.label;
    const copy = structuredClone(sections).map((sec) => ({
      ...sec,
      id: `s_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      fields: sec.fields.map((f) => ({ ...f, key: genKey() })),
    }));
    if (target === active) {
      if (!confirm(`Add a duplicate copy of all sections/questions into this "${targetLabel}" questionnaire?`)) return;
      setSections((prev) => [...prev, ...copy]);
      setDirty(true);
    } else {
      if (!confirm(`Copy this questionnaire into "${targetLabel}"? You'll be taken there to review and Save — it replaces what's currently set for that department once you Save.`)) return;
      pendingCopy.current = copy;
      setActive(target);
    }
  };

  // Up to 3 questions can be marked "important" (carry score weight + correct answer)
  const importantCount = sections.reduce((n, s) => n + s.fields.filter((f) => f.important).length, 0);
  const toggleImportant = (si: number, fi: number) => {
    const f = sections[si].fields[fi];
    if (!f.important && importantCount >= 3) {
      toast.error('You can mark at most 3 questions as important.');
      return;
    }
    if (f.important) {
      updateField(si, fi, { important: false });
    } else {
      const firstOption = f.options?.[0];
      updateField(si, fi, {
        important: true,
        importantWeight: f.importantWeight ?? 10,
        correctAnswer: f.correctAnswer ?? (f.type === 'confirm' ? 'Yes' : firstOption ?? ''),
      });
    }
  };

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
        <div className="flex gap-2 flex-wrap">
          <select value="" onChange={(e) => { if (e.target.value) duplicateQuestionnaire(e.target.value as Department); }}
            title="Copy this whole questionnaire into another department"
            className="flex items-center gap-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500">
            <option value="">Duplicate to…</option>
            {DEPT_TABS.map((d) => <option key={d.key} value={d.key}>{d.label}{d.key === active ? ' (same — append copy)' : ''}</option>)}
          </select>
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
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs text-amber-800 flex items-center gap-2">
        <Star size={14} className="fill-amber-400 text-amber-400 shrink-0" />
        Mark up to <strong>3 important questions</strong> — each gets a score weight and a correct answer that counts toward passing.
        <span className="ml-auto font-semibold whitespace-nowrap">{importantCount} / 3 used</span>
      </div>

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
                    onRemove={() => removeField(si, fi)}
                    onDuplicate={() => duplicateField(si, fi)}
                    onToggleImportant={() => toggleImportant(si, fi)} />
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

          {/* Save button at the bottom too, so long questionnaires don't need scrolling up */}
          <div className="flex justify-end pt-2">
            <button onClick={save} disabled={saving || !dirty}
              className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-5 py-2.5 transition-colors">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {dirty ? 'Save Changes' : 'Saved'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FieldEditor({ field, isFirst, isLast, onChange, onMove, onRemove, onDuplicate, onToggleImportant }: {
  field: QField; si: number; fi: number; isFirst: boolean; isLast: boolean;
  onChange: (patch: Partial<QField>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onToggleImportant: () => void;
}) {
  const hasOptions = TYPES_WITH_OPTIONS.includes(field.type) && field.optionsSource !== 'languages';
  // System-protected (screening rules) OR admin-locked → can't edit/remove.
  const locked = field.protected || field.locked;
  // Possible answers for the "correct answer" picker
  const answerChoices = field.type === 'confirm' ? ['Yes']
    : (field.optionsSource === 'languages' ? [] : (field.options || []));

  const setOption = (oi: number, value: string) => {
    const opts = [...(field.options || [])];
    opts[oi] = value;
    onChange({ options: opts });
  };
  const addOption = () => onChange({ options: [...(field.options || []), 'New option'] });
  const removeOption = (oi: number) => onChange({ options: (field.options || []).filter((_, i) => i !== oi) });

  const setOptionScore = (opt: string, value: string) => {
    const scores = { ...(field.optionScores || {}) };
    if (value === '') delete scores[opt];
    else scores[opt] = Number(value);
    onChange({ optionScores: scores });
  };
  const scorable = ['radio', 'select', 'checkbox'].includes(field.type);

  return (
    <div className="p-4 hover:bg-gray-50/60">
      <div className="flex items-start gap-2">
        <GripVertical size={16} className="text-gray-300 mt-2 shrink-0" />
        <div className="flex-1 space-y-2">
          {/* Label + type row */}
          <div className="flex gap-2 items-center flex-wrap">
            <input value={field.label} disabled={locked} onChange={(e) => onChange({ label: e.target.value })}
              className={`${cls} flex-1 min-w-[200px] disabled:bg-gray-100 disabled:text-gray-500`} placeholder="Question text" />
            <select value={field.type} onChange={(e) => onChange({ type: e.target.value as QFieldType })}
              disabled={locked}
              className="rounded-lg border border-gray-300 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-gray-100">
              {TYPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            {field.protected && <span title="Used by automatic screening rules" className="text-amber-500"><Lock size={14} /></span>}
            {field.locked && !field.protected && <span title="Locked (unlock to edit)" className="text-gray-500"><Lock size={14} /></span>}
            {field.hidden && <span className="text-[11px] font-medium bg-gray-200 text-gray-600 rounded-full px-2 py-0.5">Hidden</span>}
          </div>

          {/* Options editor */}
          {field.optionsSource === 'languages' && (
            <p className="text-xs text-gray-400 italic">Options are the full interpreter language list (managed by the system).</p>
          )}
          {hasOptions && (
            <div className="pl-2 space-y-1.5">
              {scorable && (
                <p className="text-[11px] text-gray-400 ml-3">Set points per answer (right box) to make this question count toward the score.</p>
              )}
              {(field.options || []).map((opt, oi) => (
                <div key={oi} className="flex gap-2 items-center">
                  <span className="text-gray-300 text-xs">•</span>
                  <input value={opt} disabled={locked} onChange={(e) => setOption(oi, e.target.value)}
                    className="flex-1 rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-400 disabled:bg-gray-100" />
                  {scorable && (
                    <input type="number" value={field.optionScores?.[opt] ?? ''} onChange={(e) => setOptionScore(opt, e.target.value)}
                      title="Points for this answer" placeholder="pts"
                      className="w-14 rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-400" />
                  )}
                  {!locked && <button onClick={() => removeOption(oi)} className="text-red-300 hover:text-red-500"><Trash2 size={13} /></button>}
                </div>
              ))}
              {!locked && (
                <button onClick={addOption} className="text-xs text-brand-600 hover:underline flex items-center gap-1 ml-3">
                  <Plus size={12} /> Add option
                </button>
              )}
            </div>
          )}

          {/* Meta row */}
          <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={!!field.required} disabled={locked} onChange={(e) => onChange({ required: e.target.checked })} className="accent-brand-600" />
              Required
            </label>
            {field.type === 'confirm' && (
              <label className="flex items-center gap-1.5">
                Points if confirmed:
                <input type="number" value={field.score ?? ''} onChange={(e) => onChange({ score: e.target.value === '' ? undefined : Number(e.target.value) })}
                  className="w-16 rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-400" />
              </label>
            )}
            {(field.type === 'text' || field.type === 'textarea' || field.type === 'number') && (
              <input value={field.placeholder || ''} onChange={(e) => onChange({ placeholder: e.target.value })}
                placeholder="Placeholder (optional)" className="rounded border border-gray-200 px-2 py-1 text-xs flex-1 max-w-[260px] focus:outline-none" />
            )}
          </div>

          {/* Important question config */}
          {field.important && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-800">
                <Star size={13} className="fill-amber-400 text-amber-400" /> Important question
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
                <label className="flex items-center gap-1.5">
                  Score weight:
                  <input type="number" min="1" value={field.importantWeight ?? ''} onChange={(e) => onChange({ importantWeight: e.target.value === '' ? undefined : Number(e.target.value) })}
                    className="w-16 rounded border border-gray-300 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-400" />
                </label>
                <label className="flex items-center gap-1.5">
                  Correct answer:
                  {answerChoices.length > 0 ? (
                    <select value={field.correctAnswer ?? ''} onChange={(e) => onChange({ correctAnswer: e.target.value })}
                      className="rounded border border-gray-300 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-400 max-w-[220px]">
                      <option value="">— Select —</option>
                      {answerChoices.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input value={field.correctAnswer ?? ''} onChange={(e) => onChange({ correctAnswer: e.target.value })}
                      placeholder="expected answer" className="rounded border border-gray-300 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-400 max-w-[220px]" />
                  )}
                </label>
              </div>
              <p className="text-[11px] text-amber-700">Candidates earn these points only when their answer matches the correct answer.</p>
            </div>
          )}
        </div>

        {/* Field controls */}
        <div className="flex flex-col gap-0.5 shrink-0">
          <button onClick={onToggleImportant} title={field.important ? 'Unmark important' : 'Mark as important'}
            className={`p-1 ${field.important ? 'text-amber-500' : 'text-gray-300 hover:text-amber-400'}`}>
            <Star size={15} className={field.important ? 'fill-amber-400' : ''} />
          </button>
          {!field.protected && (
            <button onClick={() => onChange({ locked: !field.locked })} title={field.locked ? 'Unlock question (allow editing)' : 'Lock question (prevent editing/removal)'}
              className={`p-1 ${field.locked ? 'text-gray-700' : 'text-gray-300 hover:text-gray-600'}`}>
              {field.locked ? <Unlock size={14} /> : <Lock size={14} />}
            </button>
          )}
          <button onClick={() => onChange({ hidden: !field.hidden })} title={field.hidden ? 'Show to candidates' : 'Hide from candidates'}
            className={`p-1 ${field.hidden ? 'text-gray-700' : 'text-gray-300 hover:text-gray-600'}`}>
            {field.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
          <button onClick={onDuplicate} title="Duplicate question" className="p-1 text-gray-400 hover:text-brand-600"><Copy size={14} /></button>
          <button onClick={() => onMove(-1)} disabled={isFirst} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"><ChevronUp size={14} /></button>
          <button onClick={() => onMove(1)} disabled={isLast} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"><ChevronDown size={14} /></button>
          {!locked && <button onClick={onRemove} className="p-1 text-red-400 hover:text-red-600"><Trash2 size={14} /></button>}
        </div>
      </div>
    </div>
  );
}
