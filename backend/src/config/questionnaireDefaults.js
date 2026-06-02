/**
 * Default questionnaire definitions — used to seed editable templates.
 *
 * Field types: text | textarea | number | radio | checkbox | select | vocaroo | confirm
 * Special:
 *   optionsSource: 'languages'  → options come from the interpreter language list
 *   showIf: { key, equals }     → field/section only shows when another answer matches
 *   protected: true             → key is used by backend logic; label editable, key/delete locked in UI
 *
 * Note: full name / email / phone / location are always collected by the app as a
 * fixed first step and are NOT part of these editable schemas.
 */

// ── compact builders ──────────────────────────────────────────
const radio    = (key, label, options, extra = {}) => ({ key, label, type: 'radio', options, ...extra });
const yesno    = (key, label, extra = {}) => radio(key, label, ['Yes', 'No'], extra);
const textarea = (key, label, extra = {}) => ({ key, label, type: 'textarea', ...extra });
const text     = (key, label, extra = {}) => ({ key, label, type: 'text', ...extra });
const number   = (key, label, extra = {}) => ({ key, label, type: 'number', ...extra });
const checkbox = (key, label, options, extra = {}) => ({ key, label, type: 'checkbox', options, ...extra });
const select   = (key, label, options, extra = {}) => ({ key, label, type: 'select', options, ...extra });
const vocaroo  = (key, label, extra = {}) => ({ key, label, type: 'vocaroo', ...extra });
const confirm  = (key, label, extra = {}) => ({ key, label, type: 'confirm', ...extra });

let sid = 0;
const section = (title, fields, extra = {}) => ({ id: `s${++sid}`, title, fields, ...extra });

// ══════════════════════════════════════════════════════════════
// CUSTOMER SERVICE
// ══════════════════════════════════════════════════════════════
sid = 0;
const CUSTOMER_SERVICE = {
  sections: [
    section('English & Communication Skills', [
      radio('englishProficiency', 'English proficiency level', ['Native', 'Near-native / Fluent', 'Intermediate']),
      yesno('workedEnglishEnv', 'Worked in an English-speaking environment before?'),
      radio('comfortSpeakingEnglish', 'Comfort speaking with customers all day in English?', ['Very comfortable', 'Somewhat comfortable', 'Not comfortable']),
    ]),
    section('Voice Recording (Mandatory)', [
      vocaroo('vocarooUrl', 'Paste your Vocaroo recording link', {
        required: true,
        script: 'Hello, thank you for calling. My name is Sarah/John, and I\'ll be happy to assist you today. I understand how important it is to get this resolved as quickly as possible. Let me review your information and see the best way I can help. Thank you for your patience. I truly appreciate it. Please allow me one moment while I check this for you.',
        guidance: 'Sound friendly, professional, natural, clear, and customer-focused.',
      }),
    ]),
    section('Customer Service Experience', [
      yesno('hasCSExperience', 'Previous customer service experience?'),
      checkbox('csExperienceTypes', 'Type of experience (select all that apply)', ['Call center', 'Chat support', 'Email support', 'Technical support', 'Appointment scheduling', 'Billing support', 'Insurance support', 'Sales support', 'Hospitality / Travel', 'Healthcare support']),
      textarea('csExperienceDesc', 'Briefly describe your experience'),
    ]),
    section('Customer Handling & Communication', [
      textarea('handleUpsetCustomers', 'How do you handle upset or frustrated customers?'),
      textarea('difficultIssueExample', 'Describe a difficult customer issue you resolved successfully'),
      radio('comfortRepetitive', 'Comfort with repetitive conversations and multitasking?', ['Very comfortable', 'Somewhat comfortable', 'Not comfortable']),
    ]),
    section('Remote Work & Discipline', [
      yesno('workedRemotely', 'Worked remotely before?'),
      textarea('remoteProductivity', 'How did you stay productive working from home?', { showIf: { key: 'workedRemotely', equals: 'Yes' } }),
      yesno('comfortFixedSchedule', 'Comfortable with a fixed-schedule remote role with attendance expectations?'),
    ]),
    section('Coachability & Teamwork', [
      textarea('feedbackResponse', 'How do you respond to supervisor feedback?'),
      yesno('comfortQATracking', 'Comfortable with QA evaluations, attendance tracking, productivity monitoring, and coaching?'),
    ]),
    section('Work Stability & Commitment', [
      radio('lookingFor', 'What are you primarily looking for?', ['Long-term career opportunity', 'Temporary job', 'Additional income', 'Exploring options']),
      textarea('whyChanging', 'Why are you interested in changing jobs?'),
      yesno('commitSixMonths', 'Can you commit to this role for at least 6 months?'),
    ]),
    section('Schedule & Availability', [
      yesno('availableFullTime', 'Available for a fixed full-time schedule?'),
      yesno('hasOtherJob', 'Currently have another job?'),
      yesno('otherJobInterference', 'Will it interfere with your assigned schedule?', { showIf: { key: 'hasOtherJob', equals: 'Yes' } }),
      yesno('availableIn2Weeks', 'Available to start within 1–2 weeks?'),
      textarea('upcomingCommitments', 'Any upcoming commitments that may affect availability?', { placeholder: 'Travel, studies, second job, etc.' }),
    ]),
    section('Attendance & Reliability', [
      yesno('hadAttendanceIssues', 'Attendance or punctuality issues in previous jobs?'),
      textarea('attendanceExplanation', 'Please explain', { showIf: { key: 'hadAttendanceIssues', equals: 'Yes' } }),
      textarea('backupPlan', 'Backup plan if internet or power goes out during your shift?'),
    ]),
    section('Technical Requirements', [
      yesno('hasLaptop', 'Own laptop or desktop?'),
      yesno('hasHeadset', 'USB headset?'),
      yesno('downloadOk', 'Download speed ≥ 20 Mbps?'),
      yesno('uploadOk', 'Upload speed ≥ 10 Mbps?'),
      textarea('workspaceDesc', 'Describe your workspace (noise, lighting, interruptions)'),
    ]),
    section('Final Confirmation', [
      confirm('finalConfirm', 'I confirm all information is accurate and I understand this is a structured remote position with attendance, QA, and productivity expectations.', { required: true }),
    ]),
  ],
};

// ══════════════════════════════════════════════════════════════
// SALES
// ══════════════════════════════════════════════════════════════
sid = 0;
const SALES = {
  sections: [
    section('Location & Eligibility', [
      text('country', 'Country of Residence', { required: true, protected: true }),
      text('city', 'City'),
    ]),
    section('English & Communication Skills', [
      radio('englishProficiency', 'English proficiency level', ['Native', 'Near-native / Fluent', 'Intermediate']),
      yesno('workedEnglishEnv', 'Worked in an English-speaking environment before?'),
      textarea('englishExpDesc', 'Describe your experience communicating with customers in English'),
    ]),
    section('Voice Recording (Mandatory)', [
      vocaroo('vocarooUrl', 'Paste your Vocaroo recording link', {
        required: true,
        script: 'Hi, is this Mr. Jones? Great, my name is Sarah/John on a recorded line, and I\'m calling today because our records indicate that you may qualify for a low cost or even free health insurance plan. Now just to make sure you qualify, I need to confirm that you are still not on Medicare or Medicaid, is that correct? Great, it sounds like you may qualify for health insurance benefits that are typically very low cost, or even free. Let me get you over to a licensed insurance agent so they can go over the benefits with you. One moment please.',
        guidance: 'Sound friendly, natural, conversational, and confident.',
      }),
    ]),
    section('Sales & Customer Service Experience', [
      yesno('hasExp', 'Previous customer service or sales experience?'),
      checkbox('expTypes', 'Type of experience (select all)', ['Inbound customer service', 'Outbound sales', 'Lead generation', 'Appointment setting', 'Membership sales', 'Travel industry', 'Collections', 'Technical support']),
      textarea('expDesc', 'Briefly describe your experience'),
    ]),
    section('Sales Targets & Performance', [
      yesno('comfortKPIs', 'Comfortable working with sales goals and KPIs?'),
      checkbox('metricsUsed', 'Worked with these metrics? (select all)', ['Sales targets', 'Conversion rate', 'Call quotas', 'QA evaluations', 'Attendance metrics', 'Productivity metrics']),
    ]),
    section('Remote Work & Discipline', [
      yesno('workedRemotely', 'Worked remotely before?'),
      textarea('remoteProductivity', 'How did you stay productive at home?', { showIf: { key: 'workedRemotely', equals: 'Yes' } }),
      yesno('comfortMonitored', 'Comfortable with a fixed-schedule, monitored remote role?'),
    ]),
    section('Sales Mindset & Pressure Tolerance', [
      radio('comfortRejection', 'Comfort handling rejection and repetitive conversations?', ['Very comfortable', 'Somewhat comfortable', 'Not comfortable']),
      textarea('handleObjection', 'A customer says "I\'m interested, but I need to think about it." How do you respond?'),
    ]),
    section('Coachability & Work Stability', [
      textarea('feedbackResponse', 'How do you respond to supervisor feedback?'),
      radio('lookingFor', 'What are you primarily looking for?', ['Long-term career opportunity', 'Temporary job', 'Additional income', 'Exploring options']),
    ]),
    section('Availability', [
      yesno('hasOtherJob', 'Currently have another job?'),
      yesno('otherJobInterference', 'Will it interfere with your schedule?', { showIf: { key: 'hasOtherJob', equals: 'Yes' } }),
      yesno('availableIn2Weeks', 'Available to start within 1–2 weeks?'),
      textarea('upcomingCommitments', 'Any upcoming commitments?'),
    ]),
    section('Attendance, Technical & Final', [
      yesno('hadAttendanceIssues', 'Attendance or punctuality issues in previous jobs?'),
      textarea('attendanceExplanation', 'Please explain', { showIf: { key: 'hadAttendanceIssues', equals: 'Yes' } }),
      textarea('backupPlan', 'Backup plan if internet/power goes out?'),
      yesno('hasLaptop', 'Own laptop or desktop?'),
      yesno('hasHeadset', 'USB headset?'),
      yesno('downloadOk', 'Download ≥ 20 Mbps?'),
      yesno('uploadOk', 'Upload ≥ 10 Mbps?'),
      textarea('workspaceDesc', 'Describe your workspace'),
      confirm('finalConfirm', 'I confirm all information is accurate and I understand this is a structured remote position with attendance, QA, and performance expectations.', { required: true }),
    ]),
  ],
};

// ══════════════════════════════════════════════════════════════
// INTERPRETATION
// ══════════════════════════════════════════════════════════════
sid = 0;
const INTERPRETATION = {
  sections: [
    // Position Type / Role Type only show when not pre-set by the job (handled in renderer)
    section('Position Type', [
      radio('positionType', 'Which position are you applying for?', ['us_based', 'international'], {
        optionLabels: { us_based: 'U.S.-based position (must reside in the United States)', international: 'International position (outside the United States)' },
        hideIfJobHas: 'positionType',
      }),
    ]),
    section('Role Type', [
      radio('roleType', 'Which type of role are you applying for?', ['dedicated_hourly', 'per_minute'], {
        optionLabels: { dedicated_hourly: 'Dedicated hourly (fixed schedule)', per_minute: 'Per-minute / on-demand' },
        hideIfJobHas: 'roleType',
      }),
    ]),
    section('Language & Qualification', [
      select('languagePair', 'Language pair you are applying for', [], { optionsSource: 'languages', required: true, protected: true }),
      yesno('ridCertified', 'Do you hold a valid RID certification?', { showIf: { key: 'languagePair', includes: 'asl' }, protected: true }),
      radio('proficiencyLevel', 'Proficiency level in each language', ['Native', 'Bilingual', 'Professional working proficiency']),
      number('yearsExperience', 'Years of professional interpreting experience'),
    ]),
    section('Interpretation Experience', [
      checkbox('interpretationModes', 'Have you interpreted via:', ['Phone (OPI)', 'Video (VRI)', 'Both', 'Onsite (Face to Face)']),
      textarea('companiesWorkedWith', 'Companies or platforms you\'ve worked with', { placeholder: 'e.g. Language Line, TransPerfect…' }),
    ]),
    section('Specialization & Certifications', [
      checkbox('specializations', 'Fields you\'ve worked in (select all that apply)', ['Medical', 'Legal', 'Financial', 'Social Services', 'Emergency', 'None']),
      textarea('assignmentDesc', 'Describe type of assignments handled', { placeholder: 'e.g. ICU discharge, court hearings, 911 calls…' }),
      textarea('certifications', 'Interpreter certifications held (name + issuing body)'),
    ]),
    section('U.S. Location & Compliance', [
      yesno('residesInUS', 'Are you currently residing in the United States?', { protected: true }),
      text('usCity', 'City', { showIf: { key: 'residesInUS', equals: 'Yes' } }),
      text('usState', 'State', { showIf: { key: 'residesInUS', equals: 'Yes' } }),
      text('internetProvider', 'Internet provider', { showIf: { key: 'residesInUS', equals: 'Yes' } }),
      radio('locationComplianceConfirm', 'I confirm I will work from my true U.S. location and will not mask my location', ['Yes, I confirm', 'No'], { showIf: { key: 'residesInUS', equals: 'Yes' } }),
      radio('connectionType', 'Internet connection type', ['Direct home internet (ISP-based)', 'Office/corporate network', 'Shared or remote desktop', 'I connect through another system'], { showIf: { key: 'residesInUS', equals: 'Yes' } }),
    ], { showIf: { jobPositionType: 'US_BASED' } }),
    section('International Location Details', [
      text('intlCountry', 'Country'),
      text('intlCity', 'City'),
      radio('intlConnectionType', 'Internet connection type', ['Direct home internet', 'Office/corporate network', 'Shared or remote system']),
      yesno('stabilityConfirm', 'I confirm I will work from a stable, consistent location'),
    ], { showIf: { jobPositionType: 'INTERNATIONAL' } }),
    section('Availability & Schedule Commitment', [
      radio('canCommitSchedule', 'Able to commit to a fixed schedule within the work window?', ['Yes', 'No', 'Need to discuss']),
      yesno('hasOtherJob', 'Currently have another job?'),
      yesno('otherJobInterference', 'Will it interfere with your dedicated schedule?', { showIf: { key: 'hasOtherJob', equals: 'Yes' } }),
      yesno('scheduleCommitConfirm', 'Do you confirm full commitment to your assigned schedule?'),
    ]),
    section('Readiness to Start', [
      yesno('readyForAssessment', 'Available to complete client assessment and protocol training within 1–2 weeks?'),
      textarea('upcomingCommitments', 'Any upcoming commitments that may affect your start date?', { placeholder: 'Study / Travel / Other' }),
    ]),
    section('Technical Requirements', [
      yesno('hasLaptop', 'Own laptop or desktop?'),
      yesno('hasHeadset', 'USB headset?'),
      yesno('downloadOk', 'Download ≥ 20 Mbps?'),
      yesno('uploadOk', 'Upload ≥ 10 Mbps?'),
      yesno('lowLatency', 'Latency below 250 ms?'),
      yesno('hasWebcam', 'Webcam (min 720p)?'),
      yesno('workedRemoteBefore', 'Worked fully remotely before?'),
      yesno('hasQuietWorkspace', 'Quiet, interruption-free workspace?'),
      textarea('workspaceDesc', 'Describe your workspace'),
    ]),
    section('Ethics & Compliance', [
      radio('familiarWithEthics', 'Familiar with interpreter code of ethics and HIPAA?', ['Yes, both', 'Only code of ethics', 'Only HIPAA', 'No']),
      textarea('ethicsScenario', 'Describe a situation where you applied confidentiality, impartiality, accuracy, or protected sensitive information'),
      textarea('askedToOmit', 'Have you ever been asked to omit information or take sides? What did you do?'),
    ]),
    section('Performance & Final Confirmation', [
      radio('firstThingOnOPICall', 'What is the first thing you do when you receive an OPI call?', ['Introduce myself as the interpreter and follow protocol', 'Wait for the parties to start speaking', 'Ask who called first', "I'm not sure"]),
      yesno('availableForPeakHours', 'Able to stay available and responsive during peak hours?', { showIf: { jobRoleType: 'PER_MINUTE' } }),
      confirm('finalConfirm', 'I confirm that all information provided is accurate and truthful.', { required: true }),
    ]),
  ],
};

module.exports = {
  CUSTOMER_SERVICE,
  SALES,
  INTERPRETATION,
  byDepartment: {
    CUSTOMER_SERVICE,
    SALES,
    INTERPRETATION,
  },
};
