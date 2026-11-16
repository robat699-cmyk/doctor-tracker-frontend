import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  Clock,
  Edit3,
  ExternalLink,
  FileText,
  Mail,
  MapPin,
  Phone,
  Plus,
  Trash2,
  Users,
} from 'lucide-react';
import api from '../lib/api';
import type {
  DoctorDetail,
  DoctorFormInput,
  MapGroundingLink,
  Patient,
  PatientFormInput,
  PreBookingFormInput,
} from '../lib/clinical';
import { useToast } from '../context/ToastContext';
import { ConditionBadge } from '../components/ConditionBadge';
import { DoctorSlideOver } from '../components/DoctorSlideOver';
import { PatientSlideOver } from '../components/PatientSlideOver';
import { PatientReportDrawer } from '../components/PatientReportDrawer';
import { BookingSlideOver } from '../components/BookingSlideOver';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import { MarkdownContent } from '../components/MarkdownContent';
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

export function DoctorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();

  const [doctor, setDoctor] = useState<DoctorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [addPatientOpen, setAddPatientOpen] = useState(false);
  const [bookingDrawerOpen, setBookingDrawerOpen] = useState(false);
  const [reportPatientId, setReportPatientId] = useState<number | null>(null);
  const [unlinkingPatient, setUnlinkingPatient] = useState<Patient | null>(null);
  const [isUnlinking, setIsUnlinking] = useState(false);

  const [mapsLoading, setMapsLoading] = useState(false);
  const [mapsSummary, setMapsSummary] = useState<string | null>(null);
  const [mapsLinks, setMapsLinks] = useState<MapGroundingLink[]>([]);
  const [mapsError, setMapsError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await api.get<DoctorDetail>(`/doctors/${id}`);
      setDoctor(res.data);
      setError(null);
    } catch {
      setError('Doctor record could not be found.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  async function handleUpdateDoctor(payload: DoctorFormInput) {
    if (!doctor) return;
    await api.put(`/doctors/${doctor.id}`, payload);
    showToast(`${payload.name} updated.`);
    await fetchDetail();
  }

  async function handleAssignPatient(payload: PatientFormInput) {
    if (!doctor) return;
    await api.post(`/doctors/${doctor.id}/patients`, payload);
    showToast(`${payload.name} assigned to ${doctor.name}.`);
    await fetchDetail();
  }

  async function handleCreateBooking(payload: PreBookingFormInput) {
    await api.post('/bookings', payload);
    showToast(`Pre-booking session scheduled for ${payload.patientName}.`);
  }

  async function handleUnlinkPatient() {
    if (!doctor || !unlinkingPatient) return;
    setIsUnlinking(true);
    try {
      await api.delete(`/doctors/${doctor.id}/patients/${unlinkingPatient.id}`);
      showToast(`${unlinkingPatient.name} removed from ${doctor.name}'s roster.`);
      setUnlinkingPatient(null);
      await fetchDetail();
    } catch {
      showToast('Failed to unlink patient.', 'error');
    } finally {
      setIsUnlinking(false);
    }
  }

  async function handleLookupNearbyFacilities() {
    if (!doctor || mapsLoading) return;
    setMapsLoading(true);
    setMapsError(null);

    const getOptionalLocation = () =>
      new Promise<{ latitude: number; longitude: number } | null>((resolve) => {
        if (!navigator.geolocation) {
          resolve(null);
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) =>
            resolve({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            }),
          () => resolve(null),
          { timeout: 3500 }
        );
      });

    try {
      const location = await getOptionalLocation();
      const query = `Verify location details for ${doctor.hospital} and list nearby ${doctor.specialization} referral clinics, diagnostic imaging labs, and 24-hour pharmacies.`;
      const res = await api.post<{
        text: string;
        mapLinks: MapGroundingLink[];
      }>('/assistant/maps', { query, location });

      setMapsSummary(res.data.text);
      setMapsLinks(res.data.mapLinks || []);
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } } };
      setMapsError(
        apiErr.response?.data?.message || 'Unable to load Google Maps facility results.'
      );
    } finally {
      setMapsLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-5 w-32 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        <div className="h-36 w-full bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-lg animate-pulse" />
        <TableSkeleton rows={5} cols={6} />
      </div>
    );
  }

  if (error || !doctor) {
    return (
      <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-lg p-12 text-center">
        <h1 className="text-lg font-semibold text-[#0F172A] dark:text-white">{error || 'Doctor not found'}</h1>
        <Link
          to="/doctors"
          className="inline-flex items-center gap-2 mt-4 px-4 py-2 text-sm font-medium text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Doctors</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/doctors"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-slate-100 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Doctors</span>
        </Link>
      </div>

      {/* Doctor Profile Card */}
      <section className="bg-white/95 dark:bg-slate-900/95 border border-[#E2E8F0] dark:border-slate-800 rounded-lg p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-[#2563EB] dark:text-blue-400">{doctor.specialization}</p>
            <h1 className="text-2xl font-semibold tracking-tight text-[#0F172A] dark:text-white mt-0.5">
              {doctor.name}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-600 dark:text-slate-300">
              <span className="inline-flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                <span>{doctor.hospital}</span>
              </span>
              <a
                href={`tel:${doctor.phone}`}
                className="inline-flex items-center gap-2 tabular-nums hover:text-[#2563EB] dark:hover:text-blue-400"
              >
                <Phone className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                <span>{doctor.phone}</span>
              </a>
              <span className="inline-flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                <span>{doctor.email}</span>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-right">
              <p className="text-xs text-[#64748B] dark:text-slate-400">Assigned Patients</p>
              <p className="text-lg font-semibold text-[#0F172A] dark:text-white tabular-nums">
                {doctor.patients.length}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setBookingDrawerOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-[#2563EB] dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-950 rounded-lg transition-colors whitespace-nowrap"
            >
              <CalendarClock className="w-4 h-4" />
              <span>Pre-Book Session</span>
            </button>
            <button
              type="button"
              onClick={() => setEditDrawerOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit Doctor</span>
            </button>
          </div>
        </div>
      </section>

      {/* Assigned Patients Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Assigned Patients
            </h2>
            <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
              Active patients currently managed by {doctor.name}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setAddPatientOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Add Patient</span>
          </button>
        </div>

        {doctor.patients.length === 0 ? (
          <div className="bg-white/95 dark:bg-slate-900/95 border border-[#E2E8F0] dark:border-slate-800 rounded-lg py-12 px-4 text-center">
            <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mx-auto mb-3">
              <Users className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-[#0F172A] dark:text-white">No patients assigned yet</p>
            <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1">
              Assign a patient directly to this provider using the Add Patient button.
            </p>
          </div>
        ) : (
          <div className="bg-white/95 dark:bg-slate-900/95 border border-[#E2E8F0] dark:border-slate-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="py-3 px-4 font-medium">Patient Name</th>
                    <th className="py-3 px-4 font-medium">Disease Type</th>
                    <th className="py-3 px-4 font-medium">Condition</th>
                    <th className="py-3 px-4 font-medium">Last Check-in</th>
                    <th className="py-3 px-4 font-medium">Phone</th>
                    <th className="py-3 px-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {doctor.patients.map((patient) => (
                    <tr key={patient.id} className="h-14 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                      <td className="px-4 whitespace-nowrap">
                        <div className="text-[13px] font-medium text-[#0F172A] dark:text-slate-100">
                          {patient.name}
                        </div>
                        <div className="text-[11px] text-[#64748B] dark:text-slate-400 tabular-nums">
                          {patient.age} yrs · {patient.gender} · Admitted {formatSafeDate(patient.admissionDate)}
                        </div>
                      </td>
                      <td className="px-4 text-[13px] text-slate-700 dark:text-slate-200 whitespace-nowrap">
                        {patient.diseaseType || 'General Medicine'}
                      </td>
                      <td className="px-4 whitespace-nowrap">
                        <ConditionBadge condition={patient.condition} />
                      </td>
                      <td className="px-4 text-[12px] text-slate-600 dark:text-slate-300 tabular-nums whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatCheckIn(patient.lastCheckIn)}</span>
                        </span>
                      </td>
                      <td className="px-4 text-[13px] text-slate-600 dark:text-slate-300 tabular-nums whitespace-nowrap">
                        {patient.contactNumber}
                      </td>
                      <td className="px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
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
                            onClick={() => setUnlinkingPatient(patient)}
                            aria-label={`Remove ${patient.name} from ${doctor.name}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-[#DC2626] dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/60 rounded-md transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
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
      </section>

      {/* Google Maps Grounding Facility Locator */}
      <section className="bg-white/95 dark:bg-slate-900/95 border border-[#E2E8F0] dark:border-slate-800 rounded-lg p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-sm font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Facility & Referral Locator
            </h2>
            <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
              Grounded with Google Maps for {doctor.hospital} and nearby {doctor.specialization}{' '}
              care centers
            </p>
          </div>
          <button
            type="button"
            onClick={handleLookupNearbyFacilities}
            disabled={mapsLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60 rounded-lg transition-colors self-start sm:self-auto whitespace-nowrap"
          >
            <MapPin className="w-3.5 h-3.5 text-[#2563EB] dark:text-blue-400" />
            <span>{mapsLoading ? 'Searching Maps...' : 'Find Nearby Facilities'}</span>
          </button>
        </div>

        {mapsError && (
          <p role="alert" className="text-xs text-[#DC2626] dark:text-red-400 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/70 rounded-lg px-3.5 py-2.5">
            {mapsError}
          </p>
        )}

        {mapsLoading && (
          <div className="space-y-2.5 animate-pulse">
            <div className="h-3.5 bg-slate-100 dark:bg-slate-800 rounded w-3/4" />
            <div className="h-3.5 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
          </div>
        )}

        {!mapsLoading && mapsSummary && (
          <div className="space-y-4">
            <MarkdownContent content={mapsSummary} />

            {mapsLinks.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                {mapsLinks.map((place) => (
                  <div
                    key={place.uri}
                    className="border border-slate-200 dark:border-slate-700 rounded-lg p-3.5 bg-slate-50/70 dark:bg-slate-800/70"
                  >
                    <a
                      href={place.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-[#2563EB] dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline"
                    >
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span>{place.title}</span>
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    </a>
                    {place.reviewSnippets.length > 0 && (
                      <p className="mt-1.5 text-xs text-[#64748B] dark:text-slate-400 line-clamp-2">
                        “{place.reviewSnippets[0].text}”
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <DoctorSlideOver
        open={editDrawerOpen}
        doctor={doctor}
        onClose={() => setEditDrawerOpen(false)}
        onSubmit={handleUpdateDoctor}
      />

      <PatientSlideOver
        open={addPatientOpen}
        patient={null}
        doctors={[doctor]}
        lockedDoctor={{ id: doctor.id, name: doctor.name }}
        onClose={() => setAddPatientOpen(false)}
        onSubmit={handleAssignPatient}
      />

      <BookingSlideOver
        open={bookingDrawerOpen}
        booking={null}
        doctors={[doctor]}
        patients={doctor.patients}
        defaultDoctorId={doctor.id}
        onClose={() => setBookingDrawerOpen(false)}
        onSubmit={handleCreateBooking}
      />

      <PatientReportDrawer
        patientId={reportPatientId}
        onClose={() => setReportPatientId(null)}
        onReportChanged={fetchDetail}
      />

      <DeleteConfirmModal
        open={Boolean(unlinkingPatient)}
        title="Remove Patient Assignment"
        confirmLabel="Remove"
        message={
          unlinkingPatient
            ? `Are you sure you want to remove ${unlinkingPatient.name} from ${doctor.name}'s active roster? The patient record will remain in the global directory as unassigned.`
            : ''
        }
        isDeleting={isUnlinking}
        onCancel={() => setUnlinkingPatient(null)}
        onConfirm={handleUnlinkPatient}
      />
    </div>
  );
}
