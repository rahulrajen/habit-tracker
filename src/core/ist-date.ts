// ============================================================================
// IST Date Helper — UTC+5:30 conversion
// Single source of truth for "today" in Indian Standard Time
// ============================================================================

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in milliseconds

/**
 * Returns the current date/time in IST as a JavaScript Date object.
 * Used anywhere "today" needs computing regardless of server timezone.
 */
export function nowInIST(): Date {
  const utcNow = new Date();
  return new Date(utcNow.getTime() + IST_OFFSET_MS);
}

/**
 * Returns the current calendar date in IST (year, month, day only).
 * Useful for generating "completed_date" values stored in habit_completions.
 */
export function getISTDate(date?: Date): string {
  const d = date ?? nowInIST();
  return d.toISOString().split('T')[0]; // YYYY-MM-DD in IST
}

/**
 * Converts a UTC Date to an IST date string (YYYY-MM-DD).
 * Accepts explicit UTC dates for boundary testing.
 */
export function utcToISTDate(utcDate: Date): string {
  const ist = new Date(utcDate.getTime() + IST_OFFSET_MS);
  return ist.toISOString().split('T')[0];
}

/**
 * Returns today's date in IST as a native JS Date at midnight (00:00:00).
 * Useful for DB queries filtering by date range.
 */
export function getISTMidnight(): Date {
  const now = nowInIST();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Converts an IST date string (YYYY-MM-DD) to a UTC Date at start of that day.
 * Useful when storing/comparing completed_date values in the database.
 */
export function istDateToUTC(dateStr: string): Date {
  const d = new Date(dateStr + 'T00:00:00+05:30');
  return d;
}

/**
 * Check if a UTC timestamp falls within today in IST.
 */
export function isTodayInIST(utcTimestamp: Date): boolean {
  const istDate = getISTDate();
  const checkDate = utcToISTDate(utcTimestamp);
  return istDate === checkDate;
}

// ============================================================================
// Constants for testing boundary conditions
// ============================================================================

/** IST offset as hours/minutes for reference */
export const IST_OFFSET = { hours: 5, minutes: 30 };