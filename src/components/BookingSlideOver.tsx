import { useEffect, useState, type FormEvent } from 'react';
import { Phone, X } from 'lucide-react';
import {
  BOOKING_STATUSES,
  DISEASE_TYPES,
  SESSION_TYPES,
  validateBookingInput,
  type Doctor,
  type Patient,
  type PreBooking,
  type PreBookingFormInput,
} from '../lib/clinical';

interface BookingSlideOverProps {
  open: boolean;
  booking: PreBooking | null;
  doctors: Doctor[];
  patients: Patient[];
  defaultDoctorId?: number | null;
  onClose: () => void;
  onSubmit: (payload: PreBookingFormInput) => Promise<void>;
}

function getDefaultScheduledAt(): string {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const tzOffset = tomorrow.getTimezoneOffset() * 60000;
  return new Date(tomorrow.getTime() - tzOffset).toISOString().slice(0, 16);
}

export function BookingSlideOver({
  open,
  booking,
  doctors,
  patients,
  defaultDoctorId = null,
  onClose,
  onSubmit,
}: BookingSlideOverProps) {
  const [form, setForm] = useState<PreBookingFormInput>({
    patientId: '',
    patientName: '',
    patientPhone: '',
    doctorId: '',
    diseaseType: DISEASE_TYPES[0],
    sessionType: SESSION_TYPES[0],
    scheduledAt: getDefaultScheduledAt(),
    status: 'Scheduled',
    remindPatient: true,
    remindDoctor: true,
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (booking) {
      setForm({
        patientId: booking.patientId ?? '',
        patientName: booking.patientName,
        patientPhone: booking.patientPhone,
        doctorId: booking.doctorId,
        diseaseType: booking.diseaseType,
        sessionType: booking.sessionType,
        scheduledAt: booking.scheduledAt.slice(0, 16),
        status: booking.status,
        remindPatient: booking.remindPatient,
        remindDoctor: booking.remindDoctor,
        notes: booking.notes || '',
      });
    } else {
      setForm({
        patientId: '',
        patientName: '',
        patientPhone: '',
        doctorId: defaultDoctorId ?? doctors[0]?.id ?? '',
        diseaseType: DISEASE_TYPES[0],
        sessionType: SESSION_TYPES[0],
        scheduledAt: getDefaultScheduledAt(),
        status: 'Scheduled',
        remindPatient: true,
        remindDoctor: true,
        notes: '',
      });
    }
    setErrors({});
    setServerError(null);
  }, [open, booking, doctors, defaultDoctorId]);

  if (!open) return null;

  const selectedDoctor = doctors.find((d) => String(d.id) === String(form.doctorId));

  function handleSelectExistingPatient(patientIdStr: string) {
    if (!patientIdStr) {
      setForm((prev) => ({ ...prev, patientId: '' }));
      return;
    }
    const found = patients.find((p) => String(p.id) === patientIdStr);
    if (!found) return;
    setForm((prev) => ({
      ...prev,
      patientId: found.id,
      patientName: found.name,
      patientPhone: found.contactNumber,
      diseaseType: found.diseaseType || prev.diseaseType,
      doctorId: found.doctorId ? String(found.doctorId) : prev.doctorId,
    }));
    setErrors((prev) => ({ ...prev, patientName: '', patientPhone: '' }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setServerError(null);
    const check = validateBookingInput(form);
    if (!check.valid) {
      setErrors(check.errors);
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        patientId: form.patientId === '' || form.patientId === null ? null : Number(form.patientId),
        patientName: form.patientName.trim(),
        patientPhone: form.patientPhone.trim(),
        doctorId: Number(form.doctorId),
        diseaseType: form.diseaseType.trim(),
        sessionType: form.sessionType.trim(),
        scheduledAt: form.scheduledAt,
        status: form.status || 'Scheduled',
        remindPatient: form.remindPatient,
        remindDoctor: form.remindDoctor,
        notes: form.notes.trim(),
      });
      onClose();
    } catch (err: unknown) {
      const apiErr = err as {
        response?: { data?: { message?: string; errors?: Record<string, string> } };
      };
      if (apiErr.response?.data?.errors) {
        setErrors(apiErr.response.data.errors);
      }
      setServerError(apiErr.response?.data?.message || 'Unable to save pre-booking session.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-drawer-title"
    >
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-[500px] bg-white dark:bg-slate-900 h-full shadow-xl border-l border-slate-200 dark:border-slate-800 flex flex-col animate-slide-in-right">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 id="booking-drawer-title" className="text-lg font-semibold text-[#0F172A] dark:text-slate-100">
              {booking ? 'Edit Pre-Booking Session' : 'New Pre-Booking Session'}
            </h2>
            <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
              Schedule a clinical session with dual phone reminder preferences for patient and doctor.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close pre-booking form"
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

          {/* Optional Patient Quick-Fill */}
          <div>
            <label htmlFor="bk-existing-patient" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Select Registered Patient (Optional)
            </label>
            <select
              id="bk-existing-patient"
              value={form.patientId ?? ''}
              onChange={(e) => handleSelectExistingPatient(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-[#0F172A] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Custom / Walk-in Patient</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.diseaseType} ({p.contactNumber})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="bk-patient-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Patient Name
              </label>
              <input
                id="bk-patient-name"
                type="text"
                value={form.patientName}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, patientName: e.target.value }));
                  if (errors.patientName) setErrors((prev) => ({ ...prev, patientName: '' }));
                }}
                placeholder="Mahmudul Islam"
                className={`w-full px-3.5 py-2.5 text-sm rounded-lg border bg-white dark:bg-slate-950 text-[#0F172A] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.patientName ? 'border-[#DC2626]' : 'border-slate-300 dark:border-slate-700'
                }`}
              />
              {errors.patientName && <p className="mt-1 text-xs text-[#DC2626] dark:text-red-400">{errors.patientName}</p>}
            </div>

            <div>
              <label htmlFor="bk-patient-phone" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Patient Phone Number
              </label>
              <input
                id="bk-patient-phone"
                type="tel"
                value={form.patientPhone}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, patientPhone: e.target.value }));
                  if (errors.patientPhone) setErrors((prev) => ({ ...prev, patientPhone: '' }));
                }}
                placeholder="+880 1812-300101"
                className={`w-full px-3.5 py-2.5 text-sm rounded-lg border bg-white dark:bg-slate-950 text-[#0F172A] dark:text-slate-100 tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.patientPhone ? 'border-[#DC2626]' : 'border-slate-300 dark:border-slate-700'
                }`}
              />
              {errors.patientPhone && <p className="mt-1 text-xs text-[#DC2626] dark:text-red-400">{errors.patientPhone}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="bk-doctor" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Assigned Doctor
            </label>
            <select
              id="bk-doctor"
              value={form.doctorId}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, doctorId: e.target.value }));
                if (errors.doctorId) setErrors((prev) => ({ ...prev, doctorId: '' }));
              }}
              className={`w-full px-3.5 py-2.5 text-sm rounded-lg border bg-white dark:bg-slate-950 text-[#0F172A] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.doctorId ? 'border-[#DC2626]' : 'border-slate-300 dark:border-slate-700'
              }`}
            >
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.specialization})
                </option>
              ))}
            </select>
            {selectedDoctor && (
              <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-[#64748B] dark:text-slate-400 tabular-nums">
                <Phone className="w-3 h-3 text-[#2563EB] dark:text-blue-400" />
                <span>Doctor Reminder Phone: {selectedDoctor.phone}</span>
              </p>
            )}
            {errors.doctorId && <p className="mt-1 text-xs text-[#DC2626] dark:text-red-400">{errors.doctorId}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="bk-disease" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Disease Type
              </label>
              <select
                id="bk-disease"
                value={form.diseaseType}
                onChange={(e) => setForm((prev) => ({ ...prev, diseaseType: e.target.value }))}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-[#0F172A] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {DISEASE_TYPES.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="bk-session-type" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Session Type
              </label>
              <select
                id="bk-session-type"
                value={form.sessionType}
                onChange={(e) => setForm((prev) => ({ ...prev, sessionType: e.target.value }))}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-[#0F172A] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {SESSION_TYPES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="bk-scheduled-at" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Scheduled Date & Time
              </label>
              <input
                id="bk-scheduled-at"
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, scheduledAt: e.target.value }));
                  if (errors.scheduledAt) setErrors((prev) => ({ ...prev, scheduledAt: '' }));
                }}
                className={`w-full px-3.5 py-2.5 text-sm rounded-lg border bg-white dark:bg-slate-950 text-[#0F172A] dark:text-slate-100 tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.scheduledAt ? 'border-[#DC2626]' : 'border-slate-300 dark:border-slate-700'
                }`}
              />
              {errors.scheduledAt && <p className="mt-1 text-xs text-[#DC2626] dark:text-red-400">{errors.scheduledAt}</p>}
            </div>

            {booking && (
              <div>
                <label htmlFor="bk-status" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Session Status
                </label>
                <select
                  id="bk-status"
                  value={form.status}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, status: e.target.value as PreBooking['status'] }))
                  }
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-[#0F172A] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {BOOKING_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Dual Phone Reminder Controls */}
          <div className="bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-2.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Phone Reminder Routing
            </p>
            <label className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={form.remindPatient}
                onChange={(e) => setForm((prev) => ({ ...prev, remindPatient: e.target.checked }))}
                className="w-4 h-4 rounded border-slate-300 text-[#2563EB] focus:ring-blue-500"
              />
              <span>Enable Patient Phone Reminder</span>
            </label>
            <label className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={form.remindDoctor}
                onChange={(e) => setForm((prev) => ({ ...prev, remindDoctor: e.target.checked }))}
                className="w-4 h-4 rounded border-slate-300 text-[#2563EB] focus:ring-blue-500"
              />
              <span>Enable Doctor Phone Alert</span>
            </label>
          </div>

          <div>
            <label htmlFor="bk-notes" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Preparation / Session Notes
            </label>
            <textarea
              id="bk-notes"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="e.g., Fasting required for HbA1c & Lipid Panel review"
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-[#0F172A] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
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
              {submitting ? 'Saving...' : booking ? 'Update Pre-Booking' : 'Create Pre-Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
