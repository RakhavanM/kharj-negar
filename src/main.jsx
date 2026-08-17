import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/vazirmatn/400.css';
import '@fontsource/vazirmatn/500.css';
import '@fontsource/vazirmatn/600.css';
import '@fontsource/vazirmatn/700.css';
import './styles.css';

const DOWNLOAD_CONFIRMATION_LABEL = 'دانلود خروجی Excel';
const BRAND_LOGO_PATH = `${import.meta.env.BASE_URL}logo.png`;
import { applyTheme, getEffectiveTheme, getSystemTheme, nextTheme, readThemePreference, saveThemePreference, THEME_STORAGE_KEY } from './theme.js';
import {
  apiChangePassword,
  apiCreateExpense,
  apiDownloadExport,
  apiDeleteExpense,
  apiExpenseToLocal,
  apiListExpenses,
  apiListSavingsAssets,
  apiCreateSavingsAsset,
  apiUpdateSavingsAsset,
  apiDeleteSavingsAsset,
  apiSavingsAssetToLocal,
  savingsProductionPayload,
  apiLogin,
  apiLogout,
  apiMe,
  apiSummary,
  apiUpdateExpense,
  isProductionHost,
  productionPayload,
} from './api.js';
import {
  SAVINGS_ASSET_ICONS,
  SAVINGS_ASSET_TYPES,
  SAVINGS_ASSET_TYPE_LABELS,
  SAVINGS_OWNER_LABELS,
  getSavingsAssetDefinition,
  getSavingsAssetOptions,
  SAVINGS_OWNERS,
  formatSavingsQuantity,
  validateSavingsQuantity,
} from './domain/savings.js';
import {
  CATEGORIES,
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  JALALI_MONTHS,
  PEOPLE,
  PERSON_LABELS,
  amountInputToToman,
  filterExpenses,
  formatInputThousands,
  formatNumber,
  formatToman,
  getCategoryPercentage,
  getJalaliCalendarWeeks,
  getJalaliMonthLabel,
  getMonthKey,
  getMonthLabel,
  getMonthOptions,
  getMonthSummary,
  getTodayJalaliString,
  isoToJalaliString,
  jalaliToIso,
  normalizeDigits,
  parseJalaliDate,
  shiftJalaliMonth,
  sortExpenses,
  toPersianDigits,
} from './domain/expenses.js';

const STORAGE_KEY = 'kharj-negar-expenses-v1';
const SESSION_KEY = 'kharj-negar-session-v1';
const SAVINGS_KEY = 'kharj-negar-savings-v1';
const DEMO_EXPENSES = [];
const DEMO_SAVINGS = [
  { id: 'saving-demo-1', assetType: SAVINGS_ASSET_TYPES.crypto, symbol: 'USDT', title: 'تتر', quantity: '100', unit: 'USDT', owner: SAVINGS_OWNERS.shared, asOfJalaliDate: '1405/05/26', note: '' },
  { id: 'saving-demo-2', assetType: SAVINGS_ASSET_TYPES.crypto, symbol: 'BTC', title: 'بیت‌کوین', quantity: '0.5', unit: 'BTC', owner: SAVINGS_OWNERS.ramin, asOfJalaliDate: '1405/05/26', note: '' },
  { id: 'saving-demo-3', assetType: SAVINGS_ASSET_TYPES.cash, symbol: 'TOMAN', title: 'تومان', quantity: '100000000', unit: 'تومان', owner: SAVINGS_OWNERS.shared, asOfJalaliDate: '1405/05/26', note: '' },
  { id: 'saving-demo-4', assetType: SAVINGS_ASSET_TYPES.gold, symbol: 'GRAM', title: 'گرم', quantity: '3', unit: 'گرم', owner: SAVINGS_OWNERS.mana, asOfJalaliDate: '1405/05/26', note: '' },
];
const PREVIEW_EXPENSES = [
  { id: 'preview-1', amountToman: 420_000, person: PEOPLE.ramin, category: CATEGORIES.daily, date: '2025-03-21', note: 'خرید روزمره', createdAt: '2025-03-24T10:30:00.000Z' },
  { id: 'preview-2', amountToman: 1_200_000, person: PEOPLE.mana, category: CATEGORIES.pet, date: '2025-03-22', note: 'غذای پت', createdAt: '2025-03-23T15:10:00.000Z' },
  { id: 'preview-3', amountToman: 680_000, person: PEOPLE.ramin, category: CATEGORIES.car, date: '2025-03-20', note: 'سوخت و پارکینگ', createdAt: '2025-03-20T09:00:00.000Z' },
  { id: 'preview-4', amountToman: 2_000_000, person: PEOPLE.mana, category: CATEGORIES.home, date: '2025-03-18', note: 'وسایل خانه', createdAt: '2025-03-18T11:45:00.000Z' },
  { id: 'preview-5', amountToman: 750_000, person: PEOPLE.ramin, category: CATEGORIES.daily, date: '2025-03-14', note: 'غذای بیرون', createdAt: '2025-03-14T20:20:00.000Z' },
];

function ThemeToggle({ theme, onToggle }) {
  const dark = theme === 'dark';
  return <button className="theme-toggle" type="button" onClick={onToggle} aria-label={dark ? 'فعال کردن حالت روشن' : 'فعال کردن حالت تاریک'} title={dark ? 'حالت روشن' : 'حالت تاریک'} aria-pressed={dark}><Icon name={dark ? 'sun' : 'moon'} size={16} /></button>;
}

function readStorage(key, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function usePersistentState(key, initialValue) {
  const [value, setValue] = useState(() => readStorage(key, initialValue));
  const update = (next) => {
    setValue((current) => {
      const resolved = typeof next === 'function' ? next(current) : next;
      try { window.localStorage.setItem(key, JSON.stringify(resolved)); } catch { /* unavailable storage */ }
      return resolved;
    });
  };
  return [value, update];
}

function Icon({ name, size = 20 }) {
  const paths = {
    plus: <><path d="M12 5v14M5 12h14" /></>,
    calendar: <><rect x="3" y="4.5" width="18" height="16" rx="2" /><path d="M16 2.5v4M8 2.5v4M3 9h18" /></>,
    filter: <><path d="M4 5h16M7 12h10M10 19h4" /></>,
    chart: <><path d="M4 19V5M4 19h17" /><path d="m7 15 3-4 3 2 5-6" /></>,
    list: <><path d="M8 6h12M8 12h12M8 18h12" /><path d="M4 6h.01M4 12h.01M4 18h.01" /></>,
    edit: <><path d="M4 20h4l10.6-10.6a2.1 2.1 0 0 0-3-3L5 17v3Z" /><path d="m14.5 7.5 3 3" /></>,
    trash: <><path d="M4 7h16M10 11v5M14 11v5M6 7l1 13h10l1-13M9 7V4h6v3" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    chevron: <path d="m9 6 6 6-6 6" />,
    search: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></>,
    wallet: <><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H19a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H6.5A2.5 2.5 0 0 1 4 16.5v-9Z" /><path d="M4 8h14a2 2 0 0 1 2 2v1h-4a2 2 0 1 0 0 4h4" /><path d="M16 13h.01" /></>,
    lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
    download: <><path d="M12 3v11M7 10l5 5 5-5" /><path d="M4 20h16" /></>,
    moon: <><path d="M20.5 15.6A8.5 8.5 0 0 1 8.4 3.5 8.5 8.5 0 1 0 20.5 15.6Z" /></>,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
    logout: <><path d="M10 5H5v14h5M14 8l4 4-4 4M18 12H9" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function formatDate(date) {
  try { return isoToJalaliString(date).replaceAll('/', ' / '); } catch { return date; }
}

function getCurrentMonth() {
  return getMonthKey(new Date().toISOString().slice(0, 10));
}

function App() {
  const production = isProductionHost();
  const [themePreference, setThemePreference] = useState(() => readThemePreference());
  const [systemTheme, setSystemTheme] = useState(() => getSystemTheme());
  const theme = getEffectiveTheme(themePreference, systemTheme);
  const [demoSession, setDemoSession] = usePersistentState(SESSION_KEY, null);
  const [serverSession, setServerSession] = useState(null);
  const session = production ? serverSession : demoSession;
  const setSession = production ? setServerSession : setDemoSession;
  const [expenses, setExpenses] = usePersistentState(STORAGE_KEY, DEMO_EXPENSES);
  const [demoSavings, setDemoSavings] = usePersistentState(SAVINGS_KEY, DEMO_SAVINGS);
  const [savingsAssets, setSavingsAssets] = useState([]);
  const [activeSection, setActiveSection] = useState('expenses');
  const [activeView, setActiveView] = useState('dashboard');
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [filters, setFilters] = useState({ person: 'all', category: 'all', query: '' });
  const [isFormOpen, setFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [toast, setToast] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [loading, setLoading] = useState(production);
  const [serverData, setServerData] = useState({ expenses: [], summary: null });
  const [serverError, setServerError] = useState('');
  const [refreshingSummary, setRefreshingSummary] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [downloadConfirmationOpen, setDownloadConfirmationOpen] = useState(false);
  const [savingsLoading, setSavingsLoading] = useState(false);
  const [savingsModalOpen, setSavingsModalOpen] = useState(false);
  const [editingSavingsAsset, setEditingSavingsAsset] = useState(null);
  const [savingsError, setSavingsError] = useState('');

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onSystemThemeChange = (event) => setSystemTheme(event.matches ? 'dark' : 'light');
    media.addEventListener?.('change', onSystemThemeChange);
    return () => media.removeEventListener?.('change', onSystemThemeChange);
  }, []);

  const toggleTheme = () => {
    const next = nextTheme(theme);
    saveThemePreference(next);
    setThemePreference(next);
  };

  const notify = (message, type = 'success') => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 2800);
  };

  const reloadServerData = useCallback(async (month, activeFilters) => {
    const [list, nextSummary] = await Promise.all([
      apiListExpenses({ month, ...activeFilters }),
      apiSummary({ month, ...activeFilters }),
    ]);
    setServerData({ expenses: list.items.map(apiExpenseToLocal), summary: nextSummary });
    setServerError('');
  }, []);

  useEffect(() => {
    if (!production) return;
    let active = true;
    apiMe()
      .then((response) => {
        if (!active) return;
        if (response.authenticated) setSession(response.user);
        else setSession(null);
      })
      .catch(() => active && setServerError('ارتباط با سرور برقرار نشد.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [production]);

  useEffect(() => {
    if (!production || !session) return;
    let active = true;
    setLoading(true);
    reloadServerData(selectedMonth, filters)
      .catch((error) => active && setServerError(error.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [production, session, selectedMonth, filters, reloadServerData]);

  const reloadSavings = useCallback(async () => {
    if (!production || !session) return;
    setSavingsLoading(true);
    try {
      const response = await apiListSavingsAssets();
      setSavingsAssets(response.items.map(apiSavingsAssetToLocal));
      setSavingsError('');
    } catch (error) {
      setSavingsError(error.message);
    } finally {
      setSavingsLoading(false);
    }
  }, [production, session]);

  useEffect(() => {
    if (activeSection === 'savings') reloadSavings();
  }, [activeSection, reloadSavings]);

  const visibleExpenses = previewMode ? PREVIEW_EXPENSES : expenses;
  const localFilteredExpenses = useMemo(() => sortExpenses(filterExpenses(visibleExpenses, { month: selectedMonth, ...filters })), [visibleExpenses, selectedMonth, filters]);
  const localSummary = useMemo(() => getMonthSummary(visibleExpenses, selectedMonth, filters), [visibleExpenses, selectedMonth, filters]);
  const filteredExpenses = production ? serverData.expenses : localFilteredExpenses;
  const summary = production
    ? (serverData.summary ? {
      total: serverData.summary.total_toman,
      count: serverData.summary.count,
      byPerson: serverData.summary.by_person,
      byCategory: serverData.summary.by_category,
      comparison: serverData.summary.comparison,
    } : { total: 0, count: 0, byPerson: { ramin: 0, mana: 0 }, byCategory: Object.fromEntries(Object.values(CATEGORIES).map((category) => [category, 0])), comparison: null })
    : (previewMode ? { ...localSummary, comparison: { available: true, direction: 'less', percent: 30 } } : localSummary);

  if (loading && production && !session) return <LoadingScreen />;
  if (!session) return <LoginScreen production={production} onLogin={async (username, password) => {
    if (!production) { setSession({ person: username, loggedAt: Date.now() }); return; }
    const user = await apiLogin(username, password);
    setSession(user);
    setServerError('');
  }} />;

  const monthOptions = getMonthOptions(selectedMonth);
  const selectedMonthParts = selectedMonth.split('-').map(Number);
  const monthPickerOptions = Array.from({ length: 12 }, (_, index) => ({
    value: `${selectedMonthParts[0]}-${String(index + 1).padStart(2, '0')}`,
    label: getMonthLabel(`${selectedMonthParts[0]}-${String(index + 1).padStart(2, '0')}`),
  }));
  const openAdd = () => { setEditingExpense(null); setFormOpen(true); };
  const openEdit = (expense) => { setEditingExpense(expense); setFormOpen(true); };

  const saveExpense = (form) => {
    if (production) {
      const request = editingExpense ? apiUpdateExpense(editingExpense.serverId || editingExpense.id, productionPayload(form)) : apiCreateExpense(productionPayload(form));
      request.then(() => {
        setFormOpen(false);
        setEditingExpense(null);
        const targetMonth = getMonthKey(form.date);
        setSelectedMonth(targetMonth);
        setRefreshingSummary(true);
        if (targetMonth !== selectedMonth) return null;
        return reloadServerData(targetMonth, filters);
      }).then(() => notify(editingExpense ? 'هزینه ویرایش شد.' : 'هزینه ثبت شد.'))
        .catch((error) => notify(error.message, 'info'))
        .finally(() => setRefreshingSummary(false));
      return;
    }
    if (editingExpense) {
      setExpenses((current) => current.map((expense) => expense.id === editingExpense.id ? { ...editingExpense, ...form } : expense));
      notify('هزینه ویرایش شد.');
    } else {
      setExpenses((current) => [{ ...form, id: crypto.randomUUID(), createdAt: new Date().toISOString() }, ...current]);
      notify('هزینه ثبت شد.');
    }
    setFormOpen(false);
    setEditingExpense(null);
    setSelectedMonth(getMonthKey(form.date));
  };

  const downloadExport = async () => {
    if (!production || exporting) return;
    setDownloadConfirmationOpen(false);
    setExporting(true);
    try {
      const { blob, filename } = await apiDownloadExport();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      notify('فایل Excel آماده شد.');
    } catch (error) {
      notify(error.message, 'info');
    } finally {
      setExporting(false);
    }
  };

  const deleteExpense = (expense) => {
    if (!window.confirm('این هزینه حذف شود؟')) return;
    if (production) {
      apiDeleteExpense(expense.serverId || expense.id)
        .then(() => { setRefreshingSummary(true); return reloadServerData(selectedMonth, filters); })
        .then(() => notify('هزینه حذف شد.', 'info'))
        .catch((error) => notify(error.message, 'info'))
        .finally(() => setRefreshingSummary(false));
      return;
    }
    setExpenses((current) => current.filter((item) => item.id !== expense.id));
    notify('هزینه حذف شد.', 'info');
  };

  const openSavingsAdd = () => { setEditingSavingsAsset(null); setSavingsError(''); setSavingsModalOpen(true); };
  const openSavingsEdit = (asset) => { setEditingSavingsAsset(asset); setSavingsError(''); setSavingsModalOpen(true); };
  const saveSavingsAsset = (form) => {
    if (production) {
      const request = editingSavingsAsset
        ? apiUpdateSavingsAsset(editingSavingsAsset.serverId || editingSavingsAsset.id, savingsProductionPayload(form))
        : apiCreateSavingsAsset(savingsProductionPayload(form));
      request.then(() => reloadSavings()).then(() => {
        setSavingsModalOpen(false);
        setEditingSavingsAsset(null);
        notify(editingSavingsAsset ? 'دارایی ویرایش شد.' : 'دارایی ثبت شد.');
      }).catch((error) => setSavingsError(error.message));
      return;
    }
    const next = { ...form, id: editingSavingsAsset?.id || crypto.randomUUID() };
    setDemoSavings((current) => editingSavingsAsset ? current.map((asset) => asset.id === editingSavingsAsset.id ? next : asset) : [next, ...current]);
    setSavingsModalOpen(false);
    setEditingSavingsAsset(null);
    notify(editingSavingsAsset ? 'دارایی ویرایش شد.' : 'دارایی ثبت شد.');
  };
  const deleteSavingsAsset = (asset) => {
    if (!window.confirm('این دارایی حذف شود؟')) return;
    if (production) {
      apiDeleteSavingsAsset(asset.serverId || asset.id).then(() => reloadSavings()).then(() => notify('دارایی حذف شد.', 'info')).catch((error) => setSavingsError(error.message));
      return;
    }
    setDemoSavings((current) => current.filter((item) => item.id !== asset.id));
    notify('دارایی حذف شد.', 'info');
  };
  const visibleSavingsAssets = production ? savingsAssets : demoSavings;

  return <div className="app-shell">
    <header className="topbar"><div className="brand-lockup"><div className="brand-mark"><img src={BRAND_LOGO_PATH} alt="" /></div><div><strong>خرج‌نگار</strong><small>هزینه‌های خونه</small></div></div><div className="topbar-actions"><ThemeToggle theme={theme} onToggle={toggleTheme} />{production && <button className="download-button" type="button" onClick={() => setDownloadConfirmationOpen(true)} disabled={exporting} title={DOWNLOAD_CONFIRMATION_LABEL} aria-label={DOWNLOAD_CONFIRMATION_LABEL}><Icon name="download" size={16} /></button>}<button className="profile-button" type="button" onClick={() => setPasswordModalOpen(true)} title="تغییر رمز عبور"><span>{PERSON_LABELS[session.person][0]}</span><Icon name="lock" size={17} /></button><button className="logout-button" onClick={async () => { if (production) await apiLogout(); setSession(null); }} title="خروج از حساب"><Icon name="logout" size={17} /></button></div></header>
    <nav className="top-level-tabs" role="tablist" aria-label="بخش‌های اصلی"><button role="tab" aria-selected={activeSection === 'expenses'} className={activeSection === 'expenses' ? 'active' : ''} onClick={() => setActiveSection('expenses')}>هزینه‌ها</button><button role="tab" aria-selected={activeSection === 'savings'} className={activeSection === 'savings' ? 'active' : ''} onClick={() => setActiveSection('savings')}>پس‌انداز</button></nav>
    {activeSection === 'expenses' ? <main className="page-content">
      <section className="welcome-row"><div><p className="eyebrow">داشبورد مشترک</p><h1>سلام {PERSON_LABELS[session.person]} <span aria-hidden="true">!</span></h1><p className="muted">هزینه‌ها را ثبت کنید تا تصویر روشن‌تری از خرج‌های خانه داشته باشید.</p></div><button className="primary-button desktop-add" onClick={openAdd}><Icon name="plus" size={20} />ثبت هزینه جدید</button></section>
      <div className="prototype-note"><Icon name="lock" size={17} /><span>{production ? 'داده‌ها به‌صورت امن روی سرور مشترک ذخیره می‌شوند.' : 'این نسخه برای بررسی محصول روی GitHub Pages است؛ داده‌ها فعلاً فقط در همین مرورگر ذخیره می‌شوند.'}</span>{!production && <button onClick={() => setPreviewMode((mode) => !mode)}>{previewMode ? 'داده‌های من' : 'نمایش نمونه'}</button>}</div>
      {serverError && production && <div className="prototype-note server-error"><Icon name="close" size={17} /><span>{serverError}</span></div>}
      <><section className="month-toolbar"><div className="month-picker-wrap"><button className={`month-selector ${monthPickerOpen ? 'open' : ''}`} type="button" aria-haspopup="listbox" aria-expanded={monthPickerOpen} aria-label="انتخاب ماه گزارش" onClick={() => setMonthPickerOpen((open) => !open)}><Icon name="calendar" size={18} /><span className="month-selector-copy"><small>ماه گزارش</small><strong>{getMonthLabel(selectedMonth)}</strong></span><Icon name="chevron" size={17} /></button>{monthPickerOpen && <MonthPicker selectedMonth={selectedMonth} year={selectedMonthParts[0]} options={monthPickerOptions} onSelect={(value, meta = {}) => { setSelectedMonth(value); if (!meta.keepOpen) setMonthPickerOpen(false); }} onClose={() => setMonthPickerOpen(false)} />}</div><div className="toolbar-actions"><button className={`filter-button ${Object.values(filters).some((value) => value !== 'all' && value !== '') ? 'has-filter' : ''}`} onClick={() => setShowFilters((open) => !open)}><Icon name="filter" size={18} />فیلترها</button><button className="mobile-add" aria-label="ثبت هزینه جدید" onClick={openAdd}><Icon name="plus" size={22} /></button></div></section>{showFilters && <FilterPanel filters={filters} setFilters={setFilters} onClose={() => setShowFilters(false)} />}<section className="summary-grid" aria-label="خلاصه هزینه‌ها"><div className={`total-card ${refreshingSummary ? 'is-refreshing' : ''}`}><div className="card-kicker"><span className="kicker-dot" />مجموع هزینه‌ها</div><strong>{formatToman(summary.total).replace(' تومان', '')}</strong><span className="card-unit">تومان</span><div className="total-card-foot"><span>{summary.count} هزینه در {getMonthLabel(selectedMonth)}</span><span className="trend">● ثبت‌شده</span></div></div><PersonCard label="رامین" color="blue" amount={summary.byPerson[PEOPLE.ramin]} total={summary.total} /><PersonCard label="مانا" color="green" amount={summary.byPerson[PEOPLE.mana]} total={summary.total} /></section></>
      <div className="section-tabs" role="tablist" aria-label="بخش‌های داشبورد"><button className={activeView === 'dashboard' ? 'active' : ''} onClick={() => setActiveView('dashboard')}>نمای کلی</button><button className={activeView === 'expenses' ? 'active' : ''} onClick={() => setActiveView('expenses')}>همه هزینه‌ها <span>{filteredExpenses.length}</span></button></div>
      {activeView === 'dashboard' ? <Dashboard summary={summary} expenses={filteredExpenses} comparison={summary.comparison} onEdit={openEdit} onDelete={deleteExpense} onShowAll={() => setActiveView('expenses')} /> : activeView === 'expenses' ? <ExpensesList expenses={filteredExpenses} onEdit={openEdit} onDelete={deleteExpense} /> : <SavingsView assets={visibleSavingsAssets} loading={savingsLoading} error={savingsError} onAdd={openSavingsAdd} onEdit={openSavingsEdit} onDelete={deleteSavingsAsset} />}
    </main> : <main className="page-content savings-page-content"><SavingsView assets={visibleSavingsAssets} loading={savingsLoading} error={savingsError} onAdd={openSavingsAdd} onEdit={openSavingsEdit} onDelete={deleteSavingsAsset} /></main>}
    <nav className="bottom-nav" aria-label="ناوبری اصلی"><button className={activeView === 'dashboard' ? 'active' : ''} onClick={() => setActiveView('dashboard')}><Icon name="chart" size={21} /><span>داشبورد</span></button><button onClick={openAdd} className="bottom-add"><span><Icon name="plus" size={24} /></span><label>ثبت هزینه</label></button><button className={activeView === 'expenses' ? 'active' : ''} onClick={() => setActiveView('expenses')}><Icon name="list" size={21} /><span>هزینه‌ها</span></button><button className={activeView === 'savings' ? 'active' : ''} onClick={() => setActiveView('savings')}><Icon name="wallet" size={21} /><span>پس‌اندازها</span></button></nav>
    {isFormOpen && <ExpenseModal expense={editingExpense} onSave={saveExpense} onClose={() => { setFormOpen(false); setEditingExpense(null); }} />}
    {savingsModalOpen && <SavingsModal asset={editingSavingsAsset} error={savingsError} onSave={saveSavingsAsset} onClose={() => { setSavingsModalOpen(false); setEditingSavingsAsset(null); setSavingsError(''); }} />}
    {passwordModalOpen && <PasswordModal production={production} onClose={() => setPasswordModalOpen(false)} onSave={async (currentPassword, newPassword) => { if (!production) throw new Error('تغییر رمز در نسخه آزمایشی فعال نیست.'); await apiChangePassword(currentPassword, newPassword); notify('رمز عبور با موفقیت تغییر کرد.'); setPasswordModalOpen(false); }} />}
    {downloadConfirmationOpen && <DownloadConfirmation onCancel={() => setDownloadConfirmationOpen(false)} onDownload={downloadExport} />}
    {toast && <div className={`toast ${toast.type}`} role="status">{toast.message}</div>}
  </div>;
}

function LoginScreen({ production, onLogin }) {
  const [username, setUsername] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [submitting, setSubmitting] = useState(false);
  const submit = async (event) => { event.preventDefault(); const normalized = normalizeDigits(username).trim().toLowerCase(); if (!['ramin', 'مانا', 'mana'].includes(normalized)) { setError('نام کاربری باید ramin یا mana باشد.'); return; } if (!password.trim()) { setError('رمز عبور را وارد کنید.'); return; } setSubmitting(true); try { await onLogin(normalized === 'ramin' ? PEOPLE.ramin : PEOPLE.mana, password); } catch (loginError) { setError(loginError.message); } finally { setSubmitting(false); } };
  return <main className="login-page"><div className="login-card"><div className="login-brand"><div className="brand-mark large"><img src={BRAND_LOGO_PATH} alt="" /></div><p className="eyebrow">مدیریت هزینه‌های مشترک</p><h1>خرج‌نگار</h1><p className="muted">هزینه‌های خانه را ساده و مرتب کنار هم ببینید.</p></div><form onSubmit={submit} className="login-form"><label>نام کاربری<input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="ramin یا mana" autoComplete="username" /></label><label>رمز عبور<input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="رمز عبور" type="password" autoComplete="current-password" /></label>{error && <p className="form-error">{error}</p>}<button className="primary-button full" type="submit" disabled={submitting}>{submitting ? 'در حال ورود...' : 'ورود به خرج‌نگار'} <Icon name="chevron" size={18} /></button></form><p className="login-hint"><Icon name="lock" size={15} />{production ? 'ورود امن با حساب مشترک شما' : 'نسخه آزمایشی: هر نام کاربری با هر رمز غیرخالی پذیرفته می‌شود.'}</p></div></main>;
}

function LoadingScreen() { return <main className="login-page"><div className="login-card"><div className="brand-mark large"><img src={BRAND_LOGO_PATH} alt="" /></div><p className="eyebrow">خرج‌نگار</p><h1>در حال آماده‌سازی...</h1><p className="muted">اتصال امن به حساب شما</p></div></main>; }
function PersonCard({ label, color, amount, total }) { return <div className="person-card"><div className="person-card-head"><span className={`avatar ${color}`}>{label[0]}</span><span>{label}</span><span className="person-percent">{getCategoryPercentage(amount, total)}٪</span></div><strong>{formatNumber(amount)}</strong><span className="card-unit">تومان</span><div className="progress-track"><span className={color} style={{ width: `${getCategoryPercentage(amount, total)}%` }} /></div></div>; }

function Dashboard({ summary, expenses, comparison, onEdit, onDelete, onShowAll }) {
  const categories = Object.values(CATEGORIES).map((category) => ({ category, amount: summary.byCategory[category] })).filter((item) => item.amount > 0).sort((a, b) => b.amount - a.amount);
  return <><section className="content-grid"><div className="panel category-panel"><div className="panel-heading"><div><p className="eyebrow">تقسیم‌بندی</p><h2>هزینه‌ها کجا رفته‌اند؟</h2></div><Icon name="chart" size={22} /></div>{categories.length ? <div className="category-list">{categories.slice(0, 5).map(({ category, amount }) => <div className="category-row" key={category}><span className="category-icon">{CATEGORY_ICONS[category]}</span><div className="category-meta"><div><strong>{CATEGORY_LABELS[category]}</strong><span>{getCategoryPercentage(amount, summary.total)}٪</span></div><div className="category-bar"><span style={{ width: `${getCategoryPercentage(amount, summary.total)}%` }} /></div></div><b>{formatNumber(amount)}</b></div>)}</div> : <EmptyState text="هنوز هزینه‌ای در این ماه ثبت نشده است." />}</div><div className="panel recent-panel"><div className="panel-heading"><div><p className="eyebrow">آخرین فعالیت‌ها</p><h2>هزینه‌های اخیر</h2></div><button className="text-button" onClick={onShowAll}>مشاهده همه <Icon name="chevron" size={15} /></button></div>{expenses.length ? <div className="recent-list">{expenses.slice(0, 4).map((expense) => <ExpenseRow key={expense.id} expense={expense} onEdit={onEdit} onDelete={onDelete} />)}</div> : <EmptyState text="هزینه‌ای مطابق فیلترهای فعلی پیدا نشد." />}</div></section><section className="insight-strip"><div className="insight-mark">✦</div><div><strong>یک نگاه سریع</strong><p>{categories[0] ? `بیشترین سهم این ماه مربوط به «${CATEGORY_LABELS[categories[0].category]}» است.` : 'با ثبت اولین هزینه، خلاصه وضعیت ماه اینجا نمایش داده می‌شود.'}</p>{comparison?.available && <p className={`month-comparison ${comparison.direction}`}>{comparison.direction === 'less' ? `تا امروز ${comparison.percent}٪ کمتر از ماه قبل خرج شده.` : comparison.direction === 'more' ? `تا امروز ${comparison.percent}٪ بیشتر از ماه قبل خرج شده.` : 'هزینه‌ها نسبت به ماه قبل تغییری نکرده‌اند.'}</p>}</div><span className="insight-value">{categories[0] ? `${getCategoryPercentage(categories[0].amount, summary.total)}٪` : '—'}</span></section><CategoryPieChart summary={summary} /></>;
}
function ExpensesList({ expenses, onEdit, onDelete }) { return <section className="panel expenses-panel"><div className="panel-heading"><div><p className="eyebrow">فهرست تراکنش‌ها</p><h2>همه هزینه‌ها</h2></div><span className="result-count">{expenses.length} مورد</span></div>{expenses.length ? <div className="expenses-table">{expenses.map((expense) => <ExpenseRow key={expense.id} expense={expense} onEdit={onEdit} onDelete={onDelete} detailed />)}</div> : <EmptyState text="هزینه‌ای مطابق فیلترهای فعلی پیدا نشد." />}</section>; }

function SavingsView({ assets, loading, error, onAdd, onEdit, onDelete }) { return <section className="savings-section"><div className="savings-heading"><div><p className="eyebrow">دارایی‌های ثبت‌شده</p><h2>پس‌اندازهای من و ما</h2><p className="muted">موجودی دارایی‌ها جدا از هزینه‌های روزمره نگهداری می‌شود.</p></div><button className="primary-button" onClick={onAdd}><Icon name="plus" size={18} />افزودن دارایی</button></div>{error && <p className="form-error">{error}</p>}{loading ? <EmptyState text="در حال دریافت دارایی‌ها..." /> : assets.length ? <div className="savings-grid">{assets.map((asset) => <SavingsCard asset={asset} key={asset.id} onEdit={onEdit} onDelete={onDelete} />)}</div> : <EmptyState text="هنوز دارایی‌ای ثبت نشده است." />}</section>; }
function SavingsCard({ asset, onEdit, onDelete }) { const assetType = asset.assetType || asset.asset_type; const asOfDate = asset.asOfJalaliDate || asset.as_of_jalali_date; return <article className="savings-card"><div className="savings-card-head"><span className="savings-asset-icon">{SAVINGS_ASSET_ICONS[assetType] || '◇'}</span><div><strong>{asset.title}</strong><small>{asset.symbol} · {SAVINGS_ASSET_TYPE_LABELS[assetType]}</small></div><span className="savings-owner">{SAVINGS_OWNER_LABELS[asset.owner]}</span></div><div className="savings-quantity">{formatSavingsQuantity(asset.quantity)} <small>{asset.unit}</small></div><div className="savings-card-foot"><span>بروزرسانی: {asOfDate}</span><div><button aria-label="ویرایش دارایی" onClick={() => onEdit(asset)}><Icon name="edit" size={15} /></button><button aria-label="حذف دارایی" onClick={() => onDelete(asset)}><Icon name="trash" size={15} /></button></div></div></article>; }
function SavingsModal({ asset, error, onSave, onClose }) {
  const initialType = asset?.assetType || SAVINGS_ASSET_TYPES.crypto;
  const initialOption = asset ? getSavingsAssetOptions(initialType).find((option) => option.symbol === asset.symbol) : getSavingsAssetDefinition(initialType, 'btc');
  const [form, setForm] = useState(() => ({
    assetType: initialType,
    assetValue: initialOption?.value || '',
    quantity: asset?.quantity || '',
    owner: asset?.owner || SAVINGS_OWNERS.shared,
    asOfJalaliDate: asset?.asOfJalaliDate || getTodayJalaliString(),
    note: asset?.note || '',
  }));
  const [localError, setLocalError] = useState('');
  const assetOptions = getSavingsAssetOptions(form.assetType);
  const selectedAsset = getSavingsAssetDefinition(form.assetType, form.assetValue);
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const changeAssetType = (assetType) => setForm((current) => ({ ...current, assetType, assetValue: getSavingsAssetOptions(assetType)[0]?.value || '' }));
  const submit = (event) => {
    event.preventDefault();
    try {
      const quantity = validateSavingsQuantity(form.quantity);
      if (!selectedAsset) throw new Error('دارایی را انتخاب کنید.');
      onSave({ ...form, quantity, symbol: selectedAsset.symbol, title: selectedAsset.title, unit: selectedAsset.unit, note: form.note.trim() });
    } catch (submissionError) {
      setLocalError(submissionError.message);
    }
  };
  return <div className="modal-backdrop" role="presentation"><section className="expense-modal savings-modal" role="dialog" aria-modal="true" aria-labelledby="savings-modal-title"><div className="modal-head"><div><p className="eyebrow">دارایی مستقل</p><h2 id="savings-modal-title">{asset ? 'ویرایش دارایی' : 'افزودن دارایی'}</h2></div><button onClick={onClose} aria-label="بستن"><Icon name="close" size={21} /></button></div><form onSubmit={submit} className="expense-form"><div className="form-two-col"><label>نوع دارایی<select aria-label="نوع دارایی" value={form.assetType} onChange={(event) => changeAssetType(event.target.value)}>{Object.values(SAVINGS_ASSET_TYPES).map((type) => <option value={type} key={type}>{SAVINGS_ASSET_TYPE_LABELS[type]}</option>)}</select></label><label>خود دارایی<select aria-label="خود دارایی" value={form.assetValue} onChange={(event) => update('assetValue', event.target.value)}>{assetOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label></div><label>مقدار<input aria-label="مقدار دارایی" inputMode="decimal" value={form.quantity} onChange={(event) => update('quantity', event.target.value)} placeholder="مثلاً ۰٫۵" /></label><div className="form-two-col"><label>مالک<select value={form.owner} onChange={(event) => update('owner', event.target.value)}>{Object.values(SAVINGS_OWNERS).map((owner) => <option value={owner} key={owner}>{SAVINGS_OWNER_LABELS[owner]}</option>)}</select></label><label>تاریخ موجودی<input value={form.asOfJalaliDate} onChange={(event) => update('asOfJalaliDate', event.target.value)} placeholder="۱۴۰۵/۰۵/۲۶" /></label></div><label>توضیحات <textarea value={form.note} onChange={(event) => update('note', event.target.value)} rows="3" /></label>{(localError || error) && <p className="form-error">{localError || error}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>انصراف</button><button type="submit" className="primary-button">{asset ? 'ذخیره تغییرات' : 'ثبت دارایی'}</button></div></form></section></div>;
}
function MonthPicker({ selectedMonth, year, options, onSelect, onClose }) {
  const selectedMonthNumber = Number(selectedMonth.split('-')[1]);
  const changeYear = (offset) => onSelect(`${year + offset}-${String(selectedMonthNumber).padStart(2, '0')}`, { keepOpen: true });
  return <div className="month-picker-popover" role="dialog" aria-label="انتخاب ماه گزارش"><div className="month-picker-head"><div><span>ماه گزارش</span><strong>{getMonthLabel(selectedMonth)}</strong></div><button type="button" aria-label="بستن انتخاب ماه" onClick={onClose}><Icon name="close" size={17} /></button></div><div className="month-picker-year"><button type="button" aria-label="سال قبل" onClick={() => changeYear(-1)}><Icon name="chevron" size={15} /></button><strong>{toPersianDigits(year)}</strong><button type="button" aria-label="سال بعد" onClick={() => changeYear(1)}><Icon name="chevron" size={15} /></button></div><div className="month-picker-grid" role="listbox" aria-label="ماه‌های سال">{options.map((month) => <button type="button" role="option" aria-selected={month.value === selectedMonth} className={month.value === selectedMonth ? 'selected' : ''} key={month.value} onClick={() => onSelect(month.value)}>{month.label.split(' ')[0]}</button>)}</div><button type="button" className="month-picker-today" onClick={() => onSelect(getCurrentMonth())}>بازگشت به ماه جاری</button></div>;
}
function CategoryPieChart({ summary }) { const items = Object.values(CATEGORIES).map((category) => ({ category, amount: summary.byCategory[category] || 0 })).filter((item) => item.amount > 0); const total = items.reduce((sum, item) => sum + item.amount, 0); const colors = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--chart-6)', 'var(--chart-7)', 'var(--chart-8)']; let cursor = 0; const segments = items.map((item, index) => { const start = cursor; cursor += (item.amount / total) * 100; return `${colors[index % colors.length]} ${start}% ${cursor}%`; }); return <section className="panel pie-panel"><div className="panel-heading"><div><p className="eyebrow">تصویر هزینه‌ها</p><h2>سهم هر دسته‌بندی</h2></div><Icon name="chart" size={22} /></div>{items.length ? <div className="pie-layout"><div className="pie-chart" style={{ background: `conic-gradient(${segments.join(', ')})` }} role="img" aria-label="نمودار سهم دسته‌بندی‌های هزینه" /><div className="pie-legend">{items.map((item, index) => <div className="pie-legend-row" key={item.category}><span style={{ background: colors[index % colors.length] }} /><strong>{CATEGORY_LABELS[item.category]}</strong><b>{getCategoryPercentage(item.amount, total)}٪</b></div>)}</div></div> : <EmptyState text="برای نمایش نمودار، ابتدا هزینه‌ای ثبت کنید." />}</section>; }
function DownloadConfirmation({ onCancel, onDownload }) {
  return <div className="modal-backdrop download-confirmation-backdrop" role="presentation"><section className="download-confirmation" role="dialog" aria-modal="true" aria-labelledby="download-confirmation-title"><div className="download-confirmation-icon"><Icon name="download" size={22} /></div><h2 id="download-confirmation-title">دانلود خروجی Excel</h2><p>تمام اطلاعات هزینه‌ها در یک فایل Excel آماده دانلود می‌شود.</p><div className="download-confirmation-actions"><button type="button" className="secondary-button" onClick={onCancel}>لغو</button><button type="button" className="primary-button" onClick={onDownload}>دانلود <Icon name="download" size={17} /></button></div></section></div>;
}

function PasswordModal({ production, onClose, onSave }) { const [currentPassword, setCurrentPassword] = useState(''); const [newPassword, setNewPassword] = useState(''); const [repeatPassword, setRepeatPassword] = useState(''); const [error, setError] = useState(''); const [saving, setSaving] = useState(false); const submit = async (event) => { event.preventDefault(); if (newPassword.length < 12) { setError('رمز جدید باید حداقل ۱۲ کاراکتر باشد.'); return; } if (newPassword !== repeatPassword) { setError('تکرار رمز جدید با آن یکسان نیست.'); return; } setSaving(true); try { await onSave(currentPassword, newPassword); } catch (saveError) { setError(saveError.message); } finally { setSaving(false); } }; return <div className="modal-backdrop" role="presentation"><section className="password-modal" role="dialog" aria-modal="true" aria-labelledby="password-modal-title"><div className="modal-head"><div><p className="eyebrow">امنیت حساب</p><h2 id="password-modal-title">تغییر رمز عبور</h2></div><button onClick={onClose} aria-label="بستن"><Icon name="close" size={21} /></button></div><form onSubmit={submit} className="expense-form"><label>رمز فعلی<input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" /></label><label>رمز جدید<input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" /></label><label>تکرار رمز جدید<input type="password" value={repeatPassword} onChange={(event) => setRepeatPassword(event.target.value)} autoComplete="new-password" /></label>{!production && <p className="form-error">تغییر رمز فقط در نسخه عملیاتی فعال است.</p>}{error && <p className="form-error">{error}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>انصراف</button><button type="submit" className="primary-button" disabled={saving || !production}>{saving ? 'در حال ذخیره...' : 'تغییر رمز'}</button></div></form></section></div>; }
function ExpenseRow({ expense, onEdit, onDelete, detailed = false }) { return <article className={`expense-row ${detailed ? 'detailed' : ''}`}><div className="expense-category-icon">{CATEGORY_ICONS[expense.category]}</div><div className="expense-info"><strong>{expense.note || CATEGORY_LABELS[expense.category]}</strong><span>{CATEGORY_LABELS[expense.category]} · {formatDate(expense.date)}</span></div><div className="expense-person"><span className={`person-mini ${expense.person === PEOPLE.ramin ? 'blue' : 'green'}`} />{PERSON_LABELS[expense.person]}</div><strong className="expense-amount">{formatNumber(expense.amountToman)} <small>تومان</small></strong><div className="row-actions"><button aria-label="ویرایش هزینه" onClick={() => onEdit(expense)}><Icon name="edit" size={16} /></button><button aria-label="حذف هزینه" onClick={() => onDelete(expense)}><Icon name="trash" size={16} /></button></div></article>; }
function FilterPanel({ filters, setFilters, onClose }) { return <section className="filter-panel"><div className="filter-head"><strong>فیلتر هزینه‌ها</strong><button onClick={onClose} aria-label="بستن فیلترها"><Icon name="close" size={19} /></button></div><label className="search-field"><Icon name="search" size={17} /><input value={filters.query} onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))} placeholder="جست‌وجو در توضیحات" /></label><div className="filter-selects"><label>خرج‌کننده<select value={filters.person} onChange={(event) => setFilters((current) => ({ ...current, person: event.target.value }))}><option value="all">همه</option>{Object.values(PEOPLE).map((person) => <option value={person} key={person}>{PERSON_LABELS[person]}</option>)}</select></label><label>دسته‌بندی<select value={filters.category} onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}><option value="all">همه</option>{Object.values(CATEGORIES).map((category) => <option value={category} key={category}>{CATEGORY_LABELS[category]}</option>)}</select></label></div><button className="clear-filter" onClick={() => setFilters({ person: 'all', category: 'all', query: '' })}>پاک کردن فیلترها</button></section>; }
function ExpenseModal({ expense, onSave, onClose }) { const [form, setForm] = useState(() => expense ? { amount: String(expense.amountToman / 1000), person: expense.person, category: expense.category, date: isoToJalaliString(expense.date), note: expense.note || '' } : { amount: '', person: PEOPLE.ramin, category: CATEGORIES.daily, date: getTodayJalaliString(), note: '' }); const [error, setError] = useState(''); const parsedInitialDate = (() => { try { return parseJalaliDate(form.date); } catch { return parseJalaliDate(getTodayJalaliString()); } })(); const [calendarMonth, setCalendarMonth] = useState({ jy: parsedInitialDate.jy, jm: parsedInitialDate.jm }); const [calendarOpen, setCalendarOpen] = useState(false); const calendarWeeks = getJalaliCalendarWeeks(calendarMonth.jy, calendarMonth.jm); const selectedJalali = (() => { try { return parseJalaliDate(form.date); } catch { return null; } })(); const update = (field, value) => setForm((current) => ({ ...current, [field]: value })); const chooseCalendarDate = (day) => { update('date', `${day.jy}/${String(day.jm).padStart(2, '0')}/${String(day.jd).padStart(2, '0')}`); setCalendarOpen(false); }; const openCalendar = () => { try { const currentDate = parseJalaliDate(form.date); setCalendarMonth({ jy: currentDate.jy, jm: currentDate.jm }); } catch {} setCalendarOpen(true); }; const toggleCalendar = () => { if (!calendarOpen) openCalendar(); else setCalendarOpen(false); }; const goToCalendarToday = () => { const today = parseJalaliDate(getTodayJalaliString()); setCalendarMonth({ jy: today.jy, jm: today.jm }); chooseCalendarDate(today); }; const submit = (event) => { event.preventDefault(); try { onSave({ amountToman: amountInputToToman(form.amount), person: form.person, category: form.category, date: jalaliToIso(parseJalaliDate(form.date)), note: form.note.trim() }); } catch (submissionError) { setError(submissionError.message); } }; return <div className="modal-backdrop" role="presentation"><section className="expense-modal" role="dialog" aria-modal="true" aria-labelledby="expense-modal-title"><div className="modal-head"><div><p className="eyebrow">{expense ? 'ویرایش رکورد' : 'ثبت رکورد جدید'}</p><h2 id="expense-modal-title">{expense ? 'ویرایش هزینه' : 'هزینه جدید'}</h2></div><button onClick={onClose} aria-label="بستن"><Icon name="close" size={21} /></button></div><form onSubmit={submit} className="expense-form"><label className="amount-field">مبلغ <span>هزار تومان</span><div><input inputMode="numeric" autoFocus value={formatInputThousands(form.amount)} onChange={(event) => update('amount', normalizeDigits(event.target.value))} placeholder="مثلاً ۵۰۰" /><b>٬۰۰۰ تومان</b></div><small>مثلاً ۵۰۰ یعنی ۵۰۰ هزار تومان</small></label><div className="form-two-col"><label>خرج‌کننده<select value={form.person} onChange={(event) => update('person', event.target.value)}>{Object.values(PEOPLE).map((person) => <option value={person} key={person}>{PERSON_LABELS[person]}</option>)}</select></label><label>دسته‌بندی<select value={form.category} onChange={(event) => update('category', event.target.value)}>{Object.values(CATEGORIES).map((category) => <option value={category} key={category}>{CATEGORY_LABELS[category]}</option>)}</select></label></div><div className="date-picker-field"><label>تاریخ <span className="label-hint">شمسی</span><div className="date-input-wrap"><input value={form.date} onChange={(event) => update('date', event.target.value)} placeholder="۱۴۰۴/۰۱/۰۱" inputMode="numeric" /><button type="button" className="calendar-trigger" aria-label="باز کردن تقویم شمسی" onClick={toggleCalendar}><Icon name="calendar" size={19} /></button></div></label>{calendarOpen && <JalaliCalendar month={calendarMonth} weeks={calendarWeeks} selected={selectedJalali} onMonthChange={(offset) => setCalendarMonth((current) => shiftJalaliMonth(current, offset))} onSelect={chooseCalendarDate} onToday={goToCalendarToday} />}</div><label>توضیحات <span className="label-hint">اختیاری</span><textarea value={form.note} onChange={(event) => update('note', event.target.value)} placeholder="برای یادآوری بیشتر بنویسید..." rows="3" /></label>{error && <p className="form-error">{error}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>انصراف</button><button type="submit" className="primary-button">{expense ? 'ذخیره تغییرات' : 'ثبت هزینه'} <Icon name="plus" size={18} /></button></div></form></section></div>; }
function JalaliCalendar({ month, weeks, selected, onMonthChange, onSelect, onToday }) { const weekDays = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج']; return <div className="jalali-calendar" role="dialog" aria-label="تقویم شمسی"><div className="calendar-header"><button type="button" aria-label="سال قبل" onClick={() => onMonthChange(-12)}><Icon name="chevron" size={18} /></button><button type="button" aria-label="ماه قبل" onClick={() => onMonthChange(-1)}><Icon name="chevron" size={18} /></button><div className="calendar-month-selectors"><select aria-label="انتخاب ماه تقویم" value={month.jm} onChange={(event) => onMonthChange(Number(event.target.value) - month.jm)}>{JALALI_MONTHS.map((monthName, index) => <option value={index + 1} key={monthName}>{monthName}</option>)}</select><select aria-label="انتخاب سال تقویم" value={month.jy} onChange={(event) => onMonthChange((Number(event.target.value) - month.jy) * 12)}>{Array.from({ length: 21 }, (_, index) => month.jy - 10 + index).map((year) => <option value={year} key={year}>{toPersianDigits(year)}</option>)}</select></div><button type="button" aria-label="ماه بعد" onClick={() => onMonthChange(1)}><Icon name="chevron" size={18} /></button><button type="button" aria-label="سال بعد" onClick={() => onMonthChange(12)}><Icon name="chevron" size={18} /></button></div><div className="calendar-weekdays">{weekDays.map((day) => <span key={day}>{day}</span>)}</div><div className="calendar-grid">{weeks.flatMap((week) => week).map((day, index) => day ? <button type="button" className={selected && selected.jy === day.jy && selected.jm === day.jm && selected.jd === day.jd ? 'selected' : ''} key={`${day.jy}-${day.jm}-${day.jd}`} onClick={() => onSelect(day)} aria-label={`انتخاب ${toPersianDigits(day.jd)} ${getJalaliMonthLabel(day)}`}>{toPersianDigits(day.jd)}</button> : <span className="calendar-empty" key={`empty-${index}`} />)}</div><button type="button" className="calendar-today" onClick={onToday}>امروز</button></div>; }
function EmptyState({ text }) { return <div className="empty-state"><span>○</span><p>{text}</p></div>; }

createRoot(document.getElementById('root')).render(<App />);
