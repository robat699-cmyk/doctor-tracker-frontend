import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Stethoscope,
  Users,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import api from '../lib/api';
import type { DashboardAnalytics } from '../lib/clinical';
import { useTheme } from '../context/ThemeContext';
import { ConditionBadge } from '../components/ConditionBadge';
import { DashboardSkeleton } from '../components/Skeletons';

function formatSafeDate(isoDate: string): string {
  const parsed = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return format(parsed, 'MMM d, yyyy');
}

function DeltaIndicator({ value, invertColor = false }: { value: number; invertColor?: boolean }) {
  const isPositive = value >= 0;
  const isGood = invertColor ? !isPositive : isPositive;
  const colorClass = isGood
    ? 'text-[#059669] dark:text-emerald-400'
    : 'text-[#DC2626] dark:text-red-400';
  const Icon = isPositive ? ArrowUpRight : ArrowDownRight;

  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium tabular-nums ${colorClass}`}>
      <span>{`${isPositive ? '+' : ''}${value}%`}</span>
      <Icon className="w-3.5 h-3.5" />
    </span>
  );
}

export function DashboardPage() {
  const { isDark } = useTheme();
  const [data, setData] = useState<DashboardAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const gridStroke = isDark ? '#1E293B' : '#E2E8F0';
  const axisTickColor = isDark ? '#94A3B8' : '#64748B';
  const yAxisNameColor = isDark ? '#E2E8F0' : '#0F172A';
  const pieStrokeColor = isDark ? '#0F172A' : '#FFFFFF';
  const barCursorFill = isDark ? '#1E293B' : '#F8FAFC';

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get<DashboardAnalytics>('/analytics/dashboard')
      .then((res) => {
        if (!cancelled) {
          setData(res.data);
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Unable to load clinical analytics. Please refresh.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#0F172A] dark:text-white">Dashboard</h1>
          <p className="text-sm text-[#64748B] dark:text-slate-400 mt-0.5">Overview of your clinical operations</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/doctors"
            className="px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap"
          >
            Manage Doctors
          </Link>
          <Link
            to="/bookings"
            className="px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap tabular-nums"
          >
            Pre-Bookings{typeof data?.upcomingBookingsCount === 'number' ? ` (${data.upcomingBookingsCount})` : ''}
          </Link>
          <Link
            to="/patients"
            className="px-3.5 py-2 text-xs font-medium text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap"
          >
            Patient Directory
          </Link>
        </div>
      </div>

      {loading ? (
        <DashboardSkeleton />
      ) : error || !data ? (
        <div className="bg-white/95 dark:bg-slate-900/95 border border-red-200 dark:border-red-900 rounded-lg p-8 text-center">
          <AlertTriangle className="w-8 h-8 text-[#DC2626] dark:text-red-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-[#0F172A] dark:text-slate-100">
            {error || 'No analytics data available.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stat Cards Row */}
          <section aria-label="Key clinical metrics" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="bg-white/95 dark:bg-slate-900/95 border border-[#E2E8F0] dark:border-slate-800 rounded-lg p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 flex items-center justify-center shrink-0">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-[#64748B] dark:text-slate-400">Total Doctors</p>
                <p className="mt-1 text-3xl font-semibold tracking-tight text-[#0F172A] dark:text-white tabular-nums">
                  {data.totalDoctors}
                </p>
                <div className="mt-1 flex items-center gap-1.5">
                  <DeltaIndicator value={data.doctorsDeltaPercent} />
                  <span className="text-xs text-[#94A3B8] dark:text-slate-500">vs prior 7d</span>
                </div>
              </div>
            </div>

            <div className="bg-white/95 dark:bg-slate-900/95 border border-[#E2E8F0] dark:border-slate-800 rounded-lg p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-[#059669] dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-[#64748B] dark:text-slate-400">Total Patients</p>
                <p className="mt-1 text-3xl font-semibold tracking-tight text-[#0F172A] dark:text-white tabular-nums">
                  {data.totalPatients}
                </p>
                <div className="mt-1 flex items-center gap-1.5">
                  <DeltaIndicator value={data.patientsDeltaPercent} />
                  <span className="text-xs text-[#94A3B8] dark:text-slate-500">vs prior 7d</span>
                </div>
              </div>
            </div>

            <div className="bg-white/95 dark:bg-slate-900/95 border border-[#E2E8F0] dark:border-slate-800 rounded-lg p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-[#D97706] dark:text-amber-400 flex items-center justify-center shrink-0">
                <Activity className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-[#64748B] dark:text-slate-400">Avg Patients / Doctor</p>
                <p className="mt-1 text-3xl font-semibold tracking-tight text-[#0F172A] dark:text-white tabular-nums">
                  {data.avgPatientsPerDoctor.toFixed(1)}
                </p>
                <div className="mt-1 flex items-center gap-1.5">
                  <DeltaIndicator value={data.avgLoadDeltaPercent} />
                  <span className="text-xs text-[#94A3B8] dark:text-slate-500">caseload ratio</span>
                </div>
              </div>
            </div>

            <div className="bg-white/95 dark:bg-slate-900/95 border border-[#E2E8F0] dark:border-slate-800 rounded-lg p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-950/60 text-[#DC2626] dark:text-red-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-[#64748B] dark:text-slate-400">Critical Patients</p>
                <p className="mt-1 text-3xl font-semibold tracking-tight text-[#0F172A] dark:text-white tabular-nums">
                  {data.criticalCount}
                </p>
                <div className="mt-1 flex items-center gap-1.5">
                  <DeltaIndicator value={data.criticalDeltaPercent} invertColor />
                  <span className="text-xs text-[#94A3B8] dark:text-slate-500 whitespace-nowrap">priority cases</span>
                </div>
              </div>
            </div>
          </section>

          {/* Charts Section */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white/95 dark:bg-slate-900/95 border border-[#E2E8F0] dark:border-slate-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Patient Admissions Over Time
                  </h2>
                  <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
                    Daily intake volume across the last 14 days
                  </p>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.admissionTrend} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="admissionsFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={isDark ? '#2563EB' : '#DBEAFE'} stopOpacity={isDark ? 0.35 : 0.9} />
                        <stop offset="100%" stopColor={isDark ? '#2563EB' : '#DBEAFE'} stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 12, fill: axisTickColor }}
                      tickLine={false}
                      axisLine={{ stroke: gridStroke }}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 12, fill: axisTickColor }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        const point = payload[0].payload as { label: string; admissions: number };
                        return (
                          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm px-3 py-2 text-xs">
                            <p className="font-medium text-[#0F172A] dark:text-slate-100">{point.label}</p>
                            <p className="text-[#64748B] dark:text-slate-400 mt-0.5 tabular-nums">
                              Admissions: <span className="font-semibold text-[#2563EB] dark:text-blue-400">{point.admissions}</span>
                            </p>
                          </div>
                        );
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="admissions"
                      stroke="#2563EB"
                      strokeWidth={2}
                      fill="url(#admissionsFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white/95 dark:bg-slate-900/95 border border-[#E2E8F0] dark:border-slate-800 rounded-lg p-6 flex flex-col">
              <div>
                <h2 className="text-sm font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Patient Conditions
                </h2>
                <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">Active clinical status breakdown</p>
              </div>

              <div className="h-48 w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.conditionDistribution}
                      dataKey="count"
                      nameKey="condition"
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={76}
                      paddingAngle={2}
                    >
                      {data.conditionDistribution.map((entry) => (
                        <Cell key={entry.condition} fill={entry.color} stroke={pieStrokeColor} strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        const item = payload[0].payload as { condition: string; count: number };
                        return (
                          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm px-3 py-2 text-xs">
                            <p className="font-medium text-[#0F172A] dark:text-slate-100">{item.condition}</p>
                            <p className="text-[#64748B] dark:text-slate-400 mt-0.5 tabular-nums">{item.count} patients</p>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-2 space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                {data.conditionDistribution.map((item) => (
                  <div key={item.condition} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-sm shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-slate-700 dark:text-slate-300 truncate">{item.condition}</span>
                    </div>
                    <span className="font-medium text-[#0F172A] dark:text-slate-100 tabular-nums">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Bottom Section */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 bg-white/95 dark:bg-slate-900/95 border border-[#E2E8F0] dark:border-slate-800 rounded-lg p-6">
              <div className="mb-4">
                <h2 className="text-sm font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Patients Per Doctor
                </h2>
                <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
                  Caseload distribution across top providers
                </p>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.patientsPerDoctor}
                    layout="vertical"
                    margin={{ top: 4, right: 16, left: 4, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                    <XAxis
                      type="number"
                      allowDecimals={false}
                      tick={{ fontSize: 12, fill: axisTickColor }}
                      tickLine={false}
                      axisLine={{ stroke: gridStroke }}
                    />
                    <YAxis
                      type="category"
                      dataKey="doctorName"
                      width={152}
                      tick={{ fontSize: 12, fill: yAxisNameColor }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: barCursorFill }}
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        const row = payload[0].payload as {
                          doctorName: string;
                          specialization: string;
                          patientsCount: number;
                        };
                        return (
                          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm px-3 py-2 text-xs">
                            <p className="font-medium text-[#0F172A] dark:text-slate-100">{row.doctorName}</p>
                            <p className="text-[#64748B] dark:text-slate-400">{row.specialization}</p>
                            <p className="text-[#2563EB] dark:text-blue-400 font-semibold mt-1 tabular-nums">
                              {row.patientsCount} assigned patients
                            </p>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="patientsCount" fill="#2563EB" radius={[0, 4, 4, 0]} barSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="lg:col-span-7 bg-white/95 dark:bg-slate-900/95 border border-[#E2E8F0] dark:border-slate-800 rounded-lg overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Recent Patients
                  </h2>
                  <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">Latest 5 patient admissions</p>
                </div>
                <Link
                  to="/patients"
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#2563EB] dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 whitespace-nowrap"
                >
                  <span>View All</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <th className="py-2.5 px-3 font-medium">Name</th>
                      <th className="py-2.5 px-3 font-medium">Doctor</th>
                      <th className="py-2.5 px-3 font-medium">Condition</th>
                      <th className="py-2.5 px-3 font-medium text-right">Admitted</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {data.recentPatients.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                          No patients recorded yet.
                        </td>
                      </tr>
                    ) : (
                      data.recentPatients.map((patient) => (
                        <tr key={patient.id} className="h-12 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                          <td className="px-3 text-[13px] font-medium text-[#0F172A] dark:text-slate-100 whitespace-nowrap">
                            {patient.name}
                          </td>
                          <td className="px-3 text-[13px] text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            {patient.doctorName || 'Unassigned'}
                          </td>
                          <td className="px-3 whitespace-nowrap">
                            <ConditionBadge condition={patient.condition} />
                          </td>
                          <td className="px-3 text-[13px] text-slate-600 dark:text-slate-300 text-right tabular-nums whitespace-nowrap">
                            {formatSafeDate(patient.admissionDate)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
