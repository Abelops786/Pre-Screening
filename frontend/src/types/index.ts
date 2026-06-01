export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'RECRUITER';

export type CandidateStatus =
  | 'PENDING'
  | 'SYSTEM_CHECK_FAILED'
  | 'AUDIO_PENDING'
  | 'PROCESSING'
  | 'LEVEL1_PASSED'
  | 'REJECTED'
  | 'AUTO_DISQUALIFIED';

export type Department = 'INTERPRETATION' | 'SALES' | 'CUSTOMER_SERVICE';
export type JobStatus  = 'DRAFT' | 'PENDING' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED';
export type InterpretationClient = 'BIG_LANGUAGE' | 'TRANSPERFECT' | 'LANGO' | 'BOOSTLINGO';
export type PositionType = 'US_BASED' | 'INTERNATIONAL';
export type RoleType     = 'DEDICATED_HOURLY' | 'PER_MINUTE';

export interface Job {
  id: string;
  title: string;
  department: Department;
  status: JobStatus;
  scheduledPublishAt?: string | null;
  client?: InterpretationClient | null;
  positionType?: PositionType | null;
  roleType?: RoleType | null;
  description?: string | null;
  minDownloadSpeed: number;
  minUploadSpeed: number;
  workWindow?: string | null;
  createdAt: string;
  _count?: { candidates: number };
}

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

export interface Interview {
  id: string;
  msTeamsLink: string | null;
  scheduledTime: string;
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
  interviews?: Interview[];
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
  AUTO_DISQUALIFIED:    'Auto Disqualified',
};

export const STATUS_COLORS: Record<CandidateStatus, string> = {
  PENDING:              'bg-gray-100 text-gray-700',
  SYSTEM_CHECK_FAILED:  'bg-orange-100 text-orange-700',
  AUDIO_PENDING:        'bg-blue-100 text-blue-700',
  PROCESSING:           'bg-purple-100 text-purple-700',
  LEVEL1_PASSED:        'bg-green-100 text-green-700',
  REJECTED:             'bg-red-100 text-red-700',
  AUTO_DISQUALIFIED:    'bg-rose-100 text-rose-700',
};

export const DEPT_LABELS: Record<Department, string> = {
  INTERPRETATION:   'Interpretation',
  SALES:            'Sales',
  CUSTOMER_SERVICE: 'Customer Service',
};

export const DEPT_COLORS: Record<Department, string> = {
  INTERPRETATION:   'bg-indigo-100 text-indigo-700',
  SALES:            'bg-amber-100 text-amber-700',
  CUSTOMER_SERVICE: 'bg-teal-100 text-teal-700',
};

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  DRAFT:     'Draft',
  PENDING:   'Pending Review',
  SCHEDULED: 'Scheduled',
  PUBLISHED: 'Published',
  ARCHIVED:  'Archived',
};

export const JOB_STATUS_COLORS: Record<JobStatus, string> = {
  DRAFT:     'bg-gray-100 text-gray-600',
  PENDING:   'bg-yellow-100 text-yellow-700',
  SCHEDULED: 'bg-blue-100 text-blue-700',
  PUBLISHED: 'bg-green-100 text-green-700',
  ARCHIVED:  'bg-slate-100 text-slate-500',
};

export const INTERPRETATION_LANGUAGES = [
  'Acholi','Afrikaans','Albanian','Arabic','ASL','Azerbaijani','Bengali',
  'Burmese','Cambodian (Khmer)','Cantonese','French','French US Based',
  'Gujarati','Haitian Creole','Hindi','Hmong','Korean','Laotian','Lingala',
  'Mandarin','Marshallese','Pashto','Portuguese','Rohingya','Russian',
  'Slovenian','Somali','Spanish','Swahili','Tagalog','Turkish','Ukrainian',
  'Urdu','Vietnamese','Wolof',
];
