import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/vazirmatn/400.css';
import '@fontsource/vazirmatn/500.css';
import '@fontsource/vazirmatn/600.css';
import '@fontsource/vazirmatn/700.css';
import './styles.css';
import {
  apiCreateExpense,
  apiDeleteExpense,
  apiExpenseToLocal,
  apiListExpenses,
  apiLogin,
  apiLogout,
  apiMe,
  apiSummary,
  apiUpdateExpense,
  isProductionHost,
  productionPayload,
} from './api.js';
import {
  CATEGORIES,
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  PEOPLE,
  PERSON_LABELS,
  amountInputToToman,
  filterExpenses,
  formatInputThousands,
  formatNumber,
  formatToman,
  getCategoryPercentage,
  getMonthKey,
  getMonthLabel,
  getMonthOptions,
  getMonthSummary,
  getTodayJalaliString,
  isoToJalaliString,
  jalaliToIso,
  normalizeDigits,
  parseJalaliDate,
  sortExpenses,
} from './domain/expenses.js';

const STORAGE_KEY = 'kharj-negar-expenses-v1';
const SESSION_KEY = 'kharj-negar-session-v1';
const DEMO_EXPENSES = [];

const PREVIEW_EXPENSES = [
  { id: 'preview-1', amountToman: 420_000, person: PEOPLE.ramin, category: CATEGORIES.daily, date: '2025-03-21', note: 'خرید روزمره', createdAt: '2025-03-24T10:30:00.000Z' },
  { id: 'preview-2', amountToman: 1_200_000, person: PEOPLE.mana, category: CATEGORIES.pet, date: '2025-03-22', note: 'غذای پت', createdAt: '2025-03-23T15:10:00.000Z' },
  { id: 'preview-3', amountToman: 680_000, person: PEOPLE.ramin, category: CATEGORIES.car, date: '2025-03-20', note: 'سوخت و پارکینگ', createdAt: '2025-03-20T09:00:00.000Z' },
  { id: 'preview-4', amountToman: 2_000_000, person: PEOPLE.mana, category: CATEGORIES.home, date: '2025-03-18', note: 'وسایل خانه', createdAt: '2025-03-18T11:45:00.000Z' },
  { id: 'preview-5', amountToman: 750_000, person: PEOPLE.ramin, category: CATEGORIES.daily, date: '2025-03-14', note: 'غذای بیرون', createdAt: '2025-03-14T20:20:00.000Z' },
];

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
      try { window.localStorage.setItem(key, JSON.stringify(resolved)); } catch { /* storage can be unavailable in private mode */ }
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
    lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
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
  const [demoSession, setDemoSession] = usePersistentState(SESSION_KEY, null);
  const [serverSession, setServerSession] = useState(null);
  const session = production ? serverSession : demoSession;
  const setSession = production ? setServerSession : setDemoSession;
  const [expenses, setExpenses] = usePersistentState(STORAGE_KEY, DEMO_EXPENSES);
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

  const notify = (message, type = 'success') => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 2800);
  };

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
    Promise.all([
      apiListExpenses({ month: selectedMonth, ...filters }),
      apiSummary({ month: selectedMonth, ...filters }),
    ])
      .then(([list, nextSummary]) => {
        if (!active) return;
        setServerData({ expenses: list.items.map(apiExpenseToLocal), summary: nextSummary });
        setServerError('');
      })
      .catch((error) => active && setServerError(error.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [production, session, selectedMonth, filters]);

  const visibleExpenses = previewMode ? PREVIEW_EXPENSES : expenses;
  const localFilteredExpenses = useMemo(() => sortExpenses(filterExpenses(visibleExpenses, { month: selectedMonth, ...filters })), [visibleExpenses, selectedMonth, filters]);
  const localSummary = useMemo(() => getMonthSummary(visibleExpenses, selectedMonth, filters), [visibleExpenses, selectedMonth, filters]);
  const filteredExpenses = production ? serverData.expenses : localFilteredExpenses;
  const summary = production ? (serverData.summary ? {
    total: serverData.summary.total_toman,
    count: serverData.summary.count,
    byPerson: serverData.summary.by_person,
    byCategory: serverData.summary.by_category,
  } : { total: 0, count: 0, byPerson: { ramin: 0, mana: 0 }, byCategory: Object.fromEntries(Object.values(CATEGORIES).map((category) => [category, 0])) }) : localSummary;

  if (loading && production && !session) return <LoadingScreen />;
  if (!session) return <LoginScreen production={production} onLogin={async (username, password) => {
    if (!production) { setSession({ person: username, loggedAt: Date.now() }); return; }
    try {
      const user = await apiLogin(username, password);
      setSession(user);
      setServerError('');
    } catch (error) { throw error; }
  }} />;

  const monthOptions = getMonthOptions(selectedMonth);

  const openAdd = () => { setEditingExpense(null); setFormOpen(true); };
  const openEdit = (expense) => { setEditingExpense(expense); setFormOpen(true); };
  const saveExpense = (form) => {
    if (production) {
      const request = editingExpense ? apiUpdateExpense(editingExpense.serverId || editingExpense.id, productionPayload(form)) : apiCreateExpense(productionPayload(form));
      request.then((saved) => {
        setServerData((current) => ({ ...current, expenses: editingExpense ? current.expenses.map((item) => item.id === String(saved.id) ? apiExpenseToLocal(saved) : item) : [apiExpenseToLocal(saved), ...current.expenses] }));
        setFormOpen(false);
        setEditingExpense(null);
        setSelectedMonth(getMonthKey(form.date));
        notify(editingExpense ? 'هزینه ویرایش شد.' : 'هزینه ثبت شد.');
      }).catch((error) => notify(error.message, 'info'));
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
  const deleteExpense = (expense) => {
    if (!window.confirm('این هزینه حذف شود؟')) return;
    if (production) {
      apiDeleteExpense(expense.serverId || expense.id)
        .then(() => { setServerData((current) => ({ ...current, expenses: current.expenses.filter((item) => item.id !== expense.id) })); notify('هزینه حذف شد.', 'info'); })
        .catch((error) => notify(error.message, 'info'));
      return;
    }
    setExpenses((current) => current.filter((item) => item.id !== expense.id));
    notify('هزینه حذف شد.', 'info');
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark"><span>خ</span></div>
          <div><strong>خرج‌نگار</strong><small>هزینه‌های خونه</small></div>
        </div>
        <div className="topbar-actions">
          <span className="prototype-chip">{production ? 'نسخه اصلی' : 'نسخه آزمایشی'}</span>
          <button className="profile-button" onClick={async () => { if (production) await apiLogout(); setSession(null); }} title="خروج از حساب"><span>{PERSON_LABELS[session.person][0]}</span><Icon name="logout" size={17} /></button>
        </div>
      </header>

      <main className="page-content">
        <section className="welcome-row">
          <div>
            <p className="eyebrow">داشبورد مشترک</p>
            <h1>سلام {PERSON_LABELS[session.person]} <span aria-hidden="true">!</span></h1>
            <p className="muted">هزینه‌ها را ثبت کنید تا تصویر روشن‌تری از خرج‌های خانه داشته باشید.</p>
          </div>
          <button className="primary-button desktop-add" onClick={openAdd}><Icon name="plus" size={20} />ثبت هزینه جدید</button>
        </section>

        <div className="prototype-note"><Icon name="lock" size={17} /><span>{production ? 'داده‌ها به‌صورت امن روی سرور مشترک ذخیره می‌شوند.' : 'این نسخه برای بررسی محصول روی GitHub Pages است؛ داده‌ها فعلاً فقط در همین مرورگر ذخیره می‌شوند.'}</span>{!production && <button onClick={() => setPreviewMode((mode) => !mode)}>{previewMode ? 'داده‌های من' : 'نمایش نمونه'}</button>}</div>
        {serverError && production && <div className="prototype-note server-error"><Icon name="close" size={17} /><span>{serverError}</span></div>}

        <section className="month-toolbar">
          <div className="month-selector">
            <Icon name="calendar" size={18} />
            <select aria-label="انتخاب ماه" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)}>
              {monthOptions.map((month) => <option value={month.value} key={month.value}>{month.label}</option>)}
            </select>
            <Icon name="chevron" size={17} />
          </div>
          <div className="toolbar-actions">
            <button className={`filter-button ${Object.values(filters).some((value) => value !== 'all' && value !== '') ? 'has-filter' : ''}`} onClick={() => setShowFilters((open) => !open)}><Icon name="filter" size={18} />فیلترها</button>
            <button className="mobile-add" aria-label="ثبت هزینه جدید" onClick={openAdd}><Icon name="plus" size={22} /></button>
          </div>
        </section>

        {showFilters && <FilterPanel filters={filters} setFilters={setFilters} onClose={() => setShowFilters(false)} />}

        <section className="summary-grid" aria-label="خلاصه هزینه‌ها">
          <div className="total-card"><div className="card-kicker"><span className="kicker-dot" />مجموع هزینه‌ها</div><strong>{formatToman(summary.total).replace(' تومان', '')}</strong><span className="card-unit">تومان</span><div className="total-card-foot"><span>{summary.count} هزینه در {getMonthLabel(selectedMonth)}</span><span className="trend">● ثبت‌شده</span></div></div>
          <PersonCard label="رامین" color="blue" amount={summary.byPerson[PEOPLE.ramin]} total={summary.total} />
          <PersonCard label="مانا" color="green" amount={summary.byPerson[PEOPLE.mana]} total={summary.total} />
        </section>

        <div className="section-tabs" role="tablist" aria-label="بخش‌های داشبورد">
          <button className={activeView === 'dashboard' ? 'active' : ''} onClick={() => setActiveView('dashboard')}>نمای کلی</button>
          <button className={activeView === 'expenses' ? 'active' : ''} onClick={() => setActiveView('expenses')}>همه هزینه‌ها <span>{filteredExpenses.length}</span></button>
        </div>

        {activeView === 'dashboard' ? <Dashboard summary={summary} expenses={filteredExpenses} onEdit={openEdit} onDelete={deleteExpense} onShowAll={() => setActiveView('expenses')} /> : <ExpensesList expenses={filteredExpenses} onEdit={openEdit} onDelete={deleteExpense} />}
      </main>

      <nav className="bottom-nav" aria-label="ناوبری اصلی">
        <button className={activeView === 'dashboard' ? 'active' : ''} onClick={() => setActiveView('dashboard')}><Icon name="chart" size={21} /><span>داشبورد</span></button>
        <button onClick={openAdd} className="bottom-add"><span><Icon name="plus" size={24} /></span><label>ثبت هزینه</label></button>
        <button className={activeView === 'expenses' ? 'active' : ''} onClick={() => setActiveView('expenses')}><Icon name="list" size={21} /><span>هزینه‌ها</span></button>
      </nav>

      {isFormOpen && <ExpenseModal expense={editingExpense} onSave={saveExpense} onClose={() => { setFormOpen(false); setEditingExpense(null); }} />}
      {toast && <div className={`toast ${toast.type}`} role="status">{toast.message}</div>}
    </div>
  );
}

function LoginScreen({ production, onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    const normalized = normalizeDigits(username).trim().toLowerCase();
    if (!['ramin', 'مانا', 'mana'].includes(normalized)) { setError('نام کاربری باید ramin یا mana باشد.'); return; }
    if (password.trim().length < 1) { setError('رمز عبور را وارد کنید.'); return; }
    setSubmitting(true);
    try {
      await onLogin(normalized === 'ramin' ? PEOPLE.ramin : PEOPLE.mana, password);
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setSubmitting(false);
    }
  };
  return <main className="login-page"><div className="login-card"><div className="login-brand"><div className="brand-mark large"><span>خ</span></div><p className="eyebrow">مدیریت هزینه‌های مشترک</p><h1>خرج‌نگار</h1><p className="muted">هزینه‌های خانه را ساده و مرتب کنار هم ببینید.</p></div><form onSubmit={submit} className="login-form"><label>نام کاربری<input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="ramin یا mana" autoComplete="username" /></label><label>رمز عبور<input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="رمز عبور" type="password" autoComplete="current-password" /></label>{error && <p className="form-error">{error}</p>}<button className="primary-button full" type="submit" disabled={submitting}>{submitting ? 'در حال ورود...' : 'ورود به خرج‌نگار'} <Icon name="chevron" size={18} /></button></form><p className="login-hint"><Icon name="lock" size={15} />{production ? 'ورود امن با حساب مشترک شما' : 'نسخه آزمایشی: هر نام کاربری با هر رمز غیرخالی پذیرفته می‌شود.'}</p></div></main>;
}

function LoadingScreen() {
  return <main className="login-page"><div className="login-card"><div className="brand-mark large"><span>خ</span></div><p className="eyebrow">خرج‌نگار</p><h1>در حال آماده‌سازی...</h1><p className="muted">اتصال امن به حساب شما</p></div></main>;
}

function PersonCard({ label, color, amount, total }) {
  return <div className="person-card"><div className="person-card-head"><span className={`avatar ${color}`}>{label[0]}</span><span>{label}</span><span className="person-percent">{getCategoryPercentage(amount, total)}٪</span></div><strong>{formatNumber(amount)}</strong><span className="card-unit">تومان</span><div className="progress-track"><span className={color} style={{ width: `${getCategoryPercentage(amount, total)}%` }} /></div></div>;
}

function Dashboard({ summary, expenses, onEdit, onDelete, onShowAll }) {
  const categories = Object.values(CATEGORIES).map((category) => ({ category, amount: summary.byCategory[category] })).filter((item) => item.amount > 0).sort((a, b) => b.amount - a.amount);
  return <>
    <section className="content-grid">
      <div className="panel category-panel"><div className="panel-heading"><div><p className="eyebrow">تقسیم‌بندی</p><h2>هزینه‌ها کجا رفته‌اند؟</h2></div><Icon name="chart" size={22} /></div>{categories.length ? <div className="category-list">{categories.slice(0, 5).map(({ category, amount }) => <div className="category-row" key={category}><span className="category-icon">{CATEGORY_ICONS[category]}</span><div className="category-meta"><div><strong>{CATEGORY_LABELS[category]}</strong><span>{getCategoryPercentage(amount, summary.total)}٪</span></div><div className="category-bar"><span style={{ width: `${getCategoryPercentage(amount, summary.total)}%` }} /></div></div><b>{formatNumber(amount)}</b></div>)}</div> : <EmptyState text="هنوز هزینه‌ای در این ماه ثبت نشده است." />}</div>
      <div className="panel recent-panel"><div className="panel-heading"><div><p className="eyebrow">آخرین فعالیت‌ها</p><h2>هزینه‌های اخیر</h2></div><button className="text-button" onClick={onShowAll}>مشاهده همه <Icon name="chevron" size={15} /></button></div>{expenses.length ? <div className="recent-list">{expenses.slice(0, 4).map((expense) => <ExpenseRow key={expense.id} expense={expense} onEdit={onEdit} onDelete={onDelete} />)}</div> : <EmptyState text="هزینه‌ای مطابق فیلترهای فعلی پیدا نشد." />}</div>
    </section>
    <section className="insight-strip"><div className="insight-mark">✦</div><div><strong>یک نگاه سریع</strong><p>{categories[0] ? `بیشترین سهم این ماه مربوط به «${CATEGORY_LABELS[categories[0].category]}» است.` : 'با ثبت اولین هزینه، خلاصه وضعیت ماه اینجا نمایش داده می‌شود.'}</p></div><span className="insight-value">{categories[0] ? `${getCategoryPercentage(categories[0].amount, summary.total)}٪` : '—'}</span></section>
  </>;
}

function ExpensesList({ expenses, onEdit, onDelete }) {
  return <section className="panel expenses-panel"><div className="panel-heading"><div><p className="eyebrow">فهرست تراکنش‌ها</p><h2>همه هزینه‌ها</h2></div><span className="result-count">{expenses.length} مورد</span></div>{expenses.length ? <div className="expenses-table">{expenses.map((expense) => <ExpenseRow key={expense.id} expense={expense} onEdit={onEdit} onDelete={onDelete} detailed />)}</div> : <EmptyState text="هزینه‌ای مطابق فیلترهای فعلی پیدا نشد." />}</section>;
}

function ExpenseRow({ expense, onEdit, onDelete, detailed = false }) {
  return <article className={`expense-row ${detailed ? 'detailed' : ''}`}><div className="expense-category-icon">{CATEGORY_ICONS[expense.category]}</div><div className="expense-info"><strong>{expense.note || CATEGORY_LABELS[expense.category]}</strong><span>{CATEGORY_LABELS[expense.category]} · {formatDate(expense.date)}</span></div><div className="expense-person"><span className={`person-mini ${expense.person === PEOPLE.ramin ? 'blue' : 'green'}`} />{PERSON_LABELS[expense.person]}</div><strong className="expense-amount">{formatNumber(expense.amountToman)} <small>تومان</small></strong><div className="row-actions"><button aria-label="ویرایش هزینه" onClick={() => onEdit(expense)}><Icon name="edit" size={16} /></button><button aria-label="حذف هزینه" onClick={() => onDelete(expense)}><Icon name="trash" size={16} /></button></div></article>;
}

function FilterPanel({ filters, setFilters, onClose }) {
  return <section className="filter-panel"><div className="filter-head"><strong>فیلتر هزینه‌ها</strong><button onClick={onClose} aria-label="بستن فیلترها"><Icon name="close" size={19} /></button></div><label className="search-field"><Icon name="search" size={17} /><input value={filters.query} onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))} placeholder="جست‌وجو در توضیحات" /></label><div className="filter-selects"><label>خرج‌کننده<select value={filters.person} onChange={(event) => setFilters((current) => ({ ...current, person: event.target.value }))}><option value="all">همه</option>{Object.values(PEOPLE).map((person) => <option value={person} key={person}>{PERSON_LABELS[person]}</option>)}</select></label><label>دسته‌بندی<select value={filters.category} onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}><option value="all">همه</option>{Object.values(CATEGORIES).map((category) => <option value={category} key={category}>{CATEGORY_LABELS[category]}</option>)}</select></label></div><button className="clear-filter" onClick={() => setFilters({ person: 'all', category: 'all', query: '' })}>پاک کردن فیلترها</button></section>;
}

function ExpenseModal({ expense, onSave, onClose }) {
  const [form, setForm] = useState(() => expense ? { amount: String(expense.amountToman / 1000), person: expense.person, category: expense.category, date: isoToJalaliString(expense.date), note: expense.note || '' } : { amount: '', person: PEOPLE.ramin, category: CATEGORIES.daily, date: getTodayJalaliString(), note: '' });
  const [error, setError] = useState('');
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const submit = (event) => {
    event.preventDefault();
    try {
      const date = jalaliToIso(parseJalaliDate(form.date));
      onSave({ amountToman: amountInputToToman(form.amount), person: form.person, category: form.category, date, note: form.note.trim() });
    } catch (submissionError) { setError(submissionError.message); }
  };
  return <div className="modal-backdrop" role="presentation"><section className="expense-modal" role="dialog" aria-modal="true" aria-labelledby="expense-modal-title"><div className="modal-head"><div><p className="eyebrow">{expense ? 'ویرایش رکورد' : 'ثبت رکورد جدید'}</p><h2 id="expense-modal-title">{expense ? 'ویرایش هزینه' : 'هزینه جدید'}</h2></div><button onClick={onClose} aria-label="بستن"><Icon name="close" size={21} /></button></div><form onSubmit={submit} className="expense-form"><label className="amount-field">مبلغ <span>هزار تومان</span><div><input inputMode="numeric" autoFocus value={formatInputThousands(form.amount)} onChange={(event) => update('amount', normalizeDigits(event.target.value))} placeholder="مثلاً ۵۰۰" /><b>٬۰۰۰ تومان</b></div><small>مثلاً ۵۰۰ یعنی ۵۰۰ هزار تومان</small></label><div className="form-two-col"><label>خرج‌کننده<select value={form.person} onChange={(event) => update('person', event.target.value)}>{Object.values(PEOPLE).map((person) => <option value={person} key={person}>{PERSON_LABELS[person]}</option>)}</select></label><label>دسته‌بندی<select value={form.category} onChange={(event) => update('category', event.target.value)}>{Object.values(CATEGORIES).map((category) => <option value={category} key={category}>{CATEGORY_LABELS[category]}</option>)}</select></label></div><label>تاریخ <span className="label-hint">شمسی</span><input value={form.date} onChange={(event) => update('date', event.target.value)} placeholder="۱۴۰۴/۰۱/۰۱" inputMode="numeric" /></label><label>توضیحات <span className="label-hint">اختیاری</span><textarea value={form.note} onChange={(event) => update('note', event.target.value)} placeholder="برای یادآوری بیشتر بنویسید..." rows="3" /></label>{error && <p className="form-error">{error}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>انصراف</button><button type="submit" className="primary-button">{expense ? 'ذخیره تغییرات' : 'ثبت هزینه'} <Icon name="plus" size={18} /></button></div></form></section></div>;
}

function EmptyState({ text }) { return <div className="empty-state"><span>○</span><p>{text}</p></div>; }

createRoot(document.getElementById('root')).render(<App />);
