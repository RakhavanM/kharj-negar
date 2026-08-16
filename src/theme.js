export const THEME_STORAGE_KEY = 'kharj-negar-theme-v1';

export function readThemePreference(storage = window.localStorage) {
  const value = storage?.getItem(THEME_STORAGE_KEY);
  return value === 'light' || value === 'dark' ? value : null;
}

export function getEffectiveTheme(preference, systemTheme = 'light') {
  return preference === 'light' || preference === 'dark' ? preference : systemTheme === 'dark' ? 'dark' : 'light';
}

export function nextTheme(theme) {
  return theme === 'dark' ? 'light' : 'dark';
}

export function applyTheme(theme, root = document.documentElement) {
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
}

export function saveThemePreference(theme, storage = window.localStorage) {
  storage?.setItem(THEME_STORAGE_KEY, theme);
}

export function clearThemePreference(storage = window.localStorage) {
  storage?.removeItem(THEME_STORAGE_KEY);
}

export function getSystemTheme() {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
