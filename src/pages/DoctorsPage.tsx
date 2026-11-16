import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Edit3,
  LayoutGrid,
  List,
  Mail,
  Phone,
  Plus,
  Search,
  Stethoscope,
  Trash2,
} from 'lucide-react';
import api from '../lib/api';
import {
  SPECIALIZATIONS,
  type Doctor,
  type DoctorFormInput,
  type PaginatedResponse,
} from '../lib/clinical';
import { useToast } from '../context/ToastContext';
import { DoctorSlideOver } from '../components/DoctorSlideOver';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import { Pagination } from '../components/Pagination';
import { CardsGridSkeleton, TableSkeleton } from '../components/Skeletons';

export function DoctorsPage() {
  const { showToast } = useToast();

  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [specialization, setSpecialization] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [deletingDoctor, setDeletingDoctor] = useState<Doctor | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const fetchDoctors = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<PaginatedResponse<Doctor>>('/doctors', {
        params: {
          search: debouncedSearch || undefined,
          specialization: specialization !== 'All' ? specialization : undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          page,
          limit: 9,
        },
      });
      setDoctors(res.data.items);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
      if (res.data.page !== page) {
        setPage(res.data.page);
      }
    } catch {
      showToast('Failed to load doctors directory.', 'error');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, specialization, startDate, endDate, page, showToast]);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  function handleClearFilters() {
    setSearchInput('');
    setDebouncedSearch('');
    setSpecialization('All');
    setStartDate('');
    setEndDate('');
    setPage(1);
  }

  async function handleSaveDoctor(payload: DoctorFormInput) {
    if (editingDoctor) {
      await api.put(`/doctors/${editingDoctor.id}`, payload);
      showToast(`${payload.name} updated successfully.`);
    } else {
      await api.post('/doctors', payload);
      showToast(`${payload.name} added to directory.`);
    }
    await fetchDoctors();
  }

  async function handleDeleteDoctor() {
    if (!deletingDoctor) return;
    setIsDeleting(true);
    try {
      await api.delete(`/doctors/${deletingDoctor.id}`);
      showToast(`${deletingDoctor.name} removed from directory.`);
      setDeletingDoctor(null);
      await fetchDoctors();
    } catch {
      showToast('Unable to remove doctor.', 'error');
    } finally {
      setIsDeleting(false);
    }
  }

  const hasFilters = Boolean(searchInput || specialization !== 'All' || startDate || endDate);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#0F172A] dark:text-white">Doctors</h1>
          <p className="text-sm text-[#64748B] dark:text-slate-400 mt-0.5">
            Manage clinical providers, specializations, and patient assignments
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              aria-label="Card view"
              aria-pressed={viewMode === 'cards'}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                viewMode === 'cards'
                  ? 'bg-white dark:bg-slate-900 text-[#0F172A] dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Cards</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              aria-label="Table view"
              aria-pressed={viewMode === 'table'}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-900 text-[#0F172A] dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-slate-200'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingDoctor(null);
              setDrawerOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Add Doctor</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white/95 dark:bg-slate-900/95 border border-[#E2E8F0] dark:border-slate-800 rounded-lg p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              aria-label="Search doctors"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search doctors by name, specialization..."
              className="w-full pl-10 pr-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-[#0F172A] dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-slate-900"
            />
          </div>

          <select
            aria-label="Filter by specialization"
            value={specialization}
            onChange={(e) => {
              setSpecialization(e.target.value);
              setPage(1);
            }}
            className="px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-[#0F172A] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-slate-900"
          >
            <option value="All">All Specializations</option>
            {SPECIALIZATIONS.map((spec) => (
              <option key={spec} value={spec}>
                {spec}
              </option>
            ))}
          </select>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 min-w-0">
            <div className="relative flex-1 sm:flex-none">
              <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="date"
                aria-label="Filter from date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="w-full sm:w-40 pl-8 pr-2.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-[#0F172A] dark:text-slate-100 tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-slate-900"
              />
            </div>
            <span className="hidden sm:inline text-xs text-slate-400 dark:text-slate-500 shrink-0">to</span>
            <input
              type="date"
              aria-label="Filter to date"
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
              className="px-3 py-2 text-xs font-medium text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-slate-200 whitespace-nowrap"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Directory Content */}
      {loading ? (
        viewMode === 'cards' ? <CardsGridSkeleton count={6} /> : <TableSkeleton rows={6} cols={6} />
      ) : doctors.length === 0 ? (
        <div className="bg-white/95 dark:bg-slate-900/95 border border-[#E2E8F0] dark:border-slate-800 rounded-lg py-16 px-4 text-center">
          <div className="w-11 h-11 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mx-auto mb-3">
            <Stethoscope className="w-5 h-5" />
          </div>
          <h2 className="text-base font-semibold text-[#0F172A] dark:text-white">No doctors found</h2>
          <p className="text-sm text-[#64748B] dark:text-slate-400 mt-1">
            {hasFilters
              ? 'Try adjusting your search or specialization filters.'
              : 'Get started by adding your first clinical provider.'}
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
                  setEditingDoctor(null);
                  setDrawerOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Doctor</span>
              </button>
            )}
          </div>
        </div>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {doctors.map((doc) => (
            <article
              key={doc.id}
              className="bg-white/95 dark:bg-slate-900/95 border border-[#E2E8F0] dark:border-slate-800 rounded-lg p-5 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[#2563EB] dark:text-blue-400">{doc.specialization}</p>
                    <h2 className="text-base font-semibold text-[#0F172A] dark:text-white mt-0.5 truncate">
                      {doc.name}
                    </h2>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingDoctor(doc);
                        setDrawerOpen(true);
                      }}
                      aria-label={`Edit ${doc.name}`}
                      className="p-1.5 text-slate-400 hover:text-[#0F172A] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingDoctor(doc)}
                      aria-label={`Delete ${doc.name}`}
                      className="p-1.5 text-slate-400 hover:text-[#DC2626] dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/60 rounded-md transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-[#64748B] dark:text-slate-400 mt-2 truncate">{doc.hospital}</p>

                <div className="mt-4 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2 tabular-nums">
                    <Phone className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                    <span className="truncate">{doc.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                    <span className="truncate">{doc.email}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300 tabular-nums">
                  {doc.patientsCount} {doc.patientsCount === 1 ? 'patient' : 'patients'}
                </span>
                <Link
                  to={`/doctors/${doc.id}`}
                  className="text-xs font-medium text-[#2563EB] dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 whitespace-nowrap"
                >
                  View Details
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="bg-white/95 dark:bg-slate-900/95 border border-[#E2E8F0] dark:border-slate-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4 font-medium">Name</th>
                  <th className="py-3 px-4 font-medium">Specialization</th>
                  <th className="py-3 px-4 font-medium">Hospital</th>
                  <th className="py-3 px-4 font-medium">Phone</th>
                  <th className="py-3 px-4 font-medium text-right">Patients</th>
                  <th className="py-3 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {doctors.map((doc) => (
                  <tr key={doc.id} className="h-14 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                    <td className="px-4 text-[13px] font-medium text-[#0F172A] dark:text-slate-100 whitespace-nowrap">
                      <Link to={`/doctors/${doc.id}`} className="hover:text-[#2563EB] dark:hover:text-blue-400">
                        {doc.name}
                      </Link>
                    </td>
                    <td className="px-4 text-[13px] text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {doc.specialization}
                    </td>
                    <td className="px-4 text-[13px] text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {doc.hospital}
                    </td>
                    <td className="px-4 text-[13px] text-slate-600 dark:text-slate-300 tabular-nums whitespace-nowrap">
                      {doc.phone}
                    </td>
                    <td className="px-4 text-[13px] font-medium text-[#0F172A] dark:text-slate-100 text-right tabular-nums whitespace-nowrap">
                      {doc.patientsCount}
                    </td>
                    <td className="px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <Link
                          to={`/doctors/${doc.id}`}
                          className="px-2 py-1 text-xs font-medium text-[#2563EB] dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded transition-colors"
                        >
                          Details
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingDoctor(doc);
                            setDrawerOpen(true);
                          }}
                          aria-label={`Edit ${doc.name}`}
                          className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingDoctor(doc)}
                          aria-label={`Delete ${doc.name}`}
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
      )}

      {!loading && doctors.length > 0 && (
        <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
      )}

      <DoctorSlideOver
        open={drawerOpen}
        doctor={editingDoctor}
        onClose={() => {
          setDrawerOpen(false);
          setEditingDoctor(null);
        }}
        onSubmit={handleSaveDoctor}
      />

      <DeleteConfirmModal
        open={Boolean(deletingDoctor)}
        title="Delete Doctor"
        message={
          deletingDoctor
            ? `Are you sure you want to delete ${deletingDoctor.name}? Any assigned patients will remain in the patient directory as unassigned.`
            : ''
        }
        isDeleting={isDeleting}
        onCancel={() => setDeletingDoctor(null)}
        onConfirm={handleDeleteDoctor}
      />
    </div>
  );
}
