import type { PatientCondition } from '../lib/clinical';

const CONDITION_STYLES: Record<PatientCondition, string> = {
  Stable: 'bg-emerald-50 dark:bg-emerald-950/60 text-[#059669] dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/80',
  Critical: 'bg-red-50 dark:bg-red-950/60 text-[#DC2626] dark:text-red-400 border-red-200 dark:border-red-800/80',
  'Under Observation': 'bg-amber-50 dark:bg-amber-950/60 text-[#D97706] dark:text-amber-400 border-amber-200 dark:border-amber-800/80',
  Discharged: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700',
};

export function ConditionBadge({ condition }: { condition: PatientCondition }) {
  const style = CONDITION_STYLES[condition] ?? CONDITION_STYLES.Discharged;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border whitespace-nowrap ${style}`}
    >
      {condition}
    </span>
  );
}
