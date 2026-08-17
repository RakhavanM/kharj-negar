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

export async function apiChangePassword(currentPassword, newPassword) {
  return apiRequest('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
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

export async function apiListSavingsAssets() {
  return apiRequest('/savings/assets');
}

export async function apiCreateSavingsAsset(payload) {
  return apiRequest('/savings/assets', { method: 'POST', body: JSON.stringify(payload) });
}

export async function apiUpdateSavingsAsset(id, payload) {
  return apiRequest(`/savings/assets/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export async function apiDeleteSavingsAsset(id) {
  return apiRequest(`/savings/assets/${id}`, { method: 'DELETE' });
}

export function apiSavingsAssetToLocal(asset) {
  return {
    ...asset,
    id: String(asset.id),
    serverId: asset.id,
    assetType: asset.asset_type,
    asOfJalaliDate: asset.as_of_jalali_date,
    quantity: String(asset.quantity),
  };
}

export function savingsProductionPayload(form) {
  return {
    asset_type: form.assetType,
    symbol: form.symbol,
    title: form.title,
    quantity: form.quantity,
    unit: form.unit,
    owner: form.owner,
    as_of_jalali_date: form.asOfJalaliDate,
    note: form.note || '',
  };
}

export async function apiDownloadExport() {
  const response = await fetch(`${API_PREFIX}/export/xlsx`, { credentials: 'include' });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.detail || 'دانلود فایل خروجی انجام نشد.');
  }
  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition') || '';
  const filename = disposition.match(/filename="([^"]+)"/)?.[1] || `kharj-negar-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
  return { blob, filename };
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