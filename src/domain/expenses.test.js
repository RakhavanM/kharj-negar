import { describe, expect, it } from 'vitest';
import {
  CATEGORIES,
  PEOPLE,
  amountInputToToman,
  filterExpenses,
  formatToman,
  getJalaliCalendarWeeks,
  getJalaliMonthLabel,
  getMonthKey,
  getMonthSummary,
  normalizeDigits,
  parseJalaliDate,
  shiftJalaliMonth,
  toJalali,
} from './expenses.js';

describe('expense amount rules', () => {
  it('accepts Persian and English digits and treats input as thousand tomans', () => {
    expect(amountInputToToman('500')).toBe(500_000);
    expect(amountInputToToman('۱۰۰۰')).toBe(1_000_000);
    expect(amountInputToToman('1,245')).toBe(1_245_000);
  });

  it('rejects empty, decimal, zero, and negative values', () => {
    expect(() => amountInputToToman('')).toThrow();
    expect(() => amountInputToToman('0')).toThrow();
    expect(() => amountInputToToman('-10')).toThrow();
    expect(() => amountInputToToman('12.5')).toThrow();
  });

  it('formats money consistently with تومان', () => {
    expect(formatToman(1_245_000)).toBe('1,245,000 تومان');
    expect(normalizeDigits('۱۲۳')).toBe('123');
  });
});

describe('Jalali date helpers', () => {
  it('converts a known Gregorian date to Jalali', () => {
    expect(toJalali(new Date(2025, 2, 21))).toEqual({ jy: 1404, jm: 1, jd: 1 });
  });

  it('parses a valid Jalali date and rejects invalid dates', () => {
    expect(parseJalaliDate('1404/01/01')).toEqual({ jy: 1404, jm: 1, jd: 1 });
    expect(() => parseJalaliDate('1404/13/01')).toThrow();
    expect(() => parseJalaliDate('1404/01/32')).toThrow();
  });

  it('builds a complete calendar with Saturday as the first column', () => {
    const weeks = getJalaliCalendarWeeks(1404, 1);
    const days = weeks.flat().filter(Boolean);
    expect(days[0]).toEqual({ jy: 1404, jm: 1, jd: 1 });
    expect(days.at(-1)).toEqual({ jy: 1404, jm: 1, jd: 31 });
    expect(weeks.length).toBeGreaterThanOrEqual(5);
    expect(weeks.every((week) => week.length === 7)).toBe(true);
  });

  it('shifts calendar months and years correctly', () => {
    expect(shiftJalaliMonth({ jy: 1404, jm: 1 }, -1)).toEqual({ jy: 1403, jm: 12 });
    expect(shiftJalaliMonth({ jy: 1404, jm: 12 }, 1)).toEqual({ jy: 1405, jm: 1 });
    expect(getJalaliMonthLabel({ jy: 1404, jm: 1 })).toBe('فروردین ۱۴۰۴');
  });
});

describe('expense summaries and filters', () => {
  const expenses = [
    { id: '1', amountToman: 500_000, person: PEOPLE.ramin, category: CATEGORIES.daily, date: '2025-03-21', note: 'صبحانه' },
    { id: '2', amountToman: 1_000_000, person: PEOPLE.mana, category: CATEGORIES.pet, date: '2025-03-22', note: 'غذا' },
    { id: '3', amountToman: 250_000, person: PEOPLE.ramin, category: CATEGORIES.pet, date: '2025-04-01', note: 'دامپزشکی' },
  ];

  it('creates a stable month key from a Gregorian date', () => {
    expect(getMonthKey('2025-03-21')).toBe('1404-01');
  });

  it('filters by person, category, and month together', () => {
    const filtered = filterExpenses(expenses, { month: '1404-01', person: PEOPLE.mana, category: CATEGORIES.pet });
    expect(filtered.map((expense) => expense.id)).toEqual(['2']);
  });

  it('calculates total and person/category breakdowns', () => {
    const summary = getMonthSummary(expenses, '1404-01');
    expect(summary.total).toBe(1_750_000);
    expect(summary.byPerson[PEOPLE.ramin]).toBe(750_000);
    expect(summary.byPerson[PEOPLE.mana]).toBe(1_000_000);
    expect(summary.byCategory[CATEGORIES.pet]).toBe(1_250_000);
  });

  it('includes household-defined categories in the local summary', () => {
    const custom = { id: '4', amountToman: 300_000, person: PEOPLE.ramin, category: 'hobby', date: '2025-03-23', note: 'کتاب' };
    const summary = getMonthSummary([...expenses, custom], '1404-01', {}, [...Object.values(CATEGORIES), 'hobby']);
    expect(summary.byCategory.hobby).toBe(300_000);
  });

  it('keeps a legacy category in the breakdown when it is omitted from the active catalog', () => {
    const summary = getMonthSummary(expenses, '1404-01', {}, [CATEGORIES.daily]);
    expect(summary.byCategory[CATEGORIES.pet]).toBe(1_250_000);
  });
});

it('exports the supported people and categories', () => {
  expect(Object.values(PEOPLE)).toEqual(['ramin', 'mana']);
  expect(Object.values(CATEGORIES)).toHaveLength(8);
});

it('round-trips the first day of the Persian year', async () => {
  const { jalaliToIso, isoToJalaliString } = await import('./expenses.js');
  expect(isoToJalaliString(jalaliToIso('1404/01/01'))).toBe('1404/01/01');
});
