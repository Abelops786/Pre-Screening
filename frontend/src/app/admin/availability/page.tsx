'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { toast } from 'react-toastify';
import { Plus, Trash2, Loader2, CalendarClock, CalendarOff } from 'lucide-react';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface Slot { id: string; dayOfWeek: number; startTime: string; endTime: string; dayName?: string }
interface Exception { id: string; date: string; allDay: boolean; startTime?: string | null; endTime?: string | null; reason?: string | null; dayLabel?: string }

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function AvailabilityPage() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ dayOfWeek: 1, startTime: '09:00', endTime: '17:00' });
  // Time off / blocked slots
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [exSaving, setExSaving] = useState(false);
  const [exForm, setExForm] = useState({ date: todayStr(), allDay: true, startTime: '09:00', endTime: '10:00', reason: '' });

  const fetchSlots = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/availability');
      setSlots(data.data);
    } catch { toast.error('Failed to load availability'); }
    finally { setLoading(false); }
  };
  const fetchExceptions = async () => {
    try {
      const { data } = await api.get('/availability/exceptions');
      setExceptions(data.data);
    } catch { /* non-blocking */ }
  };
  useEffect(() => { fetchSlots(); fetchExceptions(); }, []);

  const addException = async () => {
    if (!exForm.date) { toast.error('Pick a date'); return; }
    if (!exForm.allDay && exForm.startTime >= exForm.endTime) { toast.error('End time must be after start time'); return; }
    setExSaving(true);
    try {
      await api.post('/availability/exceptions', exForm);
      toast.success(exForm.allDay ? 'Day marked as off' : 'Slot blocked');
      setExForm((f) => ({ ...f, reason: '' }));
      fetchExceptions();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to add');
    } finally { setExSaving(false); }
  };

  const removeException = async (id: string) => {
    try { await api.delete(`/availability/exceptions/${id}`); fetchExceptions(); }
    catch { toast.error('Failed to remove'); }
  };

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
        <p className="text-sm text-gray-500">Set the weekly hours you&apos;re free for interviews. The system splits each block into 30-minute slots that candidates can book.</p>
      </div>

      {/* How it works note */}
      <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 text-sm text-brand-800">
        <p className="font-semibold mb-1">How it works</p>
        <ul className="list-disc list-inside space-y-0.5 text-brand-700">
          <li>Pick a <strong>day</strong> and a <strong>start</strong> and <strong>end</strong> time, then click <strong>Add</strong>.</li>
          <li>Example: Monday <strong>9:00 AM → 12:00 PM</strong> creates six 30-min slots (9:00, 9:30, 10:00, 10:30, 11:00, 11:30).</li>
          <li>Candidates see these <strong>exact times</strong> on their booking page and pick one. Once booked, that slot disappears for everyone else.</li>
        </ul>
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

      {/* Time off / block a slot */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-1 flex items-center gap-2"><CalendarOff size={16} className="text-rose-500" /> Time off &amp; blocked slots</h2>
        <p className="text-xs text-gray-500 mb-3">Mark a whole day as off/on leave, or block a specific time range on a date. Candidates won&apos;t be able to book those times.</p>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
            <input type="date" min={todayStr()} value={exForm.date} onChange={(e) => setExForm((f) => ({ ...f, date: e.target.value }))}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
            <select value={exForm.allDay ? 'all' : 'range'} onChange={(e) => setExForm((f) => ({ ...f, allDay: e.target.value === 'all' }))}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
              <option value="all">Whole day off / leave</option>
              <option value="range">Block a time range</option>
            </select>
          </div>
          {!exForm.allDay && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
                <input type="time" value={exForm.startTime} onChange={(e) => setExForm((f) => ({ ...f, startTime: e.target.value }))}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
                <input type="time" value={exForm.endTime} onChange={(e) => setExForm((f) => ({ ...f, endTime: e.target.value }))}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
            </>
          )}
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs font-medium text-gray-600 mb-1">Reason (optional)</label>
            <input type="text" value={exForm.reason} onChange={(e) => setExForm((f) => ({ ...f, reason: e.target.value }))} placeholder="e.g. Leave"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <button onClick={addException} disabled={exSaving}
            className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors">
            {exSaving ? <Loader2 size={15} className="animate-spin" /> : <CalendarOff size={15} />} Block
          </button>
        </div>

        {exceptions.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {exceptions.map((ex) => (
              <span key={ex.id} className="inline-flex items-center gap-2 bg-rose-50 text-rose-700 text-xs font-medium px-3 py-1.5 rounded-full">
                {ex.dayLabel}
                {ex.allDay ? ' · All day' : ` · ${ex.startTime}–${ex.endTime}`}
                {ex.reason ? ` (${ex.reason})` : ''}
                <button onClick={() => removeException(ex.id)} className="text-rose-400 hover:text-red-600"><Trash2 size={12} /></button>
              </span>
            ))}
          </div>
        )}
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
