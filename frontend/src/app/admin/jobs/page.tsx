'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { Plus, Pencil, Trash2, Globe, Copy, Loader2, X, Check } from 'lucide-react';
import type { Job, JobStatus, PositionType, RoleType, DepartmentConfig } from '@/types';
import {
  JOB_STATUS_LABELS, JOB_STATUS_COLORS, DEPT_COLORS, INTERPRETATION_LANGUAGES,
} from '@/types';

const BLANK: Partial<Job> & { password?: string } = {
  title: '', department: 'CUSTOMER_SERVICE', departmentLabel: 'Customer Service', language: 'English', status: 'DRAFT',
  description: '', client: null, positionType: null, roleType: null,
  scheduledPublishAt: null, minDownloadSpeed: 20, minUploadSpeed: 10,
};

export default function JobsPage() {
  const [jobs,        setJobs]        = useState<Job[]>([]);
  const [departments, setDepartments] = useState<DepartmentConfig[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [showForm,    setShowForm]    = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [form,        setForm]        = useState<typeof BLANK>({ ...BLANK });
  const [editId,      setEditId]      = useState<string | null>(null);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/jobs');
      setJobs(data.data);
    } catch { toast.error('Failed to load jobs'); }
    finally { setLoading(false); }
  };

  const fetchDepartments = async () => {
    try {
      const { data } = await api.get('/departments');
      setDepartments(data.data);
    } catch { /* non-blocking */ }
  };

  useEffect(() => { fetchJobs(); fetchDepartments(); }, []);

  // Display name for a job: custom label falls back to questionnaire type name
  const deptDisplay = (j: Job) =>
    j.departmentLabel || departments.find((d) => d.questionnaireType === j.department)?.name || j.department;

  const openNew  = () => { setForm({ ...BLANK }); setEditId(null); setShowForm(true); };
  const openEdit = (j: Job) => {
    setForm({
      title: j.title, department: j.department,
      departmentLabel: j.departmentLabel || undefined,
      language: j.language || '',
      status: j.status,
      description: j.description || '', client: j.client || null,
      positionType: j.positionType || null, roleType: j.roleType || null,
      scheduledPublishAt: j.scheduledPublishAt || null,
      minDownloadSpeed: j.minDownloadSpeed, minUploadSpeed: j.minUploadSpeed,
    });
    setEditId(j.id);
    setShowForm(true);
  };

  // When a department is picked, set both the display label and the questionnaire engine
  const pickDepartment = (name: string) => {
    const cfg = departments.find((d) => d.name === name);
    if (cfg) {
      set('departmentLabel', cfg.name);
      set('department', cfg.questionnaireType);
    }
  };

  const save = async () => {
    if (!form.title?.trim()) { toast.error('Title is required'); return; }
    if (form.status === 'SCHEDULED' && !form.scheduledPublishAt) {
      toast.error('Please set a publish date for scheduled jobs'); return;
    }
    setSaving(true);
    try {
      if (editId) {
        await api.patch(`/jobs/${editId}`, form);
        toast.success('Job updated');
      } else {
        await api.post('/jobs', form);
        toast.success('Job created');
      }
      setShowForm(false);
      fetchJobs();
    } catch { toast.error('Failed to save job'); }
    finally { setSaving(false); }
  };

  const deleteJob = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/jobs/${id}`);
      toast.success('Job deleted');
      fetchJobs();
    } catch { toast.error('Failed to delete job'); }
  };

  const quickStatus = async (id: string, status: JobStatus) => {
    try {
      await api.patch(`/jobs/${id}`, { status });
      toast.success(`Job ${JOB_STATUS_LABELS[status].toLowerCase()}`);
      fetchJobs();
    } catch { toast.error('Failed to update status'); }
  };

  const copyLink = (j: Job) => {
    const key = (j as Job & { slug?: string }).slug || j.id;
    const url = `${window.location.origin}/jobs/${key}/apply`;
    navigator.clipboard.writeText(url);
    toast.success('Application link copied!');
  };

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
          <p className="text-sm text-gray-500">{jobs.length} total</p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors">
          <Plus size={16} /> New Job
        </button>
      </div>

      {/* Job list */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={28} className="animate-spin text-brand-600" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="py-16 text-center text-gray-400">No jobs yet. Create your first job.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Title', 'Department', 'Status', 'Applicants', 'Created', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {jobs.map((j) => (
                <tr key={j.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{j.title}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full ${DEPT_COLORS[j.department]}`}>
                      {deptDisplay(j)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full ${JOB_STATUS_COLORS[j.status]}`}>
                      {JOB_STATUS_LABELS[j.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{j._count?.candidates ?? 0}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{format(new Date(j.createdAt), 'dd MMM yyyy')}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {j.status !== 'PUBLISHED' && j.status !== 'ARCHIVED' && (
                        <button onClick={() => quickStatus(j.id, 'PUBLISHED')}
                          className="inline-flex items-center gap-1 text-xs text-green-600 hover:text-green-800 font-medium">
                          <Globe size={13} /> Publish
                        </button>
                      )}
                      {j.status === 'PUBLISHED' && (
                        <>
                          <button onClick={() => copyLink(j)}
                            className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-800 font-medium">
                            <Copy size={13} /> Copy Link
                          </button>
                          <button onClick={() => quickStatus(j.id, 'ARCHIVED')}
                            className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 font-medium">
                            Archive
                          </button>
                        </>
                      )}
                      {j.status === 'DRAFT' && (
                        <button onClick={() => quickStatus(j.id, 'PENDING')}
                          className="inline-flex items-center gap-1 text-xs text-yellow-600 hover:text-yellow-800 font-medium">
                          <Check size={13} /> Submit for Review
                        </button>
                      )}
                      <button onClick={() => openEdit(j)}
                        className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 font-medium">
                        <Pencil size={13} /> Edit
                      </button>
                      <button onClick={() => deleteJob(j.id, j.title)}
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

      {/* Create / Edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">{editId ? 'Edit Job' : 'New Job'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            <div className="p-6 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Job Title *</label>
                <input value={form.title} onChange={(e) => set('title', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="e.g. Spanish Interpreter – Dedicated Hourly" />
              </div>

              {/* Department */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
                <select value={form.departmentLabel || ''} onChange={(e) => pickDepartment(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                  {departments.length === 0 && <option value="">Loading…</option>}
                  {departments.map((d) => (
                    <option key={d.id} value={d.name}>{d.name}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  Manage the list in <a href="/admin/departments" className="text-brand-600 underline">Departments</a>.
                </p>
              </div>

              {/* Language */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                <input list="job-languages" value={form.language || ''} onChange={(e) => set('language', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="e.g. English, Spanish, Urdu" />
                <datalist id="job-languages">
                  {INTERPRETATION_LANGUAGES.map((l) => <option key={l} value={l} />)}
                </datalist>
                <p className="text-xs text-gray-400 mt-1">The language candidates will be assessed in (shown to applicants and used for the voice reading test).</p>
              </div>

              {/* Interpretation-specific fields */}
              {form.department === 'INTERPRETATION' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Client (internal only)</label>
                    <select value={form.client || ''} onChange={(e) => set('client', e.target.value || null)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                      <option value="">— Select client —</option>
                      <option value="BIG_LANGUAGE">Big Language (5AM–6PM PST)</option>
                      <option value="TRANSPERFECT">Transperfect (6AM–8PM MST)</option>
                      <option value="LANGO">Lango (6AM–6PM CST)</option>
                      <option value="BOOSTLINGO">Boostlingo (6AM–6PM PST)</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Position Type</label>
                      <select value={form.positionType || ''} onChange={(e) => set('positionType', e.target.value as PositionType || null)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                        <option value="">— Select —</option>
                        <option value="US_BASED">U.S.-Based</option>
                        <option value="INTERNATIONAL">International</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Role Type</label>
                      <select value={form.roleType || ''} onChange={(e) => set('roleType', e.target.value as RoleType || null)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                        <option value="">— Select —</option>
                        <option value="DEDICATED_HOURLY">Dedicated Hourly</option>
                        <option value="PER_MINUTE">Per-Minute / On-Demand</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                <textarea value={form.description || ''} onChange={(e) => set('description', e.target.value)} rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Brief description visible to candidates" />
              </div>

              {/* Speed thresholds */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Download (Mbps)</label>
                  <input type="number" value={form.minDownloadSpeed} onChange={(e) => set('minDownloadSpeed', parseFloat(e.target.value))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Upload (Mbps)</label>
                  <input type="number" value={form.minUploadSpeed} onChange={(e) => set('minUploadSpeed', parseFloat(e.target.value))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select value={form.status} onChange={(e) => set('status', e.target.value as JobStatus)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                  <option value="DRAFT">Draft</option>
                  <option value="PENDING">Pending Review</option>
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>

              {/* Scheduled date */}
              {form.status === 'SCHEDULED' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Publish Date & Time *</label>
                  <input type="datetime-local" value={form.scheduledPublishAt?.slice(0, 16) || ''}
                    onChange={(e) => set('scheduledPublishAt', e.target.value ? new Date(e.target.value).toISOString() : null)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end p-6 border-t border-gray-100">
              <button onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={save} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-lg transition-colors">
                {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                {editId ? 'Save Changes' : 'Create Job'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
