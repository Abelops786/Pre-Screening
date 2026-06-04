'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { getStoredUser } from '@/lib/auth';
import { Users, CheckCircle, XCircle, Clock, Loader2, CalendarClock, Video, ChevronRight } from 'lucide-react';
import { DEPT_LABELS, DEPT_COLORS } from '@/types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

const COLORS = ['#105279', '#1f83b6', '#b098eb', '#16a34a', '#d97706', '#0891b2', '#8364d6', '#65a30d'];

interface Analytics {
  kpi: { total: number; qualified: number; rejected: number; pending: number };
  deptBreakdown: { department: string; count: number }[];
  languageBreakdown: { language: string; count: number }[];
}

interface InterviewRow {
  id: string; candidateId: string; candidateName: string; candidateEmail: string;
  jobTitle: string; recruiterName: string; scheduledLabel: string; msTeamsLink: string | null; upcoming: boolean;
}

export default function AdminOverviewPage() {
  const [data,    setData]    = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [interviews, setInterviews] = useState<InterviewRow[]>([]);
  const [intvCount,  setIntvCount]  = useState<{ total: number; upcoming: number }>({ total: 0, upcoming: 0 });
  const user = getStoredUser();

  useEffect(() => {
    api.get('/admin/analytics')
      .then((res) => setData(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
    api.get('/availability/my-interviews')
      .then((res) => { setInterviews(res.data.data.interviews); setIntvCount({ total: res.data.data.total, upcoming: res.data.data.upcoming }); })
      .catch(() => {});
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={32} className="animate-spin text-brand-600" />
    </div>
  );

  const kpi = [
    { label: 'Total Applications',   value: data?.kpi.total     ?? 0, icon: Users,        color: 'text-brand-600', bg: 'bg-brand-50' },
    { label: 'Level 1 Passed',       value: data?.kpi.qualified ?? 0, icon: CheckCircle,   color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Booked Interviews',    value: intvCount.upcoming,        icon: CalendarClock, color: 'text-accent-700', bg: 'bg-accent-100' },
    { label: 'Rejected',             value: data?.kpi.rejected  ?? 0, icon: XCircle,       color: 'text-red-600',   bg: 'bg-red-50'   },
    { label: 'Pending / Processing', value: data?.kpi.pending   ?? 0, icon: Clock,         color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  const hasDeptData = (data?.deptBreakdown?.length ?? 0) > 0;
  const hasLangData = (data?.languageBreakdown?.length ?? 0) > 0;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
        <p className="text-gray-500 text-sm">
          {user?.role === 'RECRUITER' ? 'Your assigned candidates summary' : 'Recruitment pipeline summary'}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpi.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-start gap-4">
            <div className={`${bg} p-3 rounded-xl`}>
              <Icon size={22} className={color} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Booked interviews */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <CalendarClock size={18} className="text-accent-700" />
            Booked Interviews
          </h2>
          <span className="text-xs text-gray-400">{intvCount.upcoming} upcoming · {intvCount.total} total</span>
        </div>
        {interviews.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No interviews booked yet.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {interviews.map((iv) => (
              <Link key={iv.id} href={`/admin/candidates/${iv.candidateId}`}
                className="flex items-center justify-between gap-3 py-3 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{iv.candidateName}</p>
                  <p className="text-xs text-gray-500 truncate">{iv.jobTitle} · {iv.candidateEmail}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className={`text-xs font-medium ${iv.upcoming ? 'text-gray-800' : 'text-gray-400'}`}>{iv.scheduledLabel}</p>
                    {iv.msTeamsLink && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-brand-600"><Video size={11} /> Teams</span>
                    )}
                  </div>
                  <ChevronRight size={16} className="text-gray-300" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Department breakdown (job-based candidates) */}
      {hasDeptData && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Applications by Department</h2>
          <div className="flex flex-wrap gap-3">
            {data!.deptBreakdown.map((d) => (
              <div key={d.department} className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-3">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${DEPT_COLORS[d.department as keyof typeof DEPT_COLORS] ?? 'bg-gray-100 text-gray-600'}`}>
                  {DEPT_LABELS[d.department as keyof typeof DEPT_LABELS] ?? d.department}
                </span>
                <span className="text-lg font-bold text-gray-900">{d.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Language breakdown (original flow candidates) */}
      {hasLangData && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Applications by Language</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data!.languageBreakdown} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="language" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {data!.languageBreakdown.map((_e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {!hasDeptData && !hasLangData && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center text-gray-400 text-sm py-10">
          No application data yet
        </div>
      )}
    </div>
  );
}
