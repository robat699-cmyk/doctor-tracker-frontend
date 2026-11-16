import { useEffect, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import {
  SPECIALIZATIONS,
  validateDoctorInput,
  type Doctor,
  type DoctorFormInput,
} from '../lib/clinical';

interface DoctorSlideOverProps {
  open: boolean;
  doctor: Doctor | null;
  onClose: () => void;
  onSubmit: (payload: DoctorFormInput) => Promise<void>;
}

const EMPTY_FORM: DoctorFormInput = {
  name: '',
  specialization: 'Cardiology',
  hospital: '',
  phone: '',
  email: '',
};

export function DoctorSlideOver({ open, doctor, onClose, onSubmit }: DoctorSlideOverProps) {
  const [form, setForm] = useState<DoctorFormInput>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (doctor) {
      setForm({
        name: doctor.name,
        specialization: doctor.specialization,
        hospital: doctor.hospital,
        phone: doctor.phone,
        email: doctor.email,
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setErrors({});
    setServerError(null);
  }, [open, doctor]);

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setServerError(null);
    const check = validateDoctorInput(form);
    if (!check.valid) {
      setErrors(check.errors);
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        name: form.name.trim(),
        specialization: form.specialization,
        hospital: form.hospital.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
      });
      onClose();
    } catch (err: unknown) {
      const apiErr = err as {
        response?: { data?: { message?: string; errors?: Record<string, string> } };
      };
      if (apiErr.response?.data?.errors) {
        setErrors(apiErr.response.data.errors);
      }
      setServerError(apiErr.response?.data?.message || 'Unable to save doctor record.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="doctor-drawer-title"
    >
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-[480px] bg-white dark:bg-slate-900 h-full shadow-xl border-l border-slate-200 dark:border-slate-800 flex flex-col animate-slide-in-right">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 id="doctor-drawer-title" className="text-lg font-semibold text-[#0F172A] dark:text-slate-100">
              {doctor ? 'Edit Doctor Profile' : 'Add New Doctor'}
            </h2>
            <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
              {doctor
                ? 'Update clinical credentials and hospital affiliation.'
                : 'Register a healthcare provider in the directory.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close doctor form"
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
            <label htmlFor="doc-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Full Name
            </label>
            <input
              id="doc-name"
              type="text"
              value={form.name}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, name: e.target.value }));
                if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
              }}
              placeholder="Dr. Anika Rahman"
              className={`w-full px-3.5 py-2.5 text-sm rounded-lg border bg-white dark:bg-slate-950 text-[#0F172A] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-slate-900 ${
                errors.name ? 'border-[#DC2626]' : 'border-slate-300 dark:border-slate-700'
              }`}
            />
            {errors.name && <p className="mt-1 text-xs text-[#DC2626] dark:text-red-400">{errors.name}</p>}
          </div>

          <div>
            <label htmlFor="doc-spec" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Specialization
            </label>
            <select
              id="doc-spec"
              value={form.specialization}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, specialization: e.target.value }));
                if (errors.specialization) setErrors((prev) => ({ ...prev, specialization: '' }));
              }}
              className={`w-full px-3.5 py-2.5 text-sm rounded-lg border bg-white dark:bg-slate-950 text-[#0F172A] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-slate-900 ${
                errors.specialization ? 'border-[#DC2626]' : 'border-slate-300 dark:border-slate-700'
              }`}
            >
              {SPECIALIZATIONS.map((spec) => (
                <option key={spec} value={spec}>
                  {spec}
                </option>
              ))}
            </select>
            {errors.specialization && (
              <p className="mt-1 text-xs text-[#DC2626] dark:text-red-400">{errors.specialization}</p>
            )}
          </div>

          <div>
            <label htmlFor="doc-hospital" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Hospital / Facility
            </label>
            <input
              id="doc-hospital"
              type="text"
              value={form.hospital}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, hospital: e.target.value }));
                if (errors.hospital) setErrors((prev) => ({ ...prev, hospital: '' }));
              }}
              placeholder="Care Guide Medical Center"
              className={`w-full px-3.5 py-2.5 text-sm rounded-lg border bg-white dark:bg-slate-950 text-[#0F172A] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-slate-900 ${
                errors.hospital ? 'border-[#DC2626]' : 'border-slate-300 dark:border-slate-700'
              }`}
            />
            {errors.hospital && <p className="mt-1 text-xs text-[#DC2626] dark:text-red-400">{errors.hospital}</p>}
          </div>

          <div>
            <label htmlFor="doc-phone" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Phone Number
            </label>
            <input
              id="doc-phone"
              type="tel"
              value={form.phone}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, phone: e.target.value }));
                if (errors.phone) setErrors((prev) => ({ ...prev, phone: '' }));
              }}
              placeholder="+880 1711-204101"
              className={`w-full px-3.5 py-2.5 text-sm rounded-lg border bg-white dark:bg-slate-950 text-[#0F172A] dark:text-slate-100 tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-slate-900 ${
                errors.phone ? 'border-[#DC2626]' : 'border-slate-300 dark:border-slate-700'
              }`}
            />
            {errors.phone && <p className="mt-1 text-xs text-[#DC2626] dark:text-red-400">{errors.phone}</p>}
          </div>

          <div>
            <label htmlFor="doc-email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Email Address
            </label>
            <input
              id="doc-email"
              type="email"
              value={form.email}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, email: e.target.value }));
                if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
              }}
              placeholder="anika.rahman@careguidebd.com"
              className={`w-full px-3.5 py-2.5 text-sm rounded-lg border bg-white dark:bg-slate-950 text-[#0F172A] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-slate-900 ${
                errors.email ? 'border-[#DC2626]' : 'border-slate-300 dark:border-slate-700'
              }`}
            />
            {errors.email && <p className="mt-1 text-xs text-[#DC2626] dark:text-red-400">{errors.email}</p>}
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
              {submitting ? 'Saving...' : doctor ? 'Update Doctor' : 'Create Doctor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
