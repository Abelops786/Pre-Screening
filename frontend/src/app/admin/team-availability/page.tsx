'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { getStoredUser } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { Loader2, CalendarDays, Clock, CalendarOff, Video } from 'lucide-react';

interface Hour { dayOfWeek: number; day: string; startTime: string; endTime: string }
interface TimeOff { dayLabel: string; allDay: boolean; startTime: string | null; endTime: string | null; reason: string | null }
interface RecruiterAvail {
  id: string;
  name: string;
  hours: Hour[];
  timeOff: TimeOff[];
  upcoming: string[];
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const fmt12 = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
};

export default function TeamAvailabilityPage() {
  const router = useRouter();
  const currentUser = getStoredUser();
  const [recruiters, setRecruiters] = useState<RecruiterAvail[]>([]);
  const [timezone, setTimezone] = useState('All times are shown in US Eastern Time (ET).');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser && !['SUPER_ADMIN', 'ADMIN'].includes(currentUser.role)) { router.replace('/admin'); return; }
    api.get('/availability/overview')
      .then((r) => { setRecruiters(r.data.data.recruiters); if (r.data.data.timezone) setTimezone(r.data.data.timezone); })
      .catch(() => setRecruiters([]))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 size={32} className="animate-spin text-brand-600" /></div>;

  return (
    <div className="max-w-5xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><CalendarDays size={22} className="text-brand-600" /> Team Availability</h1>
        <p className="text-gray-500 text-sm">Each recruiter&apos;s weekly hours, time off and upcoming interviews — so you can see who&apos;s free.</p>
      </div>

      <div className="flex items-center gap-2 text-xs text-brand-700 bg-brand-50 border border-brand-100 rounded-lg px-3 py-2">
        <Clock size={14} className="shrink-0" /> {timezone}
      </div>

      {recruiters.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-10">No active recruiters found.</p>
      ) : recruiters.map((r) => (
        <div key={r.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">{r.name}</h2>
            <span className="text-xs text-gray-400">{r.upcoming.length} upcoming interview{r.upcoming.length === 1 ? '' : 's'}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Weekly Hours</p>
              {r.hours.length === 0 ? (
                <p className="text-sm text-gray-400">No hours set.</p>
              ) : (
                <div className="space-y-1">
                  {DAYS.map((d, i) => {
                    const dayHours = r.hours.filter((h) => h.dayOfWeek === i);
                    if (dayHours.length === 0) return null;
                    return (
                      <div key={d} className="flex justify-between text-sm">
                        <span className="text-gray-600">{d}</span>
                        <span className="text-gray-900 font-medium">{dayHours.map((h) => `${fmt12(h.startTime)} – ${fmt12(h.endTime)}`).join(', ')}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1"><CalendarOff size={13} /> Time Off</p>
              {r.timeOff.length === 0 ? (
                <p className="text-sm text-gray-400">None upcoming.</p>
              ) : (
                <div className="space-y-1">
                  {r.timeOff.map((t, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-gray-600">{t.dayLabel}</span>
                      <span className="text-amber-700 font-medium">{t.allDay ? 'All day' : `${fmt12(t.startTime!)} – ${fmt12(t.endTime!)}`}{t.reason ? ` · ${t.reason}` : ''}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {r.upcoming.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-50">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1"><Video size={13} /> Upcoming Interviews</p>
              <div className="flex flex-wrap gap-2">
                {r.upcoming.map((u, idx) => (
                  <span key={idx} className="text-xs bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1 text-gray-700">{u}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
