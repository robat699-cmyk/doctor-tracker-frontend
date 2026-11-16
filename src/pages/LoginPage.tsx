import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Moon, Stethoscope, Sun } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { validateLoginInput } from '../lib/clinical';
import { ThemeBackdrop } from '../components/ThemeBackdrop';

export function LoginPage() {
  const { isAuthenticated, isLoading, login } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isLoading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setServerError(null);

    const validation = validateLoginInput(email, password);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } } };
      setServerError(apiErr.response?.data?.message || 'Invalid email or password.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleFillDemo() {
    setEmail('admin@careguidebd.com');
    setPassword('Admin@2026!');
    setErrors({});
    setServerError(null);
  }

  return (
    <div className="relative min-h-screen flex flex-col justify-center px-4 py-12">
      <ThemeBackdrop />

      <div className="fixed top-4 right-4 z-20">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={isDark ? 'Switch to day mode' : 'Switch to night mode'}
          aria-pressed={isDark}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white/90 dark:bg-slate-900/90 backdrop-blur-none hover:bg-white dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm transition-colors whitespace-nowrap"
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
      </div>

      <div className="relative z-10 max-w-sm w-full mx-auto p-8 bg-white/95 dark:bg-slate-900/95 backdrop-blur-none rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-9 h-9 rounded-lg bg-[#2563EB] flex items-center justify-center text-white shrink-0">
            <Stethoscope className="w-4 h-4" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-[#0F172A] dark:text-white">
            DoctorTracker
          </span>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight text-[#0F172A] dark:text-white">
          Sign in to DoctorTracker
        </h1>
        <p className="mt-1.5 text-sm text-[#64748B] dark:text-slate-400">
          Internal clinical operations & provider directory
        </p>

        <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
          <div>
            <label htmlFor="login-email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Work Email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                if (serverError) setServerError(null);
              }}
              placeholder="admin@careguidebd.com"
              className={`w-full px-3.5 py-2.5 text-sm rounded-lg border bg-white dark:bg-slate-950 text-[#0F172A] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-slate-900 ${
                errors.email ? 'border-[#DC2626]' : 'border-slate-300 dark:border-slate-700'
              }`}
            />
            {errors.email && <p className="mt-1 text-xs text-[#DC2626] dark:text-red-400">{errors.email}</p>}
          </div>

          <div>
            <label htmlFor="login-password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
                  if (serverError) setServerError(null);
                }}
                placeholder="Enter your password"
                className={`w-full pl-3.5 pr-10 py-2.5 text-sm rounded-lg border bg-white dark:bg-slate-950 text-[#0F172A] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-slate-900 ${
                  errors.password || serverError ? 'border-[#DC2626]' : 'border-slate-300 dark:border-slate-700'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="mt-1 text-xs text-[#DC2626] dark:text-red-400">{errors.password}</p>}
            {serverError && <p className="mt-1 text-xs text-[#DC2626] dark:text-red-400">{serverError}</p>}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 bg-[#2563EB] hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg font-medium text-sm transition-colors"
          >
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-xs text-[#64748B] dark:text-slate-400">
          <span className="truncate">Admin: admin@careguidebd.com</span>
          <button
            type="button"
            onClick={handleFillDemo}
            className="text-[#2563EB] dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium whitespace-nowrap shrink-0"
          >
            Fill credentials
          </button>
        </div>
      </div>
    </div>
  );
}
