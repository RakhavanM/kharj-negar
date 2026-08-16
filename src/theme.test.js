import { describe, expect, it } from 'vitest';

import {
  THEME_STORAGE_KEY,
  getEffectiveTheme,
  nextTheme,
  readThemePreference,
} from './theme.js';

describe('theme preference', () => {
  it('uses the saved override before the system theme', () => {
    const storage = { getItem: () => 'light' };
    expect(readThemePreference(storage)).toBe('light');
    expect(getEffectiveTheme('light', 'dark')).toBe('light');
    expect(THEME_STORAGE_KEY).toBe('kharj-negar-theme-v1');
  });

  it('falls back to the system theme when no override exists', () => {
    expect(readThemePreference({ getItem: () => null })).toBeNull();
    expect(getEffectiveTheme(null, 'dark')).toBe('dark');
    expect(getEffectiveTheme(null, 'light')).toBe('light');
  });

  it('toggles the effective theme', () => {
    expect(nextTheme('dark')).toBe('light');
    expect(nextTheme('light')).toBe('dark');
  });
});
