import { useEffect, useRef, useState, type ReactNode } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  LayoutDashboard,
  Stethoscope,
  Users,
  CalendarClock,
  MessageSquare,
  LogOut,
  Bell,
  Menu,
  X,
  ChevronRight,
  AlertTriangle,
  Moon,
  Sun,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getInitials, type ClinicalAlert } from '../lib/clinical';
import api from '../lib/api';
import { ThemeBackdrop } from './ThemeBackdrop';
import { FloatingAssistantWidget } from './FloatingAssistantWidget';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/doctors', label: 'Doctors', icon: Stethoscope },
  { to: '/patients', label: 'Patients', icon: Users },
  { to: '/bookings', label: 'Pre-Bookings', icon: CalendarClock },
  { to: '/assistant', label: 'Assistant', icon: MessageSquare },
];

function buildBreadcrumbs(pathname: string): Array<{ label: string; to?: string }> {
  if (pathname.startsWith('/doctors/')) {
    return [
      { label: 'DoctorTracker', to: '/dashboard' },
      { label: 'Doctors', to: '/doctors' },
      { label: 'Provider Detail' },
    ];
  }
  if (pathname.startsWith('/doctors')) {
    return [{ label: 'DoctorTracker', to: '/dashboard' }, { label: 'Doctors' }];
  }
  if (pathname.startsWith('/patients')) {
    return [{ label: 'DoctorTracker', to: '/dashboard' }, { label: 'Patients' }];
  }
  if (pathname.startsWith('/bookings')) {
    return [{ label: 'DoctorTracker', to: '/dashboard' }, { label: 'Pre-Bookings' }];
  }
  if (pathname.startsWith('/assistant')) {
    return [{ label: 'DoctorTracker', to: '/dashboard' }, { label: 'Clinical Assistant' }];
  }
  return [{ label: 'DoctorTracker', to: '/dashboard' }, { label: 'Dashboard' }];
}

export function LayoutShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [alerts, setAlerts] = useState<ClinicalAlert[]>([]);
  const alertMenuRef = useRef<HTMLDivElement>(null);

  const breadcrumbs = buildBreadcrumbs(location.pathname);
  const formattedDate = format(new Date(), 'EEE, MMM d, yyyy');

  useEffect(() => {
    setMobileOpen(false);
    setAlertsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ alerts: ClinicalAlert[] }>('/analytics/dashboard')
      .then((res) => {
        if (!cancelled) {
          setAlerts(res.data.alerts || []);
        }
      })
      .catch(() => {
        // Non-blocking header alert fetch
      });
    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (alertMenuRef.current && !alertMenuRef.current.contains(e.target as Node)) {
        setAlertsOpen(false);
      }
    }
    if (alertsOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [alertsOpen]);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#0F172A] dark:bg-[#090F1D] text-slate-200 border-r border-slate-800/80 select-none">
      <div className="flex items-center justify-between h-16 px-5 border-b border-slate-800 shrink-0">
        <Link to="/dashboard" className="flex items-center gap-2.5 text-white font-semibold text-lg tracking-tight whitespace-nowrap">
          <div className="w-8 h-8 rounded-lg bg-[#2563EB] flex items-center justify-center text-white shrink-0">
            <Stethoscope className="w-4 h-4" />
          </div>
          <span>DoctorTracker</span>
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation menu"
          className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-md"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav aria-label="Primary navigation" className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium rounded-md transition-all duration-150 whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-800 text-white border-l-2 border-[#2563EB]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border-l-2 border-transparent'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800 shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 text-slate-100 flex items-center justify-center text-xs font-semibold shrink-0">
            {getInitials(user?.name || 'Admin')}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white truncate">{user?.name || 'Admin'}</p>
            <p className="text-xs text-slate-400 truncate">{user?.role || 'Operations'}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen text-[#0F172A] dark:text-slate-100">
      <ThemeBackdrop />

      {/* Desktop persistent sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-64 lg:flex-col z-30">
        {sidebarContent}
      </aside>

      {/* Mobile slide-over drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/60"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-64 max-w-[80vw] h-full">{sidebarContent}</aside>
        </div>
      )}

      {/* Main content shell */}
      <div className="relative z-10 lg:pl-64 flex flex-col min-h-screen">
        <header className="sticky top-0 z-20 h-16 bg-white/94 dark:bg-slate-900/94 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>

            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm min-w-0">
              {breadcrumbs.map((crumb, index) => {
                const isLast = index === breadcrumbs.length - 1;
                return (
                  <div key={crumb.label} className="flex items-center gap-1.5 min-w-0">
                    {index > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />}
                    {crumb.to && !isLast ? (
                      <Link
                        to={crumb.to}
                        className="text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white transition-colors truncate whitespace-nowrap"
                      >
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="font-medium text-[#0F172A] dark:text-slate-100 truncate whitespace-nowrap">
                        {crumb.label}
                      </span>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden sm:inline text-xs font-medium text-[#64748B] dark:text-slate-400 tabular-nums whitespace-nowrap">
              {formattedDate}
            </span>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? 'Switch to day mode' : 'Switch to night mode'}
              aria-pressed={isDark}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100/80 dark:bg-slate-800/90 hover:bg-slate-200/80 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors whitespace-nowrap"
            >
              {isDark ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Day Mode</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  <span>Night Mode</span>
                </>
              )}
            </button>

            <div className="relative" ref={alertMenuRef}>
              <button
                type="button"
                onClick={() => setAlertsOpen((prev) => !prev)}
                aria-label="View clinical priority alerts"
                aria-expanded={alertsOpen}
                className="relative p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <Bell className="w-4 h-4" />
                {alerts.some((a) => a.condition === 'Critical') && (
                  <span className="sr-only">Critical alerts present</span>
                )}
              </button>

              {alertsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-40 overflow-hidden animate-fade-in-bottom">
                  <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Priority Clinical Alerts
                    </span>
                    <span className="text-xs font-medium text-[#DC2626] dark:text-red-400 tabular-nums">
                      {alerts.filter((a) => a.condition === 'Critical').length} Critical
                    </span>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto">
                    {alerts.length === 0 ? (
                      <p className="px-4 py-6 text-xs text-slate-500 dark:text-slate-400 text-center">
                        No priority clinical alerts at this time.
                      </p>
                    ) : (
                      alerts.map((alert) => (
                        <Link
                          key={alert.patientId}
                          to={`/patients?condition=${encodeURIComponent(alert.condition)}`}
                          onClick={() => setAlertsOpen(false)}
                          className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors"
                        >
                          <AlertTriangle
                            className={`w-4 h-4 mt-0.5 shrink-0 ${
                              alert.condition === 'Critical'
                                ? 'text-[#DC2626] dark:text-red-400'
                                : 'text-[#D97706] dark:text-amber-400'
                            }`}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-[#0F172A] dark:text-slate-100 truncate">
                              {alert.patientName}
                            </p>
                            <p className="text-xs text-[#64748B] dark:text-slate-400 truncate mt-0.5">
                              {alert.condition} · {alert.doctorName || 'Unassigned'}
                            </p>
                          </div>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-8 pt-6 pb-20 max-w-[1440px] w-full mx-auto">
          {children}
        </main>
      </div>

      <FloatingAssistantWidget />
    </div>
  );
}
