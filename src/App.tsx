import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { LayoutShell } from './components/LayoutShell';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { DoctorsPage } from './pages/DoctorsPage';
import { DoctorDetailPage } from './pages/DoctorDetailPage';
import { PatientsPage } from './pages/PatientsPage';
import { BookingsPage } from './pages/BookingsPage';
import { AssistantPage } from './pages/AssistantPage';

function ProtectedShell({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAFBFC] dark:bg-[#0B1120] flex items-center justify-center">
        <div className="w-64 space-y-3 animate-pulse">
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4 mx-auto" />
          <div className="h-3 bg-slate-100 dark:bg-slate-900 rounded w-1/2 mx-auto" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <LayoutShell>{children}</LayoutShell>;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedShell>
                    <DashboardPage />
                  </ProtectedShell>
                }
              />
              <Route
                path="/doctors"
                element={
                  <ProtectedShell>
                    <DoctorsPage />
                  </ProtectedShell>
                }
              />
              <Route
                path="/doctors/:id"
                element={
                  <ProtectedShell>
                    <DoctorDetailPage />
                  </ProtectedShell>
                }
              />
              <Route
                path="/patients"
                element={
                  <ProtectedShell>
                    <PatientsPage />
                  </ProtectedShell>
                }
              />
              <Route
                path="/bookings"
                element={
                  <ProtectedShell>
                    <BookingsPage />
                  </ProtectedShell>
                }
              />
              <Route
                path="/assistant"
                element={
                  <ProtectedShell>
                    <AssistantPage />
                  </ProtectedShell>
                }
              />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
