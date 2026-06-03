'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { toast } from 'react-toastify';
import { Plus, Trash2, Loader2, CalendarClock } from 'lucide-react';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface Slot { id: string; dayOfWeek: number; startTime: string; endTime: string; dayName?: string }

export default function AvailabilityPage() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ dayOfWeek: 1, startTime: '09:00', endTime: '17:00' });

  const fetchSlots = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/availability');
      setSlots(data.data);
    } catch { toast.error('Failed to load availability'); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchSlots(); }, []);

  const add = async () => {
    if (form.startTime >= form.endTime) { toast.error('End time must be after start time'); return; }
    setSaving(true);
    try {
      await api.post('/availability', form);
      toast.success('Availability added');
      fetchSlots();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to add');
    } finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    try { await api.delete(`/availability/${id}`); fetchSlots(); }
    catch { toast.error('Failed to remove'); }
  };

  const byDay = (d: number) => slots.filter((s) => s.dayOfWeek === d);

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Interview Availability</h1>
        <p className="text-sm text-gray-500">Set your weekly hours. Qualified candidates can book 30-minute slots within these times.</p>
      </div>

      {/* Add form */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2"><CalendarClock size={16} className="text-brand-600" /> Add available hours</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Day</label>
            <select value={form.dayOfWeek} onChange={(e) => setForm((f) => ({ ...f, dayOfWeek: Number(e.target.value) }))}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
              {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
            <input type="time" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
            <input type="time" value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <button onClick={add} disabled={saving}
            className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Add
          </button>
        </div>
      </div>

      {/* Weekly grid */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 flex justify-center"><Loader2 size={26} className="animate-spin text-brand-600" /></div>
        ) : (
          <div className="divide-y divide-gray-50">
            {DAYS.map((d, i) => (
              <div key={i} className="flex items-start gap-4 px-5 py-3">
                <div className="w-28 text-sm font-medium text-gray-700 shrink-0">{d}</div>
                <div className="flex-1 flex flex-wrap gap-2">
                  {byDay(i).length === 0 ? (
                    <span className="text-xs text-gray-300">No hours set</span>
                  ) : byDay(i).map((s) => (
                    <span key={s.id} className="inline-flex items-center gap-2 bg-brand-50 text-brand-700 text-xs font-medium px-3 py-1.5 rounded-full">
                      {s.startTime} – {s.endTime}
                      <button onClick={() => remove(s.id)} className="text-brand-400 hover:text-red-500"><Trash2 size={12} /></button>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
