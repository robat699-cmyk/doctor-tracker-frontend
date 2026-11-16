export const SPECIALIZATIONS = [
  'Cardiology',
  'Neurology',
  'Orthopedics',
  'Pediatrics',
  'General Medicine',
  'Dermatology',
  'Oncology',
] as const;

export type Specialization = (typeof SPECIALIZATIONS)[number];

export const PATIENT_CONDITIONS = [
  'Stable',
  'Critical',
  'Under Observation',
  'Discharged',
] as const;

export type PatientCondition = (typeof PATIENT_CONDITIONS)[number];

export const DISEASE_TYPES = [
  'Cardiovascular Disease',
  'Neurological Disorder',
  'Diabetes & Endocrine',
  'Respiratory / Asthma',
  'Oncology / Tumor',
  'Orthopedic / Musculoskeletal',
  'Infectious Disease',
  'Dermatological Condition',
  'Pediatric Care',
  'General Medicine',
] as const;

export type DiseaseType = (typeof DISEASE_TYPES)[number];

export const CLINICAL_TEST_TYPES = [
  'CBC (Complete Blood Count)',
  'Lipid Panel',
  'HbA1c',
  'Blood Glucose (Fasting)',
  'ECG (12-Lead)',
  'Echocardiogram',
  'Chest X-Ray',
  'MRI / CT Scan',
  'Liver Function (LFT)',
  'Renal Panel (KFT)',
  'Thyroid Panel (TSH/T3/T4)',
  'Urinalysis',
  'Biopsy / Histopathology',
  'Pulmonary Function (PFT)',
] as const;

export type ClinicalTestType = (typeof CLINICAL_TEST_TYPES)[number];

export const TEST_STATUSES = ['Normal', 'Abnormal', 'Pending'] as const;
export type TestStatus = (typeof TEST_STATUSES)[number];

export const SESSION_TYPES = [
  'Consultation',
  'Follow-up Check-in',
  'Diagnostic Lab Session',
  'Specialist Review',
  'Post-Op Check-in',
] as const;
export type SessionType = (typeof SESSION_TYPES)[number];

export const BOOKING_STATUSES = [
  'Scheduled',
  'Confirmed',
  'Reminded',
  'Completed',
  'Cancelled',
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const REMINDER_CHANNELS = ['SMS', 'Voice Call'] as const;
export type ReminderChannel = (typeof REMINDER_CHANNELS)[number];

export const GENDERS = ['Male', 'Female', 'Other'] as const;

export type Gender = (typeof GENDERS)[number];

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface Doctor {
  id: number;
  name: string;
  specialization: Specialization | string;
  hospital: string;
  phone: string;
  email: string;
  patientsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PatientTestReport {
  id: number;
  patientId: number;
  testType: ClinicalTestType | string;
  resultValue: string;
  status: TestStatus;
  notes: string;
  checkedAt: string;
  createdAt: string;
}

export interface Patient {
  id: number;
  name: string;
  age: number;
  gender: Gender | string;
  condition: PatientCondition;
  diseaseType: string;
  lastCheckIn: string | null;
  testsCount?: number;
  abnormalTestsCount?: number;
  doctorId: number | null;
  doctorName: string | null;
  doctorPhone?: string | null;
  contactNumber: string;
  admissionDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface PatientDetail extends Patient {
  tests: PatientTestReport[];
}

export interface DoctorDetail extends Doctor {
  patients: Patient[];
}

export interface PreBooking {
  id: number;
  patientId: number | null;
  patientName: string;
  patientPhone: string;
  doctorId: number;
  doctorName: string;
  doctorSpecialization: string;
  doctorPhone: string;
  diseaseType: string;
  sessionType: SessionType | string;
  scheduledAt: string;
  status: BookingStatus;
  remindPatient: boolean;
  remindDoctor: boolean;
  patientReminderSentAt: string | null;
  doctorReminderSentAt: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReminderLog {
  id: number;
  bookingId: number;
  recipientType: 'patient' | 'doctor';
  recipientName: string;
  phoneNumber: string;
  channel: ReminderChannel;
  message: string;
  sentAt: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ConditionDistributionItem {
  condition: PatientCondition;
  count: number;
  color: string;
}

export interface DoctorLoadItem {
  doctorId: number;
  doctorName: string;
  specialization: string;
  patientsCount: number;
}

export interface AdmissionTrendItem {
  date: string;
  label: string;
  admissions: number;
}

export interface ClinicalAlert {
  patientId: number;
  patientName: string;
  doctorName: string | null;
  admissionDate: string;
  condition: PatientCondition;
}

export interface DashboardAnalytics {
  totalDoctors: number;
  totalPatients: number;
  avgPatientsPerDoctor: number;
  criticalCount: number;
  upcomingBookingsCount?: number;
  doctorsDeltaPercent: number;
  patientsDeltaPercent: number;
  avgLoadDeltaPercent: number;
  criticalDeltaPercent: number;
  conditionDistribution: ConditionDistributionItem[];
  patientsPerDoctor: DoctorLoadItem[];
  admissionTrend: AdmissionTrendItem[];
  recentPatients: Patient[];
  alerts: ClinicalAlert[];
}

export interface DoctorFormInput {
  name: string;
  specialization: string;
  hospital: string;
  phone: string;
  email: string;
}

export interface PatientFormInput {
  name: string;
  age: string | number;
  gender: string;
  condition: string;
  diseaseType: string;
  lastCheckIn?: string;
  doctorId: string | number | null;
  contactNumber: string;
  admissionDate: string;
}

export interface PatientTestFormInput {
  testType: string;
  resultValue: string;
  status: TestStatus;
  notes: string;
  checkedAt: string;
}

export interface PreBookingFormInput {
  patientId: string | number | null;
  patientName: string;
  patientPhone: string;
  doctorId: string | number;
  diseaseType: string;
  sessionType: string;
  scheduledAt: string;
  status?: BookingStatus;
  remindPatient: boolean;
  remindDoctor: boolean;
  notes: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+]?[\d\s()-]{7,20}$/;

export function validateLoginInput(email: string, password: string): ValidationResult {
  const errors: Record<string, string> = {};
  if (!email.trim()) {
    errors.email = 'Email address is required.';
  } else if (!EMAIL_REGEX.test(email.trim())) {
    errors.email = 'Enter a valid email address.';
  }

  if (!password) {
    errors.password = 'Password is required.';
  } else if (password.length < 6) {
    errors.password = 'Password must be at least 6 characters.';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateDoctorInput(input: DoctorFormInput): ValidationResult {
  const errors: Record<string, string> = {};

  if (!input.name.trim()) {
    errors.name = 'Doctor name is required.';
  } else if (input.name.trim().length < 3) {
    errors.name = 'Name must be at least 3 characters.';
  }

  if (!input.specialization.trim()) {
    errors.specialization = 'Select a clinical specialization.';
  }

  if (!input.hospital.trim()) {
    errors.hospital = 'Affiliated hospital is required.';
  }

  if (!input.phone.trim()) {
    errors.phone = 'Phone number is required.';
  } else if (!PHONE_REGEX.test(input.phone.trim())) {
    errors.phone = 'Enter a valid phone number (7–20 digits).';
  }

  if (!input.email.trim()) {
    errors.email = 'Email address is required.';
  } else if (!EMAIL_REGEX.test(input.email.trim())) {
    errors.email = 'Enter a valid email address.';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function validatePatientInput(input: PatientFormInput): ValidationResult {
  const errors: Record<string, string> = {};

  if (!input.name.trim()) {
    errors.name = 'Patient name is required.';
  } else if (input.name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters.';
  }

  const parsedAge = typeof input.age === 'number' ? input.age : Number(input.age);
  if (input.age === '' || Number.isNaN(parsedAge)) {
    errors.age = 'Age is required.';
  } else if (!Number.isInteger(parsedAge) || parsedAge < 0 || parsedAge > 125) {
    errors.age = 'Age must be a whole number between 0 and 125.';
  }

  if (!GENDERS.includes(input.gender as Gender)) {
    errors.gender = 'Select a valid gender.';
  }

  if (!PATIENT_CONDITIONS.includes(input.condition as PatientCondition)) {
    errors.condition = 'Select a clinical condition.';
  }

  if (!input.diseaseType || !input.diseaseType.trim()) {
    errors.diseaseType = 'Select or enter a disease type.';
  }

  if (!input.contactNumber.trim()) {
    errors.contactNumber = 'Contact number is required.';
  } else if (!PHONE_REGEX.test(input.contactNumber.trim())) {
    errors.contactNumber = 'Enter a valid contact number (7–20 digits).';
  }

  if (!input.admissionDate.trim()) {
    errors.admissionDate = 'Admission date is required.';
  } else if (Number.isNaN(Date.parse(input.admissionDate))) {
    errors.admissionDate = 'Enter a valid admission date.';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateTestReportInput(input: PatientTestFormInput): ValidationResult {
  const errors: Record<string, string> = {};

  if (!input.testType.trim()) {
    errors.testType = 'Select a test type.';
  }
  if (!input.resultValue.trim()) {
    errors.resultValue = 'Enter a test finding or value.';
  }
  if (!TEST_STATUSES.includes(input.status)) {
    errors.status = 'Select a valid test status.';
  }
  if (!input.checkedAt.trim() || Number.isNaN(Date.parse(input.checkedAt))) {
    errors.checkedAt = 'Enter a valid check-in date/time.';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateBookingInput(input: PreBookingFormInput): ValidationResult {
  const errors: Record<string, string> = {};

  if (!input.patientName.trim() || input.patientName.trim().length < 2) {
    errors.patientName = 'Patient name is required.';
  }
  if (!input.patientPhone.trim()) {
    errors.patientPhone = 'Patient phone number is required for reminders.';
  } else if (!PHONE_REGEX.test(input.patientPhone.trim())) {
    errors.patientPhone = 'Enter a valid phone number (7–20 digits).';
  }
  const parsedDocId = Number(input.doctorId);
  if (!input.doctorId || Number.isNaN(parsedDocId) || parsedDocId <= 0) {
    errors.doctorId = 'Select an assigned doctor.';
  }
  if (!input.diseaseType.trim()) {
    errors.diseaseType = 'Select a disease type.';
  }
  if (!input.sessionType.trim()) {
    errors.sessionType = 'Select a session type.';
  }
  if (!input.scheduledAt.trim() || Number.isNaN(Date.parse(input.scheduledAt))) {
    errors.scheduledAt = 'Select a valid scheduled date and time.';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function buildReminderMessage(params: {
  recipientType: 'patient' | 'doctor';
  patientName: string;
  doctorName: string;
  diseaseType: string;
  sessionType: string;
  scheduledAt: string;
}): string {
  const formattedTime = params.scheduledAt.replace('T', ' at ');
  if (params.recipientType === 'patient') {
    return `DoctorTracker Reminder: Hello ${params.patientName}, your ${params.sessionType} (${params.diseaseType}) with ${params.doctorName} is pre-booked for ${formattedTime}.`;
  }
  return `DoctorTracker Provider Alert: ${params.doctorName}, upcoming ${params.sessionType} for patient ${params.patientName} (${params.diseaseType}) is scheduled for ${formattedTime}.`;
}

export function clampFloatingPosition(
  pos: { x: number; y: number },
  box: { width: number; height: number },
  viewport: { width: number; height: number },
  margin = 12
): { x: number; y: number } {
  const maxX = Math.max(margin, viewport.width - box.width - margin);
  const maxY = Math.max(margin, viewport.height - box.height - margin);
  return {
    x: Math.round(Math.min(Math.max(margin, pos.x), maxX)),
    y: Math.round(Math.min(Math.max(margin, pos.y), maxY)),
  };
}

export function computeAverageLoad(totalPatients: number, totalDoctors: number): number {
  if (totalDoctors <= 0 || totalPatients <= 0) {
    return 0;
  }
  return Number((totalPatients / totalDoctors).toFixed(1));
}

export function computeTrendPercent(currentCount: number, previousCount: number): number {
  if (previousCount <= 0) {
    return currentCount > 0 ? 100 : 0;
  }
  return Math.round(((currentCount - previousCount) / previousCount) * 100);
}

export function computePaginationMeta(total: number, page: number, limit: number) {
  const safeLimit = Math.max(1, limit);
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const offset = (safePage - 1) * safeLimit;
  return {
    total,
    page: safePage,
    limit: safeLimit,
    totalPages,
    offset,
  };
}

export const CONDITION_COLORS: Record<PatientCondition, string> = {
  Stable: '#059669',
  Critical: '#DC2626',
  'Under Observation': '#D97706',
  Discharged: '#64748B',
};

export function buildConditionDistribution(
  counts: Partial<Record<PatientCondition, number>>
): ConditionDistributionItem[] {
  return PATIENT_CONDITIONS.map((condition) => ({
    condition,
    count: counts[condition] ?? 0,
    color: CONDITION_COLORS[condition],
  }));
}

export function getInitials(name: string): string {
  const parts = name
    .replace(/^(Dr\.|Mr\.|Ms\.|Mrs\.)\s+/i, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return 'AD';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export type AssistantMode = 'advisor' | 'fast' | 'maps';

export interface MapReviewSnippet {
  text: string;
  author?: string;
}

export interface MapGroundingLink {
  title: string;
  uri: string;
  reviewSnippets: MapReviewSnippet[];
}

export interface ChatMessage {
  id: number;
  role: 'user' | 'model';
  mode: AssistantMode;
  model: string;
  content: string;
  mapLinks: MapGroundingLink[];
  createdAt: string;
}

export interface ClinicalContextSnapshot {
  totalDoctors: number;
  totalPatients: number;
  avgPatientsPerDoctor: number;
  criticalCount: number;
  upcomingBookingsCount?: number;
  doctorsSummary: Array<{
    name: string;
    specialization: string;
    hospital: string;
    patientsCount: number;
  }>;
  criticalPatients: Array<{
    name: string;
    age: number;
    condition: string;
    diseaseType?: string;
    lastCheckIn?: string | null;
    doctorName: string | null;
    admissionDate: string;
  }>;
  upcomingBookingsSummary?: Array<{
    patientName: string;
    doctorName: string;
    diseaseType: string;
    sessionType: string;
    scheduledAt: string;
    status: string;
  }>;
}

interface RawGroundingChunk {
  maps?: {
    uri?: string;
    title?: string;
    placeAnswerSources?: {
      reviewSnippets?: Array<{
        snippet?: string;
        text?: string;
        authorAttribution?: { displayName?: string };
      }>;
    };
  };
}

export function extractMapsGroundingLinks(chunks: unknown): MapGroundingLink[] {
  if (!Array.isArray(chunks)) return [];
  const seen = new Set<string>();
  const results: MapGroundingLink[] = [];

  for (const raw of chunks as RawGroundingChunk[]) {
    const uri = raw?.maps?.uri?.trim();
    if (!uri || seen.has(uri)) continue;
    seen.add(uri);

    const title = raw?.maps?.title?.trim() || 'View on Google Maps';
    const rawSnippets = raw?.maps?.placeAnswerSources?.reviewSnippets;
    const reviewSnippets: MapReviewSnippet[] = Array.isArray(rawSnippets)
      ? rawSnippets
          .map((s) => ({
            text: (s.text || s.snippet || '').trim(),
            author: s.authorAttribution?.displayName?.trim(),
          }))
          .filter((s) => s.text.length > 0)
      : [];

    results.push({ title, uri, reviewSnippets });
  }

  return results;
}

export function buildClinicalSystemInstruction(
  mode: AssistantMode,
  snapshot: ClinicalContextSnapshot
): string {
  const doctorLines = snapshot.doctorsSummary
    .slice(0, 15)
    .map(
      (d) => `- ${d.name} (${d.specialization}, ${d.hospital}): ${d.patientsCount} assigned patients`
    )
    .join('\n');

  const criticalLines =
    snapshot.criticalPatients.length > 0
      ? snapshot.criticalPatients
          .slice(0, 10)
          .map(
            (p) =>
              `- ${p.name} (Age ${p.age}, ${p.condition}, Disease: ${p.diseaseType || 'General Medicine'}, Last Check-in: ${p.lastCheckIn || p.admissionDate}, Doctor: ${p.doctorName || 'Unassigned'})`
          )
          .join('\n')
      : '- None currently flagged';

  const bookingLines =
    snapshot.upcomingBookingsSummary && snapshot.upcomingBookingsSummary.length > 0
      ? snapshot.upcomingBookingsSummary
          .slice(0, 8)
          .map(
            (b) =>
              `- ${b.scheduledAt.replace('T', ' ')}: ${b.patientName} with ${b.doctorName} (${b.sessionType}, ${b.diseaseType}, Status: ${b.status})`
          )
          .join('\n')
      : '- No upcoming pre-bookings scheduled';

  const roleHeader =
    mode === 'fast'
      ? 'You are DoctorTracker Fast Triage Assistant. Respond concisely in crisp bullet points for rapid clinical operations review.'
      : mode === 'maps'
        ? 'You are DoctorTracker Facility & Referral Locator. Use Google Maps grounding to provide accurate, up-to-date hospital, clinic, diagnostic lab, and pharmacy details with clear addresses and practical guidance.'
        : 'You are DoctorTracker Clinical Operations Advisor. Help healthcare administrators manage provider caseloads, patient triage prioritization, disease tracking, lab test reviews, and pre-booking phone reminders accurately.';

  return `${roleHeader}

Live DoctorTracker Operations Snapshot:
- Total Doctors: ${snapshot.totalDoctors}
- Total Patients: ${snapshot.totalPatients}
- Average Caseload: ${snapshot.avgPatientsPerDoctor} patients/doctor
- Critical Patients: ${snapshot.criticalCount}
- Upcoming Pre-Booked Sessions: ${snapshot.upcomingBookingsCount ?? 0}

Active Provider Roster:
${doctorLines || '- No providers registered'}

Priority / Critical Patients:
${criticalLines}

Upcoming Pre-Booked Sessions:
${bookingLines}

Guidelines:
- Ground your answers in the live roster, disease types, check-ins, and pre-booking metrics above when asked about internal records.
- Do not fabricate patient IDs, lab values, or unverified medical claims.
- Keep responses structured, professional, and actionable for clinical coordinators.`;
}

export type ThemeMode = 'light' | 'dark';

export function resolveThemeMode(stored: string | null | undefined): ThemeMode {
  return stored === 'dark' ? 'dark' : 'light';
}
