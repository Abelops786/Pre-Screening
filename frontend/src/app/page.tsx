'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import type { Job } from '@/types';
import { DEPT_LABELS, DEPT_COLORS } from '@/types';
import { Loader2, Users, Headphones, TrendingUp } from 'lucide-react';

const DEPT_ICONS = {
  INTERPRETATION:   <Headphones size={28} className="text-indigo-600" />,
  SALES:            <TrendingUp  size={28} className="text-amber-600" />,
  CUSTOMER_SERVICE: <Users       size={28} className="text-teal-600"  />,
};

const DEPT_DESCRIPTIONS = {
  INTERPRETATION:   'Provide professional language interpretation services across multiple industries and specializations.',
  SALES:            'Drive growth through outbound sales, lead generation, and customer acquisition in a performance-driven environment.',
  CUSTOMER_SERVICE: 'Deliver exceptional support experiences on inbound calls, chat, and email for our clients\' customers.',
};

export default function LandingPage() {
  const router  = useRouter();
  const [jobs,    setJobs]    = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    api.get('/jobs/public')
      .then(({ data }) => setJobs(data.data))
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
  }, []);

  // Display name for a job: custom label falls back to built-in questionnaire name
  const displayName = (j: Job) => j.departmentLabel || DEPT_LABELS[j.department];

  // Group by display name so custom departments get their own card
  const grouped = jobs.reduce<Record<string, Job[]>>((acc, j) => {
    const key = displayName(j);
    (acc[key] = acc[key] || []).push(j);
    return acc;
  }, {});

  // One card per distinct department name that has open jobs
  const departments = Object.keys(grouped);

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-700 to-brand-900">
      {/* Header */}
      <header className="max-w-5xl mx-auto px-6 py-8 flex items-center justify-between">
        <Image src="/logo.webp" alt="Logo" width={160} height={48} className="object-contain" unoptimized />
        <a href="/login" className="text-sm text-brand-200 hover:text-white transition-colors">Admin Login</a>
      </header>

      {/* Hero */}
      <div className="max-w-5xl mx-auto px-6 pb-10 text-center">
        <h1 className="text-4xl font-bold text-white mb-3">Join Our Team</h1>
        <p className="text-brand-100 text-lg max-w-xl mx-auto">
          We are looking for talented individuals to join our remote team. Select a department below to view open positions.
        </p>
      </div>

      {/* Department cards */}
      <div className="max-w-5xl mx-auto px-6 pb-6">
        {departments.length === 0 && !loading ? (
          <p className="text-center text-brand-200">No open positions at the moment. Please check back soon.</p>
        ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {departments.map((name) => {
            const jobsInGroup = grouped[name] || [];
            const count = jobsInGroup.length;
            const qType = jobsInGroup[0]?.department ?? 'CUSTOMER_SERVICE';
            const active = selected === name;
            return (
              <button
                key={name}
                onClick={() => setSelected(active ? null : name)}
                className={`rounded-2xl p-6 text-left transition-all border-2 ${
                  active
                    ? 'bg-white border-brand-400 shadow-xl scale-[1.02]'
                    : 'bg-white/95 border-transparent hover:border-brand-300 hover:shadow-lg hover:scale-[1.01]'
                }`}
              >
                <div className="mb-3">{DEPT_ICONS[qType]}</div>
                <h2 className="text-base font-bold text-gray-900 mb-1">{name}</h2>
                <p className="text-xs text-gray-500 mb-3">{DEPT_DESCRIPTIONS[qType]}</p>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${DEPT_COLORS[qType]}`}>
                  {count} open position{count !== 1 ? 's' : ''}
                </span>
              </button>
            );
          })}
        </div>
        )}
      </div>

      {/* Job listings for selected department */}
      {selected && (
        <div className="max-w-5xl mx-auto px-6 pb-16">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 size={28} className="animate-spin text-white" /></div>
          ) : (
            <div className="space-y-3">
              <h3 className="text-white font-semibold text-lg mb-4">
                {selected} Positions
              </h3>
              {(grouped[selected] || []).map((job) => (
                <div key={job.id} className="bg-white rounded-2xl p-5 flex items-center justify-between gap-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 text-base">{job.title}</h4>
                    {job.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{job.description}</p>}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {job.workWindow && (
                        <span className="text-xs bg-brand-50 text-brand-700 px-2.5 py-1 rounded-full font-medium">
                          {job.workWindow}
                        </span>
                      )}
                      {job.positionType && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                          {job.positionType === 'US_BASED' ? 'U.S. Based' : 'International'}
                        </span>
                      )}
                      {job.roleType && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                          {job.roleType === 'DEDICATED_HOURLY' ? 'Dedicated Hourly' : 'Per-Minute / On-Demand'}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => router.push(`/jobs/${job.urlKey || job.id}/apply`)}
                    className="shrink-0 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl px-5 py-2.5 transition-colors"
                  >
                    Apply Now
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <footer className="text-center text-brand-300 text-xs pb-8">
        © {new Date().getFullYear()} All rights reserved.
      </footer>
    </div>
  );
}
