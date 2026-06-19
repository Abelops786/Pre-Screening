'use client';
import { Suspense } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, AlertCircle } from 'lucide-react';

function CompleteContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const disqualified = searchParams.get('disqualified') === 'true';

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-700 to-brand-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-xl px-4 py-2.5 shadow-md">
            <Image src="/logo.webp" alt="Logo" width={150} height={46} className="object-contain h-9 w-auto" unoptimized />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {disqualified ? (
            <>
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={32} className="text-amber-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Received</h2>
              <p className="text-gray-500 text-sm mb-6">
                Thank you for your interest. Unfortunately, your application did not meet all the requirements for this position at this time.
              </p>
              <p className="text-xs text-gray-400">We encourage you to check our other open positions that may be a better fit.</p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Complete</h2>
              <p className="text-gray-500 text-sm mb-4">
                Thank you for completing the screening process. Our team will review your application and be in touch shortly.
              </p>
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-4 text-left text-sm text-amber-800">
                <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                <span><strong>Important:</strong> Please check your <strong>Spam / Junk folder</strong> if you don&apos;t see our email within a few minutes — and mark it &ldquo;Not spam&rdquo; so you receive future updates.</span>
              </div>
            </>
          )}

          <button onClick={() => router.push('/')}
            className="mt-6 w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl py-2.5 text-sm transition-colors">
            View All Positions
          </button>
        </div>
      </div>
    </div>
  );
}

export default function JobCompletePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-brand-700 to-brand-900" />}>
      <CompleteContent />
    </Suspense>
  );
}
