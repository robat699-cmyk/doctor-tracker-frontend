import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { format } from 'date-fns';
import {
  Activity,
  Clock,
  FileText,
  FlaskConical,
  Phone,
  Plus,
  Stethoscope,
  Trash2,
  X,
} from 'lucide-react';
import api from '../lib/api';
import {
  CLINICAL_TEST_TYPES,
  TEST_STATUSES,
  validateTestReportInput,
  type PatientDetail,
  type PatientTestFormInput,
  type PatientTestReport,
  type TestStatus,
} from '../lib/clinical';
import { useToast } from '../context/ToastContext';
import { ConditionBadge } from './ConditionBadge';

interface PatientReportDrawerProps {
  patientId: number | null;
  onClose: () => void;
  onReportChanged?: () => void;
}

function getNowLocalInput(): string {
  const now = new Date();
  const tzOffset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return 'No check-in logged';
  const normalized = value.length === 10 ? `${value}T00:00` : value;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return value;
  return format(parsed, 'MMM d, yyyy · h:mm a');
}

function TestStatusBadge({ status }: { status: TestStatus }) {
  const styles: Record<TestStatus, string> = {
    Normal: 'bg-emerald-50 text-[#059669] border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800/80',
    Abnormal: 'bg-red-50 text-[#DC2626] border-red-200 dark:bg-red-950/60 dark:text-red-400 dark:border-red-800/80',
    Pending: 'bg-amber-50 text-[#D97706] border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800/80',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-md border whitespace-nowrap ${styles[status]}`}>
      {status}
    </span>
  );
}

export function PatientReportDrawer({
  patientId,
  onClose,
  onReportChanged,
}: PatientReportDrawerProps) {
  const { showToast } = useToast();

  const [detail, setDetail] = useState<PatientDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'All' | TestStatus>('All');
  const [showAddForm, setShowAddForm] = useState(false);

  const [form, setForm] = useState<PatientTestFormInput>({
    testType: CLINICAL_TEST_TYPES[0],
    resultValue: '',
    status: 'Normal',
    notes: '',
    checkedAt: getNowLocalInput(),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const loadReport = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    try {
      const res = await api.get<PatientDetail>(`/patients/${patientId}/report`);
      setDetail(res.data);
    } catch {
      showToast('Unable to load patient clinical report.', 'error');
    } finally {
      setLoading(false);
    }
  }, [patientId, showToast]);

  useEffect(() => {
    if (patientId) {
      setStatusFilter('All');
      setShowAddForm(false);
      setErrors({});
      setForm({
        testType: CLINICAL_TEST_TYPES[0],
        resultValue: '',
        status: 'Normal',
        notes: '',
        checkedAt: getNowLocalInput(),
      });
      loadReport();
    } else {
      setDetail(null);
    }
  }, [patientId, loadReport]);

  if (!patientId) return null;

  const filteredTests = (detail?.tests ?? []).filter((t) =>
    statusFilter === 'All' ? true : t.status === statusFilter
  );

  const normalCount = (detail?.tests ?? []).filter((t) => t.status === 'Normal').length;
  const abnormalCount = (detail?.tests ?? []).filter((t) => t.status === 'Abnormal').length;
  const pendingCount = (detail?.tests ?? []).filter((t) => t.status === 'Pending').length;

  async function handleAddTest(e: FormEvent) {
    e.preventDefault();
    if (!patientId) return;
    const check = validateTestReportInput(form);
    if (!check.valid) {
      setErrors(check.errors);
      return;
    }

    setSaving(true);
    try {
      const res = await api.post<{ test: PatientTestReport; lastCheckIn: string }>(
        `/patients/${patientId}/tests`,
        {
          testType: form.testType.trim(),
          resultValue: form.resultValue.trim(),
          status: form.status,
          notes: form.notes.trim(),
          checkedAt: form.checkedAt,
        }
      );

      setDetail((prev) =>
        prev
          ? {
              ...prev,
              lastCheckIn: res.data.lastCheckIn,
              tests: [res.data.test, ...prev.tests],
            }
          : prev
      );
      setShowAddForm(false);
      setForm({
        testType: CLINICAL_TEST_TYPES[0],
        resultValue: '',
        status: 'Normal',
        notes: '',
        checkedAt: getNowLocalInput(),
      });
      setErrors({});
      showToast('Test report & check-in logged.');
      onReportChanged?.();
    } catch {
      showToast('Unable to save test report.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteTest(testId: number) {
    if (!patientId) return;
    try {
      await api.delete(`/patients/${patientId}/tests/${testId}`);
      setDetail((prev) =>
        prev
          ? { ...prev, tests: prev.tests.filter((t) => t.id !== testId) }
          : prev
      );
      showToast('Test report removed.');
      onReportChanged?.();
    } catch {
      showToast('Unable to remove test report.', 'error');
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-drawer-title"
    >
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-[600px] bg-white dark:bg-slate-900 h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#2563EB] dark:text-blue-400 shrink-0" />
              <h2 id="report-drawer-title" className="text-lg font-semibold text-[#0F172A] dark:text-white truncate">
                {detail ? `${detail.name} · Clinical Report` : 'Patient Clinical Report'}
              </h2>
            </div>
            {detail && (
              <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1 truncate">
                {detail.age} yrs · {detail.gender} · Disease: <span className="font-medium text-slate-700 dark:text-slate-300">{detail.diseaseType}</span>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close clinical report"
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading || !detail ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-24 bg-slate-100 dark:bg-slate-800 rounded-lg" />
              <div className="h-14 bg-slate-100 dark:bg-slate-800 rounded-lg" />
              <div className="h-28 bg-slate-100 dark:bg-slate-800 rounded-lg" />
            </div>
          ) : (
            <>
              {/* Patient Clinical Summary Card */}
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ConditionBadge condition={detail.condition} />
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium rounded-md bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 border border-blue-200 dark:border-blue-800/70">
                      <Activity className="w-3 h-3" />
                      {detail.diseaseType}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 tabular-nums">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Last check-in: <strong className="font-medium text-[#0F172A] dark:text-white">{formatDateTime(detail.lastCheckIn)}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-700 text-xs">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Patient Phone:</span>
                    <a
                      href={`tel:${detail.contactNumber}`}
                      className="font-medium text-[#0F172A] dark:text-white tabular-nums hover:text-[#2563EB]"
                    >
                      {detail.contactNumber}
                    </a>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <Stethoscope className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Doctor:</span>
                    <span className="font-medium text-[#0F172A] dark:text-white truncate">
                      {detail.doctorName || 'Unassigned'}
                      {detail.doctorPhone ? ` (${detail.doctorPhone})` : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* Test Status KPI Strip + Add Button */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setStatusFilter('All')}
                    className={`px-2.5 py-1.5 rounded-md font-medium border transition-colors tabular-nums ${
                      statusFilter === 'All'
                        ? 'bg-[#0F172A] text-white border-[#0F172A] dark:bg-blue-600 dark:border-blue-600'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    All Tests ({detail.tests.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('Normal')}
                    className={`px-2.5 py-1.5 rounded-md font-medium border transition-colors tabular-nums ${
                      statusFilter === 'Normal'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Normal ({normalCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('Abnormal')}
                    className={`px-2.5 py-1.5 rounded-md font-medium border transition-colors tabular-nums ${
                      statusFilter === 'Abnormal'
                        ? 'bg-red-600 text-white border-red-600'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Abnormal ({abnormalCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('Pending')}
                    className={`px-2.5 py-1.5 rounded-md font-medium border transition-colors tabular-nums ${
                      statusFilter === 'Pending'
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Pending ({pendingCount})
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddForm((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{showAddForm ? 'Close Form' : 'Log Test / Check-in'}</span>
                </button>
              </div>

              {/* Log New Test Form */}
              {showAddForm && (
                <form
                  onSubmit={handleAddTest}
                  noValidate
                  className="bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-4"
                >
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <FlaskConical className="w-3.5 h-3.5 text-[#2563EB] dark:text-blue-400" />
                    <span>New Diagnostic Test & Check-in Entry</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="test-type" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Test Type
                      </label>
                      <select
                        id="test-type"
                        value={form.testType}
                        onChange={(e) => {
                          setForm((prev) => ({ ...prev, testType: e.target.value }));
                          if (errors.testType) setErrors((prev) => ({ ...prev, testType: '' }));
                        }}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-[#0F172A] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {CLINICAL_TEST_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                      {errors.testType && <p className="mt-1 text-[11px] text-red-500">{errors.testType}</p>}
                    </div>

                    <div>
                      <label htmlFor="test-status" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Status
                      </label>
                      <select
                        id="test-status"
                        value={form.status}
                        onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as TestStatus }))}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-[#0F172A] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {TEST_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="test-result" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Result Finding / Value
                      </label>
                      <input
                        id="test-result"
                        type="text"
                        value={form.resultValue}
                        onChange={(e) => {
                          setForm((prev) => ({ ...prev, resultValue: e.target.value }));
                          if (errors.resultValue) setErrors((prev) => ({ ...prev, resultValue: '' }));
                        }}
                        placeholder="e.g., 7.8% or WBC 7.4 K/uL"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-[#0F172A] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {errors.resultValue && <p className="mt-1 text-[11px] text-red-500">{errors.resultValue}</p>}
                    </div>

                    <div>
                      <label htmlFor="test-checked-at" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Check-in Timestamp
                      </label>
                      <input
                        id="test-checked-at"
                        type="datetime-local"
                        value={form.checkedAt}
                        onChange={(e) => {
                          setForm((prev) => ({ ...prev, checkedAt: e.target.value }));
                          if (errors.checkedAt) setErrors((prev) => ({ ...prev, checkedAt: '' }));
                        }}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-[#0F172A] dark:text-slate-100 tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {errors.checkedAt && <p className="mt-1 text-[11px] text-red-500">{errors.checkedAt}</p>}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="test-notes" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Clinical Notes (Optional)
                    </label>
                    <input
                      id="test-notes"
                      type="text"
                      value={form.notes}
                      onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                      placeholder="Follow-up observation or lab reference note"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-[#0F172A] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-3.5 py-1.5 text-xs font-medium text-white bg-[#2563EB] hover:bg-blue-700 disabled:opacity-60 rounded-md"
                    >
                      {saving ? 'Saving...' : 'Save Test Report'}
                    </button>
                  </div>
                </form>
              )}

              {/* All Test Types List */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Diagnostic Test Reports ({filteredTests.length})
                </h3>

                {filteredTests.length === 0 ? (
                  <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-lg py-10 text-center">
                    <FlaskConical className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                    <p className="text-xs font-medium text-[#0F172A] dark:text-slate-100">
                      No diagnostic test entries in this view
                    </p>
                    <p className="text-[11px] text-[#64748B] dark:text-slate-400 mt-1">
                      Use “Log Test / Check-in” above to record any of the 14 clinical test types.
                    </p>
                  </div>
                ) : (
                  filteredTests.map((test) => (
                    <div
                      key={test.id}
                      className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-[#0F172A] dark:text-white">
                              {test.testType}
                            </span>
                            <TestStatusBadge status={test.status} />
                          </div>
                          <p className="text-xs font-medium text-slate-800 dark:text-slate-200 mt-1 tabular-nums">
                            Result: {test.resultValue}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteTest(test.id)}
                          aria-label={`Delete ${test.testType} report`}
                          className="p-1.5 text-slate-400 hover:text-[#DC2626] dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/60 rounded transition-colors shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {test.notes && (
                        <p className="text-xs text-[#64748B] dark:text-slate-400 leading-relaxed">
                          {test.notes}
                        </p>
                      )}

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-[#94A3B8] dark:text-slate-500 tabular-nums">
                        <span>Check-in: {formatDateTime(test.checkedAt)}</span>
                        <span>Report #{test.id}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
