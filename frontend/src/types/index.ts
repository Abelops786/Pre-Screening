export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'RECRUITER';

export type CandidateStatus =
  | 'PENDING'
  | 'SYSTEM_CHECK_FAILED'
  | 'AUDIO_PENDING'
  | 'PROCESSING'
  | 'LEVEL1_PASSED'
  | 'REJECTED'
  | 'AUTO_DISQUALIFIED'
  | 'HIRED';

export type Department = 'INTERPRETATION' | 'SALES' | 'CUSTOMER_SERVICE';
export type JobStatus  = 'DRAFT' | 'PENDING' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED';
export type InterpretationClient = 'BIG_LANGUAGE' | 'TRANSPERFECT' | 'LANGO' | 'BOOSTLINGO';
export type PositionType = 'US_BASED' | 'INTERNATIONAL';
export type RoleType     = 'DEDICATED_HOURLY' | 'PER_MINUTE';

export interface DepartmentConfig {
  id: string;
  name: string;
  questionnaireType: Department;
  isActive: boolean;
  createdAt: string;
}

export type QFieldType = 'text' | 'textarea' | 'number' | 'radio' | 'checkbox' | 'select' | 'vocaroo' | 'confirm';

export interface QField {
  key: string;
  label: string;
  type: QFieldType;
  options?: string[];
  optionLabels?: Record<string, string>;
  optionsSource?: 'languages';
  required?: boolean;
  placeholder?: string;
  protected?: boolean;
  script?: string;
  guidance?: string;
  score?: number;                          // for confirm: points awarded when confirmed
  optionScores?: Record<string, number>;   // for radio/select/checkbox: points per option
  important?: boolean;                      // flagged as an important/scored question (max 3)
  importantWeight?: number;                 // points this important question is worth
  correctAnswer?: string;                   // the answer required to earn the points
  showIf?: { key?: string; equals?: string; includes?: string; jobPositionType?: string; jobRoleType?: string };
  hideIfJobHas?: string;
}

export interface ScoringConfig {
  weightQuestionnaire: number;
  weightAudio: number;
  weightSpeed: number;
  weightHeadphone: number;
  passThreshold: number;
}

export interface QSection {
  id: string;
  title: string;
  fields: QField[];
  showIf?: { jobPositionType?: string; jobRoleType?: string };
}

export interface QuestionnaireSchema {
  sections: QSection[];
}

export interface QuestionnaireTemplate {
  id: string;
  department: Department;
  schema: QuestionnaireSchema;
  updatedAt?: string;
}

export interface Job {
  id: string;
  slug?: string | null;
  urlKey?: string;
  title: string;
  department: Department;
  departmentLabel?: string | null;
  language?: string | null;
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
  // Extended diagnostics (admin/recruiter-only)
  screenResolution?: string | null;
  cpuCores?: number | null;
  deviceMemory?: number | null;
  connectionType?: string | null;
  networkLatency?: number | null;
  networkJitter?: number | null;
  micInputLevel?: number | null;
  backgroundNoise?: number | null;
  browserVersion?: string | null;
  timezone?: string | null;
  cpuArchitecture?: string | null;
  gpuRenderer?: string | null;
  ipAddress?: string | null;
  ipCountry?: string | null;
  vpnDetected?: boolean | null;
  vpnReason?: string | null;
}

export interface AudioRecording {
  id: string;
  audioUrl: string;
  durationSeconds: number;
  transcript: string | null;
  fluencyScore: number | null;
  aiScore?: number | null;
  aiFeedback?: string | null;
  languageDetected: string | null;
  flaggedForHumanReview: boolean;
  processedAt: string | null;
}

export interface ScoreBreakdown {
  questionnaire?: { score: number | null; earned: number; max: number; weight: number };
  audio?: { score: number; aiScore: number | null; weight: number };
  speed?: { score: number; download: number | null; upload: number | null; weight: number };
  headphone?: { score: number; weight: number };
  passThreshold?: number;
}

export interface FilterResult {
  id: string;
  filtersApplied: unknown;
  rejectionReasons: string[];
  qualified: boolean;
  totalScore?: number | null;
  scoreBreakdown?: ScoreBreakdown | null;
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
  yearsExperience?: number | null;
  availabilityShift?: string | null;
  certifications: string[];
  cvUrl: string | null;
  certificateUrl: string | null;
  selectedLanguage?: string | null;
  status: CandidateStatus;
  department?: Department | null;
  jobId?: string | null;
  vocarooUrl?: string | null;
  questionnaireAnswers?: Record<string, unknown> | null;
  autoDisqualifyReason?: string | null;
  rejectionReason?: string | null;
  rejectionDetail?: string | null;
  createdAt: string;
  job?: { id: string; title: string; department: string; departmentLabel?: string | null } | null;
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
    hired?: number;
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
  HIRED:                'Hired',
};

export const STATUS_COLORS: Record<CandidateStatus, string> = {
  PENDING:              'bg-gray-100 text-gray-700',
  SYSTEM_CHECK_FAILED:  'bg-orange-100 text-orange-700',
  AUDIO_PENDING:        'bg-blue-100 text-blue-700',
  PROCESSING:           'bg-purple-100 text-purple-700',
  LEVEL1_PASSED:        'bg-green-100 text-green-700',
  REJECTED:             'bg-red-100 text-red-700',
  AUTO_DISQUALIFIED:    'bg-rose-100 text-rose-700',
  HIRED:                'bg-emerald-100 text-emerald-700',
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
  'Burmese','Cambodian (Khmer)','Cantonese','English','French','French US Based',
  'Gujarati','Haitian Creole','Hindi','Hmong','Korean','Laotian','Lingala',
  'Mandarin','Marshallese','Pashto','Portuguese','Rohingya','Russian',
  'Slovenian','Somali','Spanish','Swahili','Tagalog','Turkish','Ukrainian',
  'Urdu','Vietnamese','Wolof',
];
