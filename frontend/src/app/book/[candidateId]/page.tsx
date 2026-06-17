'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { toast } from 'react-toastify';
import { Loader2, CalendarCheck, Video, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface Slot { iso: string; day: string; time: string; booked?: boolean }
interface SlotsResponse {
  alreadyBooked: boolean;
  scheduledLabel?: string;
  teamsLink?: string | null;
  candidateName?: string;
  slots: Slot[];
  message?: string;
  timezone?: string;
}

export default function BookingPage() {
  const { candidateId } = useParams<{ candidateId: string }>();
  const [data, setData] = useState<SlotsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [booking, setBooking] = useState<string | null>(null);
  const [booked, setBooked] = useState<{ label: string; teamsLink: string | null } | null>(null);

  const load = async () => {
    try {
      const { data } = await api.get(`/availability/slots/${candidateId}`);
      setData(data.data);
      if (data.data.alreadyBooked) setBooked({ label: data.data.scheduledLabel, teamsLink: data.data.teamsLink });
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404 || status === 403) setNotFound(true);
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

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen bg-gradient-to-br from-brand-700 to-brand-900 py-10 px-4">
      <div className="max-w-xl mx-auto">
        <div className="flex justify-center mb-6">
          <div className="bg-white rounded-xl px-4 py-2.5 shadow-md">
            <Image src="/logo.webp" alt="Logo" width={150} height={44} className="object-contain h-9 w-auto" unoptimized />
          </div>
        </div>
        {children}
      </div>
    </div>
  );

  if (loading) return <Shell><div className="flex justify-center py-10"><Loader2 size={32} className="animate-spin text-white" /></div></Shell>;

  if (notFound) return (
    <Shell>
      <div className="bg-white rounded-2xl p-8 text-center">
        <AlertCircle size={40} className="text-red-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Booking Unavailable</h2>
        <p className="text-gray-500 text-sm">This booking link is invalid or you are not yet eligible to schedule an interview.</p>
      </div>
    </Shell>
  );

  if (booked) return (
    <Shell>
      <div className="bg-white rounded-2xl p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={32} className="text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Interview Booked!</h2>
        <p className="text-lg font-semibold text-gray-900 mb-5">{booked.label}</p>
        {booked.teamsLink && (
          <a href={booked.teamsLink} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl px-5 py-2.5 transition-colors">
            <Video size={16} /> Join Microsoft Teams
          </a>
        )}
        <p className="text-xs text-gray-400 mt-4">A confirmation has been sent to your email.</p>
      </div>
    </Shell>
  );

  // Group slots by day (labels already formatted by the backend)
  const groups: Record<string, Slot[]> = {};
  (data?.slots || []).forEach((s) => { (groups[s.day] = groups[s.day] || []).push(s); });
  const days = Object.keys(groups);

  return (
    <Shell>
      <div className="text-center mb-5">
        <h1 className="text-2xl font-bold text-white">Book Your Interview</h1>
        <p className="text-brand-100 text-sm mt-1">
          {data?.candidateName ? `Hi ${data.candidateName}, ` : ''}choose a time that works for you.
        </p>
      </div>
      <div className="bg-white rounded-2xl shadow-2xl p-6">
        {days.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm flex flex-col items-center gap-2">
            <CalendarCheck size={28} className="text-gray-300" />
            {data?.message || 'No interview times are available right now. Please check back soon.'}
          </div>
        ) : (
          <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1">
            <div className="flex items-center gap-2 text-xs text-brand-700 bg-brand-50 border border-brand-100 rounded-lg px-3 py-2">
              <Clock size={14} className="shrink-0" />
              {data?.timezone || 'All times are shown in US Eastern Time (ET).'}
            </div>
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
        )}
      </div>
    </Shell>
  );
}
