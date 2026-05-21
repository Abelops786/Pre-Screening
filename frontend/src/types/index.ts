export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'RECRUITER';

export type CandidateStatus =
  | 'PENDING'
  | 'SYSTEM_CHECK_FAILED'
  | 'AUDIO_PENDING'
  | 'PROCESSING'
  | 'LEVEL1_PASSED'
  | 'REJECTED';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department?: string;
  isActive?: boolean;
  createdAt?: string;
}

export interface SystemCheck {
  id: string;
  downloadSpeed: number;
  uploadSpeed: number;
  deviceType: string;
  os: string;
  browser: string;
  micPermitted: boolean;
  speakerPermitted: boolean;
  passed: boolean;
  checkedAt: string;
}

export interface AudioRecording {
  id: string;
  audioUrl: string;
  durationSeconds: number;
  transcript: string | null;
  fluencyScore: number | null;
  languageDetected: string | null;
  flaggedForHumanReview: boolean;
  processedAt: string | null;
}

export interface FilterResult {
  id: string;
  filtersApplied: unknown[];
  rejectionReasons: string[];
  qualified: boolean;
}

export interface InternalNote {
  id: string;
  note: string;
  createdAt: string;
  user: { id: string; name: string };
}

export interface Candidate {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  location: string;
  yearsExperience: number;
  availabilityShift: string;
  certifications: string[];
  cvUrl: string | null;
  certificateUrl: string | null;
  selectedLanguage: string;
  status: CandidateStatus;
  createdAt: string;
  systemCheck?: SystemCheck | null;
  audioRecording?: AudioRecording | null;
  filterResult?: FilterResult | null;
  internalNotes?: InternalNote[];
}

export interface AnalyticsData {
  kpi: {
    total: number;
    qualified: number;
    rejected: number;
    pending: number;
  };
  languageBreakdown: Array<{ language: string; count: number }>;
}

export interface PaginatedCandidates {
  candidates: Candidate[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const LANGUAGES = [
  { value: 'english',  label: 'English' },
  { value: 'spanish',  label: 'Spanish (Español)' },
  { value: 'arabic',   label: 'Arabic (عربي)' },
  { value: 'hindi',    label: 'Hindi (हिन्दी)' },
  { value: 'urdu',     label: 'Urdu (اردو)' },
  { value: 'french',   label: 'French (Français)' },
  { value: 'german',   label: 'German (Deutsch)' },
  { value: 'portuguese', label: 'Portuguese (Português)' },
  { value: 'mandarin', label: 'Mandarin (普通话)' },
  { value: 'russian',  label: 'Russian (Русский)' },
  { value: 'turkish',  label: 'Turkish (Türkçe)' },
  { value: 'indonesian', label: 'Indonesian (Bahasa)' },
  { value: 'other',    label: 'Other' },
];

export const SHIFTS = [
  { value: 'morning',   label: 'Morning (6am–2pm)' },
  { value: 'afternoon', label: 'Afternoon (2pm–10pm)' },
  { value: 'evening',   label: 'Evening (6pm–12am)' },
  { value: 'night',     label: 'Night (10pm–6am)' },
  { value: 'flexible',  label: 'Flexible / Any' },
];

export const STATUS_LABELS: Record<CandidateStatus, string> = {
  PENDING:              'Pending',
  SYSTEM_CHECK_FAILED:  'System Check Failed',
  AUDIO_PENDING:        'Audio Pending',
  PROCESSING:           'Processing',
  LEVEL1_PASSED:        'Level 1 Passed',
  REJECTED:             'Rejected',
};

export const STATUS_COLORS: Record<CandidateStatus, string> = {
  PENDING:              'bg-gray-100 text-gray-700',
  SYSTEM_CHECK_FAILED:  'bg-orange-100 text-orange-700',
  AUDIO_PENDING:        'bg-blue-100 text-blue-700',
  PROCESSING:           'bg-purple-100 text-purple-700',
  LEVEL1_PASSED:        'bg-green-100 text-green-700',
  REJECTED:             'bg-red-100 text-red-700',
};
