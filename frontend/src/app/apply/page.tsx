'use client';
import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import api from '@/lib/api';
import { LANGUAGES, SHIFTS } from '@/types';
import { Upload, FileText, CheckCircle, Loader2 } from 'lucide-react';

const schema = z.object({
  fullName:          z.string().min(2, 'Full name is required'),
  email:             z.string().email('Valid email is required'),
  phone:             z.string().min(6, 'Phone number is required'),
  location:          z.string().min(2, 'Location is required'),
  yearsExperience:   z.coerce.number().int().min(0, 'Enter years of experience'),
  availabilityShift: z.string().min(1, 'Select your availability shift'),
  selectedLanguage:  z.string().min(1, 'Select your evaluation language'),
  certifications:    z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function ApplyPage() {
  const router  = useRouter();
  const [cvFile,   setCvFile]   = useState<File | null>(null);
  const [certFile, setCertFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const cvInputRef   = useRef<HTMLInputElement>(null);
  const certInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: FormValues) => {
    // Bypassed for demo
    // if (!cvFile) { toast.error('Please upload your CV'); return; }
    setSubmitting(true);

    try {
      const certArray = values.certifications
        ? values.certifications.split(',').map((c) => c.trim()).filter(Boolean)
        : [];

      const { data } = await api.post('/candidates', {
        ...values,
        certifications: certArray,
      });

      const candidateId: string = data.data.candidateId;

      if (cvFile || certFile) {
        const formData = new FormData();
        if (cvFile) formData.append('cv', cvFile);
        if (certFile) formData.append('certificate', certFile);
        await api.post(`/upload/${candidateId}/documents`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      toast.success('Application submitted!');
      router.push(`/apply/system-check?id=${candidateId}`);
    } catch (err: unknown) {
      const res = (err as { response?: { data?: { message?: string; data?: { id: string; status: string } } } })?.response?.data;
      if (res?.message === 'already_applied' && res?.data) {
        const { id, status } = res.data;
        if (status === 'PENDING' || status === 'SYSTEM_CHECK_FAILED') {
          toast.info('Resuming your application — redirecting to system check…');
          router.push(`/apply/system-check?id=${id}`);
        } else if (status === 'AUDIO_PENDING') {
          toast.info('Resuming your application — redirecting to audio recording…');
          router.push(`/apply/audio?id=${id}`);
        } else if (status === 'LEVEL1_PASSED') {
          toast.info('You have already passed — taking you to your interview booking.');
          router.push(`/book/${id}`);
        } else {
          toast.info('Your application has already been submitted. Please check your email for updates.');
          router.push('/apply/complete');
        }
        return;
      }
      toast.error(res?.message || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const Field = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );

  const inputClass = 'w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition';

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-700 to-brand-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-white/10 text-white rounded-full px-4 py-1.5 text-sm mb-4">
            <FileText size={16} />
            Step 1 of 3 – Application Form
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {process.env.NEXT_PUBLIC_APP_NAME || 'TalentScreen'}
          </h1>
          <p className="text-brand-100">Complete your application to begin the screening process</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="Full Name *" error={errors.fullName?.message}>
                <input {...register('fullName')} className={inputClass} placeholder="John Smith" />
              </Field>
              <Field label="Email Address *" error={errors.email?.message}>
                <input {...register('email')} type="email" className={inputClass} placeholder="john@example.com" />
              </Field>
              <Field label="Phone Number *" error={errors.phone?.message}>
                <input {...register('phone')} className={inputClass} placeholder="+1 555 000 0000" />
              </Field>
              <Field label="Location / City *" error={errors.location?.message}>
                <input {...register('location')} className={inputClass} placeholder="New York, USA" />
              </Field>
              <Field label="Years of Experience *" error={errors.yearsExperience?.message}>
                <input {...register('yearsExperience')} type="number" min="0" className={inputClass} placeholder="3" />
              </Field>
              <Field label="Availability Shift *" error={errors.availabilityShift?.message}>
                <select {...register('availabilityShift')} className={inputClass}>
                  <option value="">Select shift…</option>
                  {SHIFTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </Field>
            </div>

            <Field label="Evaluation Language *" error={errors.selectedLanguage?.message}>
              <select {...register('selectedLanguage')} className={inputClass}>
                <option value="">Select language…</option>
                {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </Field>

            <Field label="Certifications (comma-separated)" error={errors.certifications?.message}>
              <input {...register('certifications')} className={inputClass} placeholder="CompTIA A+, CCNA, AWS Solutions Architect" />
            </Field>

            {/* File Uploads */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">CV / Resume *</label>
                <input ref={cvInputRef} type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" onChange={(e) => setCvFile(e.target.files?.[0] || null)} />
                <div onClick={() => cvInputRef.current?.click()} className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors border-gray-300 hover:border-brand-400 hover:bg-gray-50">
                  {cvFile ? (
                    <div className="flex items-center justify-center gap-2 text-green-600">
                      <CheckCircle size={20} />
                      <span className="text-sm font-medium truncate max-w-[200px]">{cvFile.name}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-gray-500">
                      <Upload size={24} />
                      <p className="text-sm">Click to upload your CV</p>
                      <p className="text-xs text-gray-400">PDF or DOCX, max 10MB</p>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Certificates (optional)</label>
                <input ref={certInputRef} type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" onChange={(e) => setCertFile(e.target.files?.[0] || null)} />
                <div onClick={() => certInputRef.current?.click()} className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors border-gray-300 hover:border-brand-400 hover:bg-gray-50">
                  {certFile ? (
                    <div className="flex items-center justify-center gap-2 text-green-600">
                      <CheckCircle size={20} />
                      <span className="text-sm font-medium truncate max-w-[200px]">{certFile.name}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-gray-500">
                      <Upload size={24} />
                      <p className="text-sm">Click to upload certificate</p>
                      <p className="text-xs text-gray-400">PDF or DOCX, max 10MB</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold rounded-xl py-3 flex items-center justify-center gap-2 transition-colors"
            >
              {submitting ? <><Loader2 size={18} className="animate-spin" /> Submitting…</> : 'Submit Application & Continue →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
