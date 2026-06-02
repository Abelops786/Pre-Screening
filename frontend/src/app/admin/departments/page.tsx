'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { toast } from 'react-toastify';
import { Plus, Pencil, Trash2, Loader2, X } from 'lucide-react';
import type { DepartmentConfig, Department } from '@/types';

const QTYPE_LABELS: Record<Department, string> = {
  INTERPRETATION:   'Interpretation questionnaire',
  SALES:            'Sales questionnaire',
  CUSTOMER_SERVICE: 'Customer Service questionnaire',
};

const BLANK = { name: '', questionnaireType: 'CUSTOMER_SERVICE' as Department };

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<DepartmentConfig[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [form,     setForm]     = useState(BLANK);
  const [editId,   setEditId]   = useState<string | null>(null);

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/departments');
      setDepartments(data.data);
    } catch { toast.error('Failed to load departments'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchDepartments(); }, []);

  const openNew  = () => { setForm(BLANK); setEditId(null); setShowForm(true); };
  const openEdit = (d: DepartmentConfig) => {
    setForm({ name: d.name, questionnaireType: d.questionnaireType });
    setEditId(d.id);
    setShowForm(true);
  };

  const save = async () => {
    if (!form.name.trim()) { toast.error('Department name is required'); return; }
    setSaving(true);
    try {
      if (editId) {
        await api.patch(`/departments/${editId}`, form);
        toast.success('Department updated');
      } else {
        await api.post('/departments', form);
        toast.success('Department created');
      }
      setShowForm(false);
      fetchDepartments();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg || 'Failed to save department');
    } finally { setSaving(false); }
  };

  const remove = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? Jobs already using it keep their data, but it will no longer be selectable.`)) return;
    try {
      await api.delete(`/departments/${id}`);
      toast.success('Department deleted');
      fetchDepartments();
    } catch { toast.error('Failed to delete department'); }
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Departments</h1>
          <p className="text-sm text-gray-500">Create custom department names and map each to a screening questionnaire.</p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors">
          <Plus size={16} /> New Department
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-brand-600" /></div>
        ) : departments.length === 0 ? (
          <div className="py-16 text-center text-gray-400">No departments yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Department Name', 'Questionnaire Used', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {departments.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{d.name}</td>
                  <td className="px-4 py-3 text-gray-600">{QTYPE_LABELS[d.questionnaireType]}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <button onClick={() => openEdit(d)}
                        className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 font-medium">
                        <Pencil size={13} /> Edit
                      </button>
                      <button onClick={() => remove(d.id, d.name)}
                        className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium">
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">{editId ? 'Edit Department' : 'New Department'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department Name *</label>
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="e.g. Technical Support" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Screening Questionnaire *</label>
                <select value={form.questionnaireType} onChange={(e) => setForm((f) => ({ ...f, questionnaireType: e.target.value as Department }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                  <option value="CUSTOMER_SERVICE">Customer Service questionnaire</option>
                  <option value="SALES">Sales questionnaire</option>
                  <option value="INTERPRETATION">Interpretation questionnaire</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">Candidates applying to this department will fill out the selected questionnaire.</p>
              </div>
            </div>
            <div className="flex gap-3 justify-end p-6 border-t border-gray-100">
              <button onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={save} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-lg transition-colors">
                {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                {editId ? 'Save Changes' : 'Create Department'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
