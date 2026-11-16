import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';

const DAY_BACKDROP_SRC = '/src/assets/images/bg_clinical_day_1794868729410.jpg';
const NIGHT_BACKDROP_SRC = '/src/assets/images/bg_clinical_night_1794868730392.jpg';

export function ThemeBackdrop() {
  const { isDark } = useTheme();
  const [dayFailed, setDayFailed] = useState(false);
  const [nightFailed, setNightFailed] = useState(false);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none select-none overflow-hidden z-0"
    >
      {/* Fallback architectural gradient canvas */}
      <div
        className={`absolute inset-0 transition-colors duration-300 ${
          isDark
            ? 'bg-gradient-to-br from-[#070B14] via-[#0B1120] to-[#0F172A]'
            : 'bg-gradient-to-br from-[#F1F5F9] via-[#FAFBFC] to-[#E2E8F0]'
        }`}
      />

      {/* Day Mode Background Image */}
      {!dayFailed && (
        <img
          src={DAY_BACKDROP_SRC}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setDayFailed(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            isDark ? 'opacity-0' : 'opacity-100'
          }`}
        />
      )}

      {/* Night Mode Background Image */}
      {!nightFailed && (
        <img
          src={NIGHT_BACKDROP_SRC}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setNightFailed(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            isDark ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}

      {/* Measured contrast scrim to preserve WCAG AA readability over photography */}
      <div
        className={`absolute inset-0 transition-colors duration-300 ${
          isDark ? 'bg-[#0B1120]/78' : 'bg-[#FAFBFC]/80'
        }`}
      />
    </div>
  );
}
