import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { Calendar, Clock, Edit3, FileText, Plus, Search, Trash2, Users } from 'lucide-react';
import api from '../lib/api';
import {
  DISEASE_TYPES,
  PATIENT_CONDITIONS,
  type Doctor,
  type PaginatedResponse,
  type Patient,
  type PatientFormInput,
} from '../lib/clinical';
import { useToast } from '../context/ToastContext';
import { ConditionBadge } from '../components/ConditionBadge';
import { PatientSlideOver } from '../components/PatientSlideOver';
import { PatientReportDrawer } from '../components/PatientReportDrawer';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import { Pagination } from '../components/Pagination';
import { TableSkeleton } from '../components/Skeletons';

function formatSafeDate(isoDate: string): string {
  const parsed = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return format(parsed, 'MMM d, yyyy');
}

function formatCheckIn(value: string | null | undefined): string {
  if (!value) return 'Pending';
  const normalized = value.length === 10 ? `${value}T00:00` : value;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return value;
  return format(parsed, 'MMM d · h:mm a');
}

export function PatientsPage() {
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialCondition = searchParams.get('condition') || 'All';

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [condition, setCondition] = useState(initialCondition);
  const [diseaseFilter, setDiseaseFilter] = useState('All');
  const [doctorFilter, setDoctorFilter] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);

  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [reportPatientId, setReportPatientId] = useState<number | null>(null);
  const [deletingPatient, setDeletingPatient] = useState<Patient | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const paramCond = searchParams.get('condition');
    if (paramCond && PATIENT_CONDITIONS.includes(paramCond as typeof PATIENT_CONDITIONS[number])) {
      setCondition(paramCond);
      setPage(1);
    }
  }, [searchParams]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    api
      .get<PaginatedResponse<Doctor>>('/doctors', { params: { limit: 100 } })
      .then((res) => setDoctors(res.data.items))
      .catch(() => {
        // Doctor filter options fallback
      });
  }, []);

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<PaginatedResponse<Patient>>('/patients', {
        params: {
          search: debouncedSearch || undefined,
          condition: condition !== 'All' ? condition : undefined,
          diseaseType: diseaseFilter !== 'All' ? diseaseFilter : undefined,
          doctorId: doctorFilter !== 'All' ? doctorFilter : undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          page,
          limit: 10,
        },
      });
      setPatients(res.data.items);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
      if (res.data.page !== page) {
        setPage(res.data.page);
      }
    } catch {
      showToast('Failed to load patient directory.', 'error');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, condition, diseaseFilter, doctorFilter, startDate, endDate, page, showToast]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  function handleClearFilters() {
    setSearchInput('');
    setDebouncedSearch('');
    setCondition('All');
    setDiseaseFilter('All');
    setDoctorFilter('All');
    setStartDate('');
    setEndDate('');
    setPage(1);
    if (searchParams.has('condition')) {
      setSearchParams({});
    }
  }

  async function handleSavePatient(payload: PatientFormInput) {
    if (editingPatient) {
      await api.put(`/patients/${editingPatient.id}`, payload);
      showToast(`${payload.name} updated successfully.`);
    } else {
      await api.post('/patients', payload);
      showToast(`${payload.name} added to patient directory.`);
    }
    await fetchPatients();
  }

  async function handleDeletePatient() {
    if (!deletingPatient) return;
    setIsDeleting(true);
    try {
      await api.delete(`/patients/${deletingPatient.id}`);
      showToast(`${deletingPatient.name} deleted.`);
      setDeletingPatient(null);
      await fetchPatients();
    } catch {
      showToast('Unable to delete patient record.', 'error');
    } finally {
      setIsDeleting(false);
    }
  }

  const hasFilters = Boolean(
    searchInput ||
      condition !== 'All' ||
      diseaseFilter !== 'All' ||
      doctorFilter !== 'All' ||
      startDate ||
      endDate
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#0F172A] dark:text-white">Patients</h1>
          <p className="text-sm text-[#64748B] dark:text-slate-400 mt-0.5">
            Disease classifications, patient clinical reports, last check-ins, and diagnostic test history
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingPatient(null);
            setDrawerOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg transition-colors self-start sm:self-auto whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>Add Patient</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white/95 dark:bg-slate-900/95 border border-[#E2E8F0] dark:border-slate-800 rounded-lg p-4">
        <div className="flex flex-col lg:flex-row lg:flex-wrap lg:items-center gap-3">
          <div className="relative flex-1 min-w-[210px]">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              aria-label="Search patients"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search patients by name, disease, phone..."
              className="w-full pl-10 pr-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-[#0F172A] dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-slate-900"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 lg:flex lg:items-center gap-3">
            <select
              aria-label="Filter by disease type"
              value={diseaseFilter}
              onChange={(e) => {
                setDiseaseFilter(e.target.value);
                setPage(1);
              }}
              className="w-full lg:w-48 px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-[#0F172A] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-slate-900"
            >
              <option value="All">All Disease Types</option>
              {DISEASE_TYPES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter by condition"
              value={condition}
              onChange={(e) => {
                setCondition(e.target.value);
                setPage(1);
              }}
              className="w-full lg:w-40 px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-[#0F172A] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-slate-900"
            >
              <option value="All">All Conditions</option>
              {PATIENT_CONDITIONS.map((cond) => (
                <option key={cond} value={cond}>
                  {cond}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter by assigned doctor"
              value={doctorFilter}
              onChange={(e) => {
                setDoctorFilter(e.target.value);
                setPage(1);
              }}
              className="w-full lg:w-44 px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-[#0F172A] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-slate-900"
            >
              <option value="All">All Doctors</option>
              <option value="unassigned">Unassigned</option>
              {doctors.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 min-w-0">
            <div className="relative flex-1 sm:w-40 sm:flex-none">
              <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="date"
                aria-label="Admission from date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-8 pr-2.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-[#0F172A] dark:text-slate-100 tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-slate-900"
              />
            </div>
            <span className="hidden sm:inline text-xs text-slate-400 dark:text-slate-500 shrink-0">to</span>
            <input
              type="date"
              aria-label="Admission to date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="w-full sm:w-36 px-2.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-[#0F172A] dark:text-slate-100 tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-slate-900"
            />
          </div>

          {hasFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="self-start lg:self-auto px-2.5 py-2 text-xs font-medium text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-slate-200 whitespace-nowrap shrink-0"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Patient Directory Table / Mobile Stack */}
      {loading ? (
        <TableSkeleton rows={8} cols={8} />
      ) : patients.length === 0 ? (
        <div className="bg-white/95 dark:bg-slate-900/95 border border-[#E2E8F0] dark:border-slate-800 rounded-lg py-16 px-4 text-center">
          <div className="w-11 h-11 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mx-auto mb-3">
            <Users className="w-5 h-5" />
          </div>
          <h2 className="text-base font-semibold text-[#0F172A] dark:text-white">No patients found</h2>
          <p className="text-sm text-[#64748B] dark:text-slate-400 mt-1">
            {hasFilters
              ? 'No records match your active search or filter criteria.'
              : 'Add your first patient record to start tracking clinical status.'}
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            {hasFilters ? (
              <button
                type="button"
                onClick={handleClearFilters}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                Clear Filters
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setEditingPatient(null);
                  setDrawerOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Patient</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white/95 dark:bg-slate-900/95 border border-[#E2E8F0] dark:border-slate-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="py-3 px-4 font-medium">Patient</th>
                    <th className="py-3 px-4 font-medium">Disease Type</th>
                    <th className="py-3 px-4 font-medium">Condition</th>
                    <th className="py-3 px-4 font-medium">Last Check-in & Tests</th>
                    <th className="py-3 px-4 font-medium">Assigned Doctor</th>
                    <th className="py-3 px-4 font-medium">Phone</th>
                    <th className="py-3 px-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {patients.map((patient) => (
                    <tr key={patient.id} className="h-16 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                      <td className="px-4 whitespace-nowrap">
                        <div className="text-[13px] font-medium text-[#0F172A] dark:text-slate-100">
                          {patient.name}
                        </div>
                        <div className="text-[11px] text-[#64748B] dark:text-slate-400 tabular-nums">
                          {patient.age} yrs · {patient.gender} · Admitted {formatSafeDate(patient.admissionDate)}
                        </div>
                      </td>
                      <td className="px-4 text-[13px] text-slate-700 dark:text-slate-200 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {patient.diseaseType || 'General Medicine'}
                        </span>
                      </td>
                      <td className="px-4 whitespace-nowrap">
                        <ConditionBadge condition={patient.condition} />
                      </td>
                      <td className="px-4 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 text-[12px] text-slate-700 dark:text-slate-200 tabular-nums">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{formatCheckIn(patient.lastCheckIn)}</span>
                        </div>
                        <div className="text-[11px] text-[#64748B] dark:text-slate-400 tabular-nums mt-0.5">
                          {patient.testsCount ?? 0} test{(patient.testsCount ?? 0) === 1 ? '' : 's'}
                          {(patient.abnormalTestsCount ?? 0) > 0 && (
                            <span className="ml-1.5 text-[#DC2626] dark:text-red-400 font-medium">
                              · {patient.abnormalTestsCount} abnormal
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 text-[13px] text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {patient.doctorName || (
                          <span className="text-slate-400 dark:text-slate-500">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 text-[13px] text-slate-600 dark:text-slate-300 tabular-nums whitespace-nowrap">
                        {patient.contactNumber}
                      </td>
                      <td className="px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setReportPatientId(patient.id)}
                            aria-label={`View clinical report for ${patient.name}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#2563EB] dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-950 border border-blue-200 dark:border-blue-800/80 rounded-md transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Report</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPatient(patient);
                              setDrawerOpen(true);
                            }}
                            aria-label={`Edit ${patient.name}`}
                            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingPatient(patient)}
                            aria-label={`Delete ${patient.name}`}
                            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-[#DC2626] dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/60 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Stacked Cards */}
          <div className="md:hidden space-y-3">
            {patients.map((patient) => (
              <div
                key={patient.id}
                className="bg-white/95 dark:bg-slate-900/95 border border-[#E2E8F0] dark:border-slate-800 rounded-lg p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-semibold text-[#0F172A] dark:text-white">{patient.name}</h2>
                    <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5 tabular-nums">
                      {patient.age} yrs · {patient.gender} · {patient.diseaseType}
                    </p>
                  </div>
                  <ConditionBadge condition={patient.condition} />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 block">Assigned Doctor</span>
                    <span className="font-medium text-[#0F172A] dark:text-slate-100">
                      {patient.doctorName || 'Unassigned'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 block">Last Check-in</span>
                    <span className="tabular-nums">{formatCheckIn(patient.lastCheckIn)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 block">Phone</span>
                    <span className="tabular-nums">{patient.contactNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 block">Logged Tests</span>
                    <span className="tabular-nums">{patient.testsCount ?? 0} reports</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setReportPatientId(patient.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#2563EB] dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 rounded-md"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Report</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPatient(patient);
                      setDrawerOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingPatient(patient)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#DC2626] dark:text-red-400 bg-red-50 dark:bg-red-950/60 hover:bg-red-100 dark:hover:bg-red-950 rounded-md"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {!loading && patients.length > 0 && (
        <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
      )}

      <PatientSlideOver
        open={drawerOpen}
        patient={editingPatient}
        doctors={doctors}
        onClose={() => {
          setDrawerOpen(false);
          setEditingPatient(null);
        }}
        onSubmit={handleSavePatient}
      />

      <PatientReportDrawer
        patientId={reportPatientId}
        onClose={() => setReportPatientId(null)}
        onReportChanged={fetchPatients}
      />

      <DeleteConfirmModal
        open={Boolean(deletingPatient)}
        title="Delete Patient Record"
        message={
          deletingPatient
            ? `Are you sure you want to delete ${deletingPatient.name}? This action cannot be undone.`
            : ''
        }
        isDeleting={isDeleting}
        onCancel={() => setDeletingPatient(null)}
        onConfirm={handleDeletePatient}
      />
    </div>
  );
}
