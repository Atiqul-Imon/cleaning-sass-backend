import { format } from 'date-fns';

/**
 * British date format: dd/MM/yy (e.g. 02/04/26)
 */
export const DATE_FORMAT = 'dd/MM/yy';

/**
 * Format with weekday: EEEE, dd/MM/yy (e.g. Saturday, 02/04/26)
 */
export const DATE_WITH_WEEKDAY = 'EEEE, dd/MM/yy';

/**
 * Format a date for display using British dd/MM/yy format
 */
export function formatDate(date: Date | string, withWeekday = false): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, withWeekday ? DATE_WITH_WEEKDAY : DATE_FORMAT);
}
