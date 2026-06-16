'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { toast } from 'react-toastify';
import { Loader2, CalendarCheck, Video, CheckCircle } from 'lucide-react';

interface Slot { iso: string; day: string; time: string; booked?: boolean }
interface SlotsResponse {
  alreadyBooked: boolean;
  scheduledLabel?: string;
  teamsLink?: string | null;
  candidateName?: string;
  slots: Slot[];
  message?: string;
}

/**
 * Self-contained interview booking calendar (no page chrome) so it can be
 * embedded inline — e.g. on the voice-screening success screen — as well as
 * on the standalone /book page.
 */
export default function BookingCalendar({ candidateId }: { candidateId: string }) {
  const [data, setData] = useState<SlotsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<string | null>(null);
  const [booked, setBooked] = useState<{ label: string; teamsLink: string | null } | null>(null);
  // true = candidate already had a booking when they arrived (vs. just booked now)
  const [alreadyHad, setAlreadyHad] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get(`/availability/slots/${candidateId}`);
      setData(data.data);
      if (data.data.alreadyBooked) {
        setAlreadyHad(true);
        setBooked({ label: data.data.scheduledLabel, teamsLink: data.data.teamsLink });
      }
    } catch {
      /* leave data null → handled below */
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [candidateId]); // eslint-disable-line react-hooks/exhaustive-deps

  const book = async (slot: Slot) => {
    if (slot.booked) return;
    setBooking(slot.iso);
    try {
      const { data } = await api.post(`/availability/book/${candidateId}`, { scheduledTime: slot.iso });
      setBooked({ label: data.data.scheduledLabel, teamsLink: data.data.teamsLink });
      toast.success('Interview booked!');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg || 'Failed to book. Please try another slot.');
      load();
    } finally { setBooking(null); }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 size={28} className="animate-spin text-brand-600" /></div>;

  if (booked) return (
    <div className="text-center py-2">
      {alreadyHad ? (
        <>
          <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3">
            <CalendarCheck size={28} className="text-amber-500" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">You&apos;ve already booked your interview</h3>
          <p className="text-sm text-gray-500 mb-3">You already have an interview scheduled, so you can&apos;t book another one. Here are your details:</p>
        </>
      ) : (
        <>
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
            <CheckCircle size={28} className="text-green-500" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">Interview Booked!</h3>
        </>
      )}
      <p className="text-base font-semibold text-gray-900 mb-4">{booked.label}</p>
      {booked.teamsLink && (
        <a href={booked.teamsLink} target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl px-5 py-2.5 transition-colors">
          <Video size={16} /> Join Microsoft Teams
        </a>
      )}
      <p className="text-xs text-gray-400 mt-4">A confirmation has been sent to your email.</p>
    </div>
  );

  // Group slots by day (labels already formatted by the backend)
  const groups: Record<string, Slot[]> = {};
  (data?.slots || []).forEach((s) => { (groups[s.day] = groups[s.day] || []).push(s); });
  const days = Object.keys(groups);

  if (days.length === 0) return (
    <div className="text-center py-8 text-gray-500 text-sm flex flex-col items-center gap-2">
      <CalendarCheck size={28} className="text-gray-300" />
      {data?.message || 'No interview times are available right now. Please check back soon — we will also email you a booking link.'}
    </div>
  );

  return (
    <div className="space-y-5 max-h-[55vh] overflow-y-auto pr-1 text-left">
      {days.map((d) => (
        <div key={d}>
          <p className="text-sm font-semibold text-gray-700 mb-2">{d}</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {groups[d].map((s) => s.booked ? (
              <div key={s.iso} title="Already booked"
                className="text-sm border border-gray-100 bg-gray-100 text-gray-400 rounded-lg py-2 flex flex-col items-center justify-center cursor-not-allowed line-through">
                {s.time}
                <span className="text-[10px] no-underline">Booked</span>
              </div>
            ) : (
              <button key={s.iso} onClick={() => book(s)} disabled={!!booking}
                className="text-sm border border-gray-200 hover:border-brand-400 hover:bg-brand-50 disabled:opacity-50 rounded-lg py-2 transition-colors flex items-center justify-center">
                {booking === s.iso ? <Loader2 size={14} className="animate-spin" /> : s.time}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
