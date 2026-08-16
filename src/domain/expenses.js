export const PEOPLE = Object.freeze({ ramin: 'ramin', mana: 'mana' });

export const PERSON_LABELS = Object.freeze({
  [PEOPLE.ramin]: 'رامین',
  [PEOPLE.mana]: 'مانا',
});

export const CATEGORIES = Object.freeze({
  daily: 'daily',
  installment: 'installment',
  rent: 'rent',
  car: 'car',
  home: 'home',
  debt: 'debt',
  pet: 'pet',
  miscellaneous: 'miscellaneous',
});

export const CATEGORY_LABELS = Object.freeze({
  [CATEGORIES.daily]: 'خرج روزمره',
  [CATEGORIES.installment]: 'قسط',
  [CATEGORIES.rent]: 'اجاره',
  [CATEGORIES.car]: 'ماشین',
  [CATEGORIES.home]: 'وسایل خانه',
  [CATEGORIES.debt]: 'قرض',
  [CATEGORIES.pet]: 'پت',
  [CATEGORIES.miscellaneous]: 'خرج متفرقه',
});

export const CATEGORY_ICONS = Object.freeze({
  [CATEGORIES.daily]: '☼',
  [CATEGORIES.installment]: '↗',
  [CATEGORIES.rent]: '⌂',
  [CATEGORIES.car]: '▱',
  [CATEGORIES.home]: '⌂',
  [CATEGORIES.debt]: '↔',
  [CATEGORIES.pet]: '♡',
  [CATEGORIES.miscellaneous]: '···',
});

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
export const JALALI_MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];

export function normalizeDigits(value) {
  return String(value ?? '')
    .replace(/[۰-۹]/g, (digit) => String(PERSIAN_DIGITS.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String(ARABIC_DIGITS.indexOf(digit)))
    .replace(/[٬،,\s]/g, '');
}

export function amountInputToToman(value) {
  const normalized = normalizeDigits(value);
  if (!/^\d+$/.test(normalized) || Number(normalized) <= 0) {
    throw new Error('مبلغ باید یک عدد صحیح بزرگ‌تر از صفر باشد.');
  }
  return Number(normalized) * 1000;
}

export function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(Math.round(Number(value) || 0));
}

export function formatToman(value) {
  return `${formatNumber(value)} تومان`;
}

export function formatInputThousands(value) {
  const normalized = normalizeDigits(value);
  if (!normalized) return '';
  return formatNumber(Number(normalized));
}

function div(a, b) {
  return ~~(a / b);
}

function mod(a, b) {
  return a - div(a, b) * b;
}

function g2d(gy, gm, gd) {
  let d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4)
    + div(153 * mod(gm + 9, 12) + 2, 5) + gd - 34840408;
  d -= div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) - 752;
  return d;
}

function d2g(jdn) {
  let j = 4 * jdn + 139361631;
  j += div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}

function jalaliCalendar(jy) {
  const breaks = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2347, 2380, 2450, 3178];
  if (jy < breaks[0] || jy >= breaks[breaks.length - 1]) throw new Error('سال شمسی خارج از محدوده است.');
  const gy = jy + 621;
  let leapJ = -14;
  let jp = breaks[0];
  let jump = 0;
  let jm = 0;
  for (let index = 1; index < breaks.length; index += 1) {
    jm = breaks[index];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ += div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }
  let n = jy - jp;
  leapJ += div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;
  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
  let leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;
  return { gy, march, leap };
}

function jalaliToDayNumber(jy, jm, jd) {
  const calendar = jalaliCalendar(jy);
  return g2d(calendar.gy, 3, calendar.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
}

function gregorianToJalali(gy, gm, gd) {
  const date = d2g(g2d(gy, gm, gd));
  let jy = date.gy - 621;
  const calendar = jalaliCalendar(jy);
  const firstDay = g2d(date.gy, 3, calendar.march);
  let day = g2d(gy, gm, gd) - firstDay;
  let jm;
  let jd;
  if (day >= 0) {
    if (day <= 185) {
      jm = 1 + div(day, 31);
      jd = mod(day, 31) + 1;
    } else {
      day -= 186;
      jm = 7 + div(day, 30);
      jd = mod(day, 30) + 1;
    }
  } else {
    jy -= 1;
    day += 179;
    if (calendar.leap === 1) day += 1;
    jm = 7 + div(day, 30);
    jd = mod(day, 30) + 1;
  }
  return { jy, jm, jd };
}

export function toJalali(dateInput) {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(date.getTime())) throw new Error('تاریخ نامعتبر است.');
  return gregorianToJalali(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

export function jalaliMonthLength(jy, jm) {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return jalaliCalendar(jy).leap === 0 ? 30 : 29;
}

export function parseJalaliDate(value) {
  const match = normalizeDigits(value).match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (!match) throw new Error('تاریخ را به شکل ۱۴۰۴/۰۱/۰۱ وارد کنید.');
  const jy = Number(match[1]);
  const jm = Number(match[2]);
  const jd = Number(match[3]);
  if (jy < 1200 || jy > 1600 || jm < 1 || jm > 12 || jd < 1 || jd > jalaliMonthLength(jy, jm)) {
    throw new Error('تاریخ شمسی واردشده معتبر نیست.');
  }
  return { jy, jm, jd };
}

export function jalaliToGregorian({ jy, jm, jd }) {
  return d2g(jalaliToDayNumber(jy, jm, jd));
}

export function jalaliToIso(value) {
  const { gy, gm, gd } = jalaliToGregorian(typeof value === 'string' ? parseJalaliDate(value) : value);
  return `${String(gy).padStart(4, '0')}-${String(gm).padStart(2, '0')}-${String(gd).padStart(2, '0')}`;
}

export function isoToJalaliString(isoDate) {
  const { jy, jm, jd } = toJalali(`${isoDate}T12:00:00`);
  return `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`;
}

export function getTodayJalaliString(now = new Date()) {
  return isoToJalaliString(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`);
}

export function toPersianDigits(value) {
  const digits = '۰۱۲۳۴۵۶۷۸۹';
  return String(value).replace(/\d/g, (digit) => digits[Number(digit)]);
}

export function shiftJalaliMonth({ jy, jm }, offset) {
  const absoluteMonth = jy * 12 + (jm - 1) + offset;
  const nextYear = Math.floor(absoluteMonth / 12);
  const nextMonth = ((absoluteMonth % 12) + 12) % 12 + 1;
  return { jy: nextYear, jm: nextMonth };
}

export function getJalaliMonthLabel({ jy, jm }) {
  return `${JALALI_MONTHS[jm - 1]} ${toPersianDigits(jy)}`;
}

export function getJalaliCalendarWeeks(jy, jm) {
  const firstGregorian = jalaliToGregorian({ jy, jm, jd: 1 });
  const firstWeekdayFromSaturday = (new Date(Date.UTC(firstGregorian.gy, firstGregorian.gm - 1, firstGregorian.gd)).getUTCDay() + 1) % 7;
  const daysInMonth = jalaliMonthLength(jy, jm);
  const cells = Array(firstWeekdayFromSaturday).fill(null);
  for (let jd = 1; jd <= daysInMonth; jd += 1) cells.push({ jy, jm, jd });
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = [];
  for (let index = 0; index < cells.length; index += 7) weeks.push(cells.slice(index, index + 7));
  return weeks;
}

export function getMonthKey(isoDate) {
  const { jy, jm } = toJalali(`${isoDate}T12:00:00`);
  return `${jy}-${String(jm).padStart(2, '0')}`;
}

export function getMonthLabel(monthKey) {
  const [jy, jm] = monthKey.split('-').map(Number);
  return `${JALALI_MONTHS[jm - 1]} ${jy}`;
}

export function getMonthOptions(centerMonthKey, count = 7) {
  const [centerYear, centerMonth] = centerMonthKey.split('-').map(Number);
  const options = [];
  for (let offset = -(count - 1); offset <= 1; offset += 1) {
    let month = centerMonth + offset;
    let year = centerYear;
    while (month < 1) { month += 12; year -= 1; }
    while (month > 12) { month -= 12; year += 1; }
    options.push({ value: `${year}-${String(month).padStart(2, '0')}`, label: getMonthLabel(`${year}-${String(month).padStart(2, '0')}`) });
  }
  return options;
}

export function filterExpenses(expenses, filters = {}) {
  return expenses.filter((expense) => {
    if (filters.month && getMonthKey(expense.date) !== filters.month) return false;
    if (filters.person && filters.person !== 'all' && expense.person !== filters.person) return false;
    if (filters.category && filters.category !== 'all' && expense.category !== filters.category) return false;
    if (filters.query && !expense.note.toLowerCase().includes(filters.query.toLowerCase())) return false;
    return true;
  });
}

export function getMonthSummary(expenses, monthKey, filters = {}) {
  const inMonth = filterExpenses(expenses, { month: monthKey, ...filters });
  const byPerson = { [PEOPLE.ramin]: 0, [PEOPLE.mana]: 0 };
  const byCategory = Object.fromEntries(Object.values(CATEGORIES).map((category) => [category, 0]));
  inMonth.forEach((expense) => {
    byPerson[expense.person] += expense.amountToman;
    byCategory[expense.category] += expense.amountToman;
  });
  return { total: inMonth.reduce((sum, expense) => sum + expense.amountToman, 0), count: inMonth.length, byPerson, byCategory };
}

export function getCategoryPercentage(amount, total) {
  return total ? Math.round((amount / total) * 100) : 0;
}

export function sortExpenses(expenses) {
  return [...expenses].sort((a, b) => `${b.date}${b.createdAt || ''}`.localeCompare(`${a.date}${a.createdAt || ''}`));
}
