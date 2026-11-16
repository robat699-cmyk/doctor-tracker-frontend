import { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import {
  BellRing,
  CalendarClock,
  CheckCircle2,
  Clock,
  Edit3,
  MessageSquareText,
  Phone,
  PhoneCall,
  Plus,
  Search,
  Send,
  Stethoscope,
  Trash2,
  User,
} from 'lucide-react';
import api from '../lib/api';
import {
  BOOKING_STATUSES,
  REMINDER_CHANNELS,
  type BookingStatus,
  type Doctor,
  type PaginatedResponse,
  type Patient,
  type PreBooking,
  type PreBookingFormInput,
  type ReminderChannel,
  type ReminderLog,
} from '../lib/clinical';
import { useToast } from '../context/ToastContext';
import { BookingSlideOver } from '../components/BookingSlideOver';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import { Pagination } from '../components/Pagination';

interface BookingsResponse extends PaginatedResponse<PreBooking> {
  stats: {
    upcomingCount: number;
    patientRemindersSent: number;
    doctorRemindersSent: number;
    pendingReminders: number;
  };
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return 'Not sent yet';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return format(parsed, 'MMM d, yyyy · h:mm a');
}

function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const styles: Record<BookingStatus, string> = {
    Scheduled: 'bg-blue-50 text-[#2563EB] border-blue-200 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-800/80',
    Confirmed: 'bg-emerald-50 text-[#059669] border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800/80',
    Reminded: 'bg-amber-50 text-[#D97706] border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800/80',
    Completed: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    Cancelled: 'bg-red-50 text-[#DC2626] border-red-200 dark:bg-red-950/60 dark:text-red-400 dark:border-red-800/80',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-md border whitespace-nowrap ${styles[status]}`}>
      {status}
    </span>
  );
}

export function BookingsPage() {
  const { showToast } = useToast();

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [doctorFilter, setDoctorFilter] = useState('All');
  const [channel, setChannel] = useState<ReminderChannel>('SMS');
  const [page, setPage] = useState(1);

  const [bookings, setBookings] = useState<PreBooking[]>([]);
  const [logs, setLogs] = useState<ReminderLog[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [stats, setStats] = useState({
    upcomingCount: 0,
    patientRemindersSent: 0,
    doctorRemindersSent: 0,
    pendingReminders: 0,
  });
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [sendingKey, setSendingKey] = useState<string | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<PreBooking | null>(null);
  const [deletingBooking, setDeletingBooking] = useState<PreBooking | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    Promise.all([
      api.get<PaginatedResponse<Doctor>>('/doctors', { params: { limit: 100 } }),
      api.get<PaginatedResponse<Patient>>('/patients', { params: { limit: 100 } }),
    ])
      .then(([docRes, patRes]) => {
        setDoctors(docRes.data.items);
        setPatients(patRes.data.items);
      })
      .catch(() => {
        // Non-blocking dropdown fetch
      });
  }, []);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const [bookingsRes, logsRes] = await Promise.all([
        api.get<BookingsResponse>('/bookings', {
          params: {
            search: debouncedSearch || undefined,
            status: statusFilter !== 'All' ? statusFilter : undefined,
            doctorId: doctorFilter !== 'All' ? doctorFilter : undefined,
            page,
            limit: 10,
          },
        }),
        api.get<{ logs: ReminderLog[] }>('/reminders', { params: { limit: 25 } }),
      ]);

      setBookings(bookingsRes.data.items);
      setStats(bookingsRes.data.stats);
      setTotal(bookingsRes.data.total);
      setTotalPages(bookingsRes.data.totalPages);
      setLogs(logsRes.data.logs || []);
    } catch {
      showToast('Failed to load pre-booking sessions.', 'error');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, doctorFilter, page, showToast]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  async function handleSaveBooking(payload: PreBookingFormInput) {
    if (editingBooking) {
      await api.put(`/bookings/${editingBooking.id}`, payload);
      showToast(`Updated session for ${payload.patientName}.`);
    } else {
      await api.post('/bookings', payload);
      showToast(`Pre-booking created for ${payload.patientName}.`);
    }
    await fetchBookings();
  }

  async function handleSendReminder(
    booking: PreBooking,
    target: 'patient' | 'doctor' | 'both'
  ) {
    const key = `${booking.id}-${target}`;
    setSendingKey(key);
    try {
      const res = await api.post<{ booking: PreBooking; logs: ReminderLog[] }>(
        `/bookings/${booking.id}/remind`,
        { target, channel }
      );
      setBookings((prev) => prev.map((b) => (b.id === booking.id ? res.data.booking : b)));
      setLogs((prev) => [...res.data.logs, ...prev].slice(0, 25));

      const targetLabel =
        target === 'both'
          ? `patient (${booking.patientPhone}) and doctor (${booking.doctorPhone})`
          : target === 'patient'
            ? `patient (${booking.patientPhone})`
            : `doctor (${booking.doctorPhone})`;
      showToast(`${channel} reminder dispatched to ${targetLabel}.`);
      await fetchBookings();
    } catch {
      showToast('Unable to send phone reminder.', 'error');
    } finally {
      setSendingKey(null);
    }
  }

  async function handleMarkCompleted(booking: PreBooking) {
    try {
      await api.put(`/bookings/${booking.id}`, {
        patientId: booking.patientId,
        patientName: booking.patientName,
        patientPhone: booking.patientPhone,
        doctorId: booking.doctorId,
        diseaseType: booking.diseaseType,
        sessionType: booking.sessionType,
        scheduledAt: booking.scheduledAt,
        status: 'Completed',
        remindPatient: booking.remindPatient,
        remindDoctor: booking.remindDoctor,
        notes: booking.notes,
      });
      showToast(`Session marked completed for ${booking.patientName}.`);
      await fetchBookings();
    } catch {
      showToast('Unable to update session status.', 'error');
    }
  }

  async function handleDeleteBooking() {
    if (!deletingBooking) return;
    setIsDeleting(true);
    try {
      await api.delete(`/bookings/${deletingBooking.id}`);
      showToast(`Deleted pre-booking for ${deletingBooking.patientName}.`);
      setDeletingBooking(null);
      await fetchBookings();
    } catch {
      showToast('Unable to delete pre-booking session.', 'error');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#0F172A] dark:text-white">
            Pre-Bookings & Phone Reminders
          </h1>
          <p className="text-sm text-[#64748B] dark:text-slate-400 mt-0.5">
            Schedule patient pre-booking sessions and dispatch SMS or voice reminders to both patient and doctor phone numbers
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingBooking(null);
            setDrawerOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg transition-colors self-start sm:self-auto whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>New Pre-Booking</span>
        </button>
      </div>

      {/* Metrics Strip */}
      <section aria-label="Pre-booking and reminder metrics" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white/95 dark:bg-slate-900/95 border border-[#E2E8F0] dark:border-slate-800 rounded-lg p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 flex items-center justify-center shrink-0">
            <CalendarClock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-[#64748B] dark:text-slate-400">Upcoming Sessions</p>
            <p className="mt-1 text-2xl font-semibold text-[#0F172A] dark:text-white tabular-nums">
              {stats.upcomingCount}
            </p>
          </div>
        </div>

        <div className="bg-white/95 dark:bg-slate-900/95 border border-[#E2E8F0] dark:border-slate-800 rounded-lg p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-[#059669] dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Phone className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-[#64748B] dark:text-slate-400">Patient Phone Reminders</p>
            <p className="mt-1 text-2xl font-semibold text-[#0F172A] dark:text-white tabular-nums">
              {stats.patientRemindersSent}
            </p>
          </div>
        </div>

        <div className="bg-white/95 dark:bg-slate-900/95 border border-[#E2E8F0] dark:border-slate-800 rounded-lg p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 flex items-center justify-center shrink-0">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-[#64748B] dark:text-slate-400">Doctor Phone Alerts</p>
            <p className="mt-1 text-2xl font-semibold text-[#0F172A] dark:text-white tabular-nums">
              {stats.doctorRemindersSent}
            </p>
          </div>
        </div>

        <div className="bg-white/95 dark:bg-slate-900/95 border border-[#E2E8F0] dark:border-slate-800 rounded-lg p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-[#D97706] dark:text-amber-400 flex items-center justify-center shrink-0">
            <BellRing className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-[#64748B] dark:text-slate-400">Pending Reminders</p>
            <p className="mt-1 text-2xl font-semibold text-[#0F172A] dark:text-white tabular-nums">
              {stats.pendingReminders}
            </p>
          </div>
        </div>
      </section>

      {/* Filter & Channel Bar */}
      <div className="bg-white/95 dark:bg-slate-900/95 border border-[#E2E8F0] dark:border-slate-800 rounded-lg p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              aria-label="Search pre-bookings"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search patient, doctor, or phone number..."
              className="w-full pl-10 pr-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-[#0F172A] dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 lg:flex lg:items-center gap-3">
            <select
              aria-label="Filter by session status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-[#0F172A] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Statuses</option>
              {BOOKING_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter by doctor"
              value={doctorFilter}
              onChange={(e) => {
                setDoctorFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-[#0F172A] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Doctors</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-[#64748B] dark:text-slate-400 whitespace-nowrap">
                Dispatch via:
              </span>
              <select
                aria-label="Reminder channel"
                value={channel}
                onChange={(e) => setChannel(e.target.value as ReminderChannel)}
                className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-[#0F172A] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {REMINDER_CHANNELS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid: Sessions List + Phone Reminder Log */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Sessions Column */}
        <section className="xl:col-span-8 space-y-4">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-40 bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : bookings.length === 0 ? (
            <div className="bg-white/95 dark:bg-slate-900/95 border border-[#E2E8F0] dark:border-slate-800 rounded-lg py-14 px-6 text-center">
              <CalendarClock className="w-8 h-8 text-slate-400 mx-auto mb-3" />
              <h2 className="text-base font-semibold text-[#0F172A] dark:text-white">
                No pre-booking sessions found
              </h2>
              <p className="text-sm text-[#64748B] dark:text-slate-400 mt-1">
                Schedule a patient pre-booking session to enable automated phone reminders for both patient and doctor.
              </p>
            </div>
          ) : (
            bookings.map((booking) => (
              <article
                key={booking.id}
                className="bg-white/95 dark:bg-slate-900/95 border border-[#E2E8F0] dark:border-slate-800 rounded-lg p-5 space-y-4"
              >
                {/* Card Top */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <BookingStatusBadge status={booking.status} />
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {booking.sessionType}
                      </span>
                      <span className="text-xs font-medium text-[#2563EB] dark:text-blue-400">
                        {booking.diseaseType}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-[#0F172A] dark:text-white tabular-nums">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span>{formatDateTime(booking.scheduledAt)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {booking.status !== 'Completed' && booking.status !== 'Cancelled' && (
                      <button
                        type="button"
                        onClick={() => handleMarkCompleted(booking)}
                        title="Mark Completed"
                        aria-label={`Mark session for ${booking.patientName} completed`}
                        className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-[#059669] dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-md transition-colors"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingBooking(booking);
                        setDrawerOpen(true);
                      }}
                      aria-label={`Edit pre-booking for ${booking.patientName}`}
                      className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingBooking(booking)}
                      aria-label={`Delete pre-booking for ${booking.patientName}`}
                      className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-[#DC2626] dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/60 rounded-md transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Dual Party Phone Panels: Patient & Doctor */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Patient Phone Panel */}
                  <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg p-3.5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <User className="w-3.5 h-3.5 text-[#059669] dark:text-emerald-400" />
                        Patient Phone
                      </span>
                      <span className="text-[11px] text-[#64748B] dark:text-slate-400 tabular-nums">
                        {booking.patientReminderSentAt
                          ? `Sent ${formatDateTime(booking.patientReminderSentAt)}`
                          : 'Pending reminder'}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-[#0F172A] dark:text-white truncate">
                      {booking.patientName}
                    </p>
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <a
                        href={`tel:${booking.patientPhone}`}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0F172A] dark:text-slate-200 hover:text-[#2563EB] tabular-nums"
                      >
                        <PhoneCall className="w-3.5 h-3.5 text-slate-400" />
                        <span>{booking.patientPhone}</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => handleSendReminder(booking, 'patient')}
                        disabled={sendingKey !== null}
                        aria-label={`Remind patient ${booking.patientName}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-100 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 rounded-md transition-colors whitespace-nowrap"
                      >
                        <Send className="w-3 h-3 text-[#2563EB] dark:text-blue-400" />
                        <span>{sendingKey === `${booking.id}-patient` ? 'Sending...' : 'Remind Patient'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Doctor Phone Panel */}
                  <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg p-3.5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <Stethoscope className="w-3.5 h-3.5 text-[#2563EB] dark:text-blue-400" />
                        Doctor Phone
                      </span>
                      <span className="text-[11px] text-[#64748B] dark:text-slate-400 tabular-nums">
                        {booking.doctorReminderSentAt
                          ? `Sent ${formatDateTime(booking.doctorReminderSentAt)}`
                          : 'Pending alert'}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-[#0F172A] dark:text-white truncate">
                      {booking.doctorName} · <span className="font-normal text-xs text-slate-500 dark:text-slate-400">{booking.doctorSpecialization}</span>
                    </p>
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <a
                        href={`tel:${booking.doctorPhone}`}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0F172A] dark:text-slate-200 hover:text-[#2563EB] tabular-nums"
                      >
                        <PhoneCall className="w-3.5 h-3.5 text-slate-400" />
                        <span>{booking.doctorPhone}</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => handleSendReminder(booking, 'doctor')}
                        disabled={sendingKey !== null}
                        aria-label={`Remind doctor ${booking.doctorName}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-100 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 rounded-md transition-colors whitespace-nowrap"
                      >
                        <Send className="w-3 h-3 text-[#2563EB] dark:text-blue-400" />
                        <span>{sendingKey === `${booking.id}-doctor` ? 'Sending...' : 'Remind Doctor'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Footer Notes + Remind Both CTA */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
                  <p className="text-xs text-[#64748B] dark:text-slate-400">
                    {booking.notes || 'No pre-session preparation notes logged.'}
                  </p>

                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={`sms:${booking.patientPhone}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors whitespace-nowrap"
                    >
                      <MessageSquareText className="w-3.5 h-3.5" />
                      <span>Device SMS</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => handleSendReminder(booking, 'both')}
                      disabled={sendingKey !== null}
                      aria-label={`Send phone reminder to both ${booking.patientName} and ${booking.doctorName}`}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-[#2563EB] hover:bg-blue-700 disabled:opacity-50 rounded-md transition-colors whitespace-nowrap"
                    >
                      <BellRing className="w-3.5 h-3.5" />
                      <span>
                        {sendingKey === `${booking.id}-both`
                          ? 'Dispatching...'
                          : `Remind Both (${channel})`}
                      </span>
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}

          {!loading && bookings.length > 0 && (
            <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
          )}
        </section>

        {/* Persistent Phone Reminder Dispatch Log */}
        <aside className="xl:col-span-4 bg-white/95 dark:bg-slate-900/95 border border-[#E2E8F0] dark:border-slate-800 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Reminder Dispatch Log
              </h2>
              <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
                Patient & doctor phone reminder audit trail
              </p>
            </div>
            <span className="text-xs font-semibold text-[#2563EB] dark:text-blue-400 tabular-nums">
              {logs.length}
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[680px] overflow-y-auto">
            {logs.length === 0 ? (
              <p className="px-5 py-10 text-xs text-slate-500 dark:text-slate-400 text-center">
                No phone reminders dispatched yet.
              </p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="px-5 py-3.5 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded border ${
                        log.recipientType === 'patient'
                          ? 'bg-emerald-50 text-[#059669] border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800'
                          : 'bg-blue-50 text-[#2563EB] border-blue-200 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-800'
                      }`}
                    >
                      {log.recipientType === 'patient' ? 'Patient' : 'Doctor'} · {log.channel}
                    </span>
                    <span className="text-[11px] text-[#94A3B8] dark:text-slate-500 tabular-nums">
                      {formatDateTime(log.sentAt)}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-[#0F172A] dark:text-slate-100 tabular-nums">
                    {log.recipientName} · {log.phoneNumber}
                  </p>
                  <p className="text-xs text-[#64748B] dark:text-slate-400 leading-relaxed">
                    {log.message}
                  </p>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>

      <BookingSlideOver
        open={drawerOpen}
        booking={editingBooking}
        doctors={doctors}
        patients={patients}
        onClose={() => {
          setDrawerOpen(false);
          setEditingBooking(null);
        }}
        onSubmit={handleSaveBooking}
      />

      <DeleteConfirmModal
        open={Boolean(deletingBooking)}
        title="Delete Pre-Booking Session"
        message={
          deletingBooking
            ? `Are you sure you want to cancel and delete the pre-booking session for ${deletingBooking.patientName}?`
            : ''
        }
        isDeleting={isDeleting}
        onCancel={() => setDeletingBooking(null)}
        onConfirm={handleDeleteBooking}
      />
    </div>
  );
}
