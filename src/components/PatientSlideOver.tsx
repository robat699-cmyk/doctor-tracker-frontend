import { useEffect, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import {
  DISEASE_TYPES,
  GENDERS,
  PATIENT_CONDITIONS,
  validatePatientInput,
  type Doctor,
  type Patient,
  type PatientFormInput,
} from '../lib/clinical';

interface PatientSlideOverProps {
  open: boolean;
  patient: Patient | null;
  doctors: Doctor[];
  lockedDoctor?: { id: number; name: string } | null;
  onClose: () => void;
  onSubmit: (payload: PatientFormInput) => Promise<void>;
}

function getTodayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function getNowLocalInput(): string {
  const now = new Date();
  const tzOffset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
}

export function PatientSlideOver({
  open,
  patient,
  doctors,
  lockedDoctor = null,
  onClose,
  onSubmit,
}: PatientSlideOverProps) {
  const [form, setForm] = useState<PatientFormInput>({
    name: '',
    age: '',
    gender: 'Male',
    condition: 'Stable',
    diseaseType: DISEASE_TYPES[0],
    lastCheckIn: getNowLocalInput(),
    doctorId: '',
    contactNumber: '',
    admissionDate: getTodayIso(),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (patient) {
      setForm({
        name: patient.name,
        age: String(patient.age),
        gender: patient.gender,
        condition: patient.condition,
        diseaseType: patient.diseaseType || DISEASE_TYPES[0],
        lastCheckIn: patient.lastCheckIn ? patient.lastCheckIn.slice(0, 16) : getNowLocalInput(),
        doctorId: patient.doctorId ?? '',
        contactNumber: patient.contactNumber,
        admissionDate: patient.admissionDate,
      });
    } else {
      setForm({
        name: '',
        age: '',
        gender: 'Male',
        condition: 'Stable',
        diseaseType: DISEASE_TYPES[0],
        lastCheckIn: getNowLocalInput(),
        doctorId: lockedDoctor ? String(lockedDoctor.id) : doctors[0]?.id ?? '',
        contactNumber: '',
        admissionDate: getTodayIso(),
      });
    }
    setErrors({});
    setServerError(null);
  }, [open, patient, lockedDoctor, doctors]);

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setServerError(null);
    const check = validatePatientInput(form);
    if (!check.valid) {
      setErrors(check.errors);
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        name: form.name.trim(),
        age: Number(form.age),
        gender: form.gender,
        condition: form.condition,
        diseaseType: form.diseaseType.trim(),
        lastCheckIn: form.lastCheckIn?.trim() || getNowLocalInput(),
        doctorId: lockedDoctor
          ? lockedDoctor.id
          : form.doctorId === '' || form.doctorId === null
            ? null
            : Number(form.doctorId),
        contactNumber: form.contactNumber.trim(),
        admissionDate: form.admissionDate,
      });
      onClose();
    } catch (err: unknown) {
      const apiErr = err as {
        response?: { data?: { message?: string; errors?: Record<string, string> } };
      };
      if (apiErr.response?.data?.errors) {
        setErrors(apiErr.response.data.errors);
      }
      setServerError(apiErr.response?.data?.message || 'Unable to save patient record.');
    } finally {
      setSubmitting(false);
    }
  }

  const diseaseOptions = DISEASE_TYPES.includes(form.diseaseType as (typeof DISEASE_TYPES)[number])
    ? [...DISEASE_TYPES]
    : [form.diseaseType, ...DISEASE_TYPES].filter(Boolean);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="patient-drawer-title"
    >
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-[480px] bg-white dark:bg-slate-900 h-full shadow-xl border-l border-slate-200 dark:border-slate-800 flex flex-col animate-slide-in-right">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 id="patient-drawer-title" className="text-lg font-semibold text-[#0F172A] dark:text-slate-100">
              {patient
                ? 'Edit Patient Record'
                : lockedDoctor
                  ? `Assign Patient to ${lockedDoctor.name}`
                  : 'Add New Patient'}
            </h2>
            <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
              {patient
                ? 'Update disease classification, condition, last check-in, or provider.'
                : 'Register a patient admission, disease category, and initial check-in.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close patient form"
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex-1 overflow-y-auto p-6 space-y-5">
          {serverError && (
            <p role="alert" className="text-xs font-medium text-[#DC2626] dark:text-red-400 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2.5">
              {serverError}
            </p>
          )}

          <div>
            <label htmlFor="pat-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Patient Name
            </label>
            <input
              id="pat-name"
              type="text"
              value={form.name}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, name: e.target.value }));
                if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
              }}
              placeholder="Mahmudul Islam"
              className={`w-full px-3.5 py-2.5 text-sm rounded-lg border bg-white dark:bg-slate-950 text-[#0F172A] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-slate-900 ${
                errors.name ? 'border-[#DC2626]' : 'border-slate-300 dark:border-slate-700'
              }`}
            />
            {errors.name && <p className="mt-1 text-xs text-[#DC2626] dark:text-red-400">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="pat-age" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Age
              </label>
              <input
                id="pat-age"
                type="number"
                min={0}
                max={125}
                value={form.age}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, age: e.target.value }));
                  if (errors.age) setErrors((prev) => ({ ...prev, age: '' }));
                }}
                placeholder="45"
                className={`w-full px-3.5 py-2.5 text-sm rounded-lg border bg-white dark:bg-slate-950 text-[#0F172A] dark:text-slate-100 tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-slate-900 ${
                  errors.age ? 'border-[#DC2626]' : 'border-slate-300 dark:border-slate-700'
                }`}
              />
              {errors.age && <p className="mt-1 text-xs text-[#DC2626] dark:text-red-400">{errors.age}</p>}
            </div>

            <div>
              <label htmlFor="pat-gender" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Gender
              </label>
              <select
                id="pat-gender"
                value={form.gender}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, gender: e.target.value }));
                  if (errors.gender) setErrors((prev) => ({ ...prev, gender: '' }));
                }}
                className={`w-full px-3.5 py-2.5 text-sm rounded-lg border bg-white dark:bg-slate-950 text-[#0F172A] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-slate-900 ${
                  errors.gender ? 'border-[#DC2626]' : 'border-slate-300 dark:border-slate-700'
                }`}
              >
                {GENDERS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
              {errors.gender && <p className="mt-1 text-xs text-[#DC2626] dark:text-red-400">{errors.gender}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="pat-condition" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Clinical Condition
              </label>
              <select
                id="pat-condition"
                value={form.condition}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, condition: e.target.value }));
                  if (errors.condition) setErrors((prev) => ({ ...prev, condition: '' }));
                }}
                className={`w-full px-3.5 py-2.5 text-sm rounded-lg border bg-white dark:bg-slate-950 text-[#0F172A] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-slate-900 ${
                  errors.condition ? 'border-[#DC2626]' : 'border-slate-300 dark:border-slate-700'
                }`}
              >
                {PATIENT_CONDITIONS.map((cond) => (
                  <option key={cond} value={cond}>
                    {cond}
                  </option>
                ))}
              </select>
              {errors.condition && <p className="mt-1 text-xs text-[#DC2626] dark:text-red-400">{errors.condition}</p>}
            </div>

            <div>
              <label htmlFor="pat-disease" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Disease Type
              </label>
              <select
                id="pat-disease"
                value={form.diseaseType}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, diseaseType: e.target.value }));
                  if (errors.diseaseType) setErrors((prev) => ({ ...prev, diseaseType: '' }));
                }}
                className={`w-full px-3.5 py-2.5 text-sm rounded-lg border bg-white dark:bg-slate-950 text-[#0F172A] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-slate-900 ${
                  errors.diseaseType ? 'border-[#DC2626]' : 'border-slate-300 dark:border-slate-700'
                }`}
              >
                {diseaseOptions.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              {errors.diseaseType && (
                <p className="mt-1 text-xs text-[#DC2626] dark:text-red-400">{errors.diseaseType}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="pat-doctor" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Assigned Doctor
            </label>
            {lockedDoctor ? (
              <input
                id="pat-doctor"
                type="text"
                disabled
                value={lockedDoctor.name}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300"
              />
            ) : (
              <select
                id="pat-doctor"
                value={form.doctorId ?? ''}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, doctorId: e.target.value }));
                  if (errors.doctorId) setErrors((prev) => ({ ...prev, doctorId: '' }));
                }}
                className={`w-full px-3.5 py-2.5 text-sm rounded-lg border bg-white dark:bg-slate-950 text-[#0F172A] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-slate-900 ${
                  errors.doctorId ? 'border-[#DC2626]' : 'border-slate-300 dark:border-slate-700'
                }`}
              >
                <option value="">Unassigned</option>
                {doctors.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.name} ({doc.specialization})
                  </option>
                ))}
              </select>
            )}
            {errors.doctorId && <p className="mt-1 text-xs text-[#DC2626] dark:text-red-400">{errors.doctorId}</p>}
          </div>

          <div>
            <label htmlFor="pat-contact" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Patient Phone Number
            </label>
            <input
              id="pat-contact"
              type="tel"
              value={form.contactNumber}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, contactNumber: e.target.value }));
                if (errors.contactNumber) setErrors((prev) => ({ ...prev, contactNumber: '' }));
              }}
              placeholder="+880 1812-300101"
              className={`w-full px-3.5 py-2.5 text-sm rounded-lg border bg-white dark:bg-slate-950 text-[#0F172A] dark:text-slate-100 tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-slate-900 ${
                errors.contactNumber ? 'border-[#DC2626]' : 'border-slate-300 dark:border-slate-700'
              }`}
            />
            {errors.contactNumber && (
              <p className="mt-1 text-xs text-[#DC2626] dark:text-red-400">{errors.contactNumber}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="pat-admission" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Admission Date
              </label>
              <input
                id="pat-admission"
                type="date"
                value={form.admissionDate}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, admissionDate: e.target.value }));
                  if (errors.admissionDate) setErrors((prev) => ({ ...prev, admissionDate: '' }));
                }}
                className={`w-full px-3.5 py-2.5 text-sm rounded-lg border bg-white dark:bg-slate-950 text-[#0F172A] dark:text-slate-100 tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-slate-900 ${
                  errors.admissionDate ? 'border-[#DC2626]' : 'border-slate-300 dark:border-slate-700'
                }`}
              />
              {errors.admissionDate && (
                <p className="mt-1 text-xs text-[#DC2626] dark:text-red-400">{errors.admissionDate}</p>
              )}
            </div>

            <div>
              <label htmlFor="pat-checkin" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Last Check-in
              </label>
              <input
                id="pat-checkin"
                type="datetime-local"
                value={form.lastCheckIn ?? ''}
                onChange={(e) => setForm((prev) => ({ ...prev, lastCheckIn: e.target.value }))}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-[#0F172A] dark:text-slate-100 tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-slate-900"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-white bg-[#2563EB] hover:bg-blue-700 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap"
            >
              {submitting ? 'Saving...' : patient ? 'Update Patient' : 'Create Patient'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
