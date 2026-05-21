import Link from 'next/link';
import { CheckCircle } from 'lucide-react';

export default function CompletePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-700 to-brand-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={36} className="text-green-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Application Complete</h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-6">
          Thank you for completing the screening process. Please check your email inbox for updates
          on your application status. Our team will be in touch shortly.
        </p>
        <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
          <p>Make sure to check your <strong>spam/junk folder</strong> if you do not see an email within the next few minutes.</p>
        </div>
      </div>
    </div>
  );
}
