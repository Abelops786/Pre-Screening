'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import type { Candidate, CandidateStatus } from '@/types';
import { STATUS_LABELS, STATUS_COLORS, DEPT_LABELS, DEPT_COLORS } from '@/types';
import { toast } from 'react-toastify';
import { Search, Download, ChevronLeft, ChevronRight, Loader2, Eye, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

const ALL_STATUSES: CandidateStatus[] = [
  'PENDING', 'SYSTEM_CHECK_FAILED', 'AUDIO_PENDING', 'PROCESSING',
  'LEVEL1_PASSED', 'REJECTED', 'AUTO_DISQUALIFIED',
];

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [status,     setStatus]     = useState('');
  const [dept,       setDept]       = useState('');
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total,      setTotal]      = useState(0);

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      if (dept)   params.set('department', dept);

      const { data } = await api.get(`/admin/candidates?${params}`);
      setCandidates(data.data.candidates);
      setTotalPages(data.data.pagination.pages);
      setTotal(data.data.pagination.total);
    } catch {
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, status, dept]);

  useEffect(() => { fetchCandidates(); }, [fetchCandidates]);
  useEffect(() => { setPage(1); }, [search, status, dept]);

  const deleteCandidate = async (id: string, name: string) => {
    if (!confirm(`Delete ${name}? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/candidates/${id}`);
      toast.success(`${name} deleted`);
      fetchCandidates();
    } catch {
      toast.error('Failed to delete candidate');
    }
  };

  const exportCsv = async () => {
    const res = await api.get('/admin/candidates/export/csv', { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a');
    a.href = url; a.download = 'candidates.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  type CandidateWithJob = Candidate & { job?: { title: string; department: string } | null };

  return (
    <div className="space-y-4 max-w-full">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Candidates</h1>
          <p className="text-gray-500 text-sm">{total} total</p>
        </div>
        <button onClick={exportCsv}
          className="flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg px-4 py-2 transition-colors">
          <Download size={16} /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        <select value={dept} onChange={(e) => setDept(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="">All Departments</option>
          <option value="INTERPRETATION">Interpretation</option>
          <option value="SALES">Sales</option>
          <option value="CUSTOMER_SERVICE">Customer Service</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="">All Statuses</option>
          {ALL_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Name', 'Department / Job', 'Applied', 'System Check', 'Status', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12"><Loader2 size={24} className="animate-spin text-brand-600 mx-auto" /></td></tr>
              ) : candidates.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">No candidates found</td></tr>
              ) : (candidates as CandidateWithJob[]).map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{c.fullName}</p>
                    <p className="text-xs text-gray-400">{c.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    {c.job ? (
                      <div className="space-y-1">
                        <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${DEPT_COLORS[c.job.department as keyof typeof DEPT_COLORS] ?? 'bg-gray-100 text-gray-600'}`}>
                          {DEPT_LABELS[c.job.department as keyof typeof DEPT_LABELS] ?? c.job.department}
                        </span>
                        <p className="text-xs text-gray-500 truncate max-w-[180px]">{c.job.title}</p>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 capitalize">{c.selectedLanguage ?? '–'}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{format(new Date(c.createdAt), 'dd MMM yyyy')}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {c.systemCheck
                      ? <span className={c.systemCheck.passed ? 'text-green-600 font-medium' : 'text-red-500'}>
                          {c.systemCheck.passed ? `${c.systemCheck.downloadSpeed} ↓ Mbps` : 'Failed'}
                        </span>
                      : <span className="text-gray-300">–</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[c.status]}`}>
                      {STATUS_LABELS[c.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Link href={`/admin/candidates/${c.id}`}
                        className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-700 text-xs font-medium">
                        <Eye size={14} /> View
                      </Link>
                      <button onClick={() => deleteCandidate(c.id, c.fullName)}
                        className="inline-flex items-center gap-1 text-red-500 hover:text-red-700 text-xs font-medium">
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-50">
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-50">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
