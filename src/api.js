import { isoToJalaliString, jalaliToIso, parseJalaliDate } from './domain/expenses.js';

const API_PREFIX = '/api';

function readCookie(name) {
  const prefix = `${name}=`;
  return document.cookie.split('; ').find((cookie) => cookie.startsWith(prefix))?.slice(prefix.length) || '';
}

async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (['POST', 'PATCH', 'DELETE'].includes((options.method || 'GET').toUpperCase())) {
    const csrf = readCookie('kharj_csrf');
    if (csrf) headers.set('X-CSRF-Token', csrf);
  }
  const response = await fetch(`${API_PREFIX}${path}`, { ...options, headers, credentials: 'include' });
  if (response.status === 204) return null;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.detail || 'ارتباط با سرور موفق نبود.');
  return payload;
}

export async function apiMe() {
  return apiRequest('/auth/me');
}

export async function apiLogin(username, password) {
  const response = await apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
  return response.user;
}

export async function apiLogout() {
  return apiRequest('/auth/logout', { method: 'POST' });
}

export async function apiListExpenses({ month, person, category, query }) {
  const params = new URLSearchParams({ month });
  if (person && person !== 'all') params.set('person', person);
  if (category && category !== 'all') params.set('category', category);
  if (query) params.set('q', query);
  return apiRequest(`/expenses?${params.toString()}`);
}

export async function apiSummary({ month, person, category, query }) {
  const params = new URLSearchParams({ month });
  if (person && person !== 'all') params.set('person', person);
  if (category && category !== 'all') params.set('category', category);
  if (query) params.set('q', query);
  return apiRequest(`/summary?${params.toString()}`);
}

export async function apiCreateExpense(form) {
  return apiRequest('/expenses', { method: 'POST', body: JSON.stringify(form) });
}

export async function apiUpdateExpense(id, form) {
  return apiRequest(`/expenses/${id}`, { method: 'PATCH', body: JSON.stringify(form) });
}

export async function apiDeleteExpense(id) {
  return apiRequest(`/expenses/${id}`, { method: 'DELETE' });
}

export function apiExpenseToLocal(expense) {
  return {
    id: String(expense.id),
    serverId: expense.id,
    amountToman: expense.amount_toman,
    person: expense.person,
    category: expense.category,
    date: jalaliToIso(parseJalaliDate(expense.jalali_date)),
    note: expense.note || '',
    createdAt: expense.created_at,
    updatedAt: expense.updated_at,
  };
}

export function productionPayload(form) {
  return {
    amount_thousands: Math.round(form.amountToman / 1000),
    person: form.person,
    category: form.category,
    jalali_date: isoToJalaliString(form.date),
    note: form.note || '',
  };
}

export const isProductionHost = () => window.location.hostname === 'kharjnegar.raminakhavan.ir';
