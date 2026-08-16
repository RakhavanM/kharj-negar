import { describe, expect, it } from 'vitest';
import {
  getJalaliCalendarWeeks,
  getJalaliMonthLabel,
  getMonthSummary,
  PEOPLE,
} from './expenses.js';

describe('calendar and summary regression expectations', () => {
  it('renders every day of a Jalali month in a seven-column grid', () => {
    const weeks = getJalaliCalendarWeeks(1404, 1);
    const days = weeks.flat().filter(Boolean);
    expect(days).toHaveLength(31);
    expect(weeks).toHaveLength(6);
  });

  it('has a stable Persian month label for calendar navigation', () => {
    expect(getJalaliMonthLabel({ jy: 1404, jm: 12 })).toBe('اسفند ۱۴۰۴');
  });

  it('represents the updated dashboard summary after adding an expense', () => {
    const summary = getMonthSummary([], '1404-01');
    const nextSummary = getMonthSummary([
      {
        id: 'server-1',
        amountToman: 500_000,
        person: PEOPLE.ramin,
        category: 'daily',
        date: '2025-03-21',
        note: 'ثبت فوری',
      },
    ], '1404-01');
    expect(summary.total).toBe(0);
    expect(nextSummary.total).toBe(500_000);
    expect(nextSummary.byPerson.ramin).toBe(500_000);
  });
});
