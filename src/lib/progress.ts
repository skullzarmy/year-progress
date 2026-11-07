export interface YearProgress {
  year: number;
  /** 0–100 */
  percentage: number;
  daysRemaining: number;
}

const DAY_MS = 1000 * 60 * 60 * 24;

/** Calculate how far through the calendar year `now` is (local time). */
export function calculateProgress(now: Date = new Date()): YearProgress {
  const year = now.getFullYear();
  const start = new Date(year, 0, 1).getTime();
  const end = new Date(year + 1, 0, 1).getTime();
  return {
    year,
    percentage: ((now.getTime() - start) / (end - start)) * 100,
    daysRemaining: Math.ceil((end - now.getTime()) / DAY_MS),
  };
}
