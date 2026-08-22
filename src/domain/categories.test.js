import { describe, expect, it } from 'vitest';

import {
  DEFAULT_CATEGORIES,
  categoryNameExists,
  getCategoryIcons,
  getCategoryLabels,
  mergeCategories,
  normalizeCategoryName,
} from './categories.js';

describe('category domain', () => {
  it('normalizes names and detects duplicates without changing stable codes', () => {
    expect(normalizeCategoryName('  خرج   روزمره  ')).toBe('خرج روزمره');
    expect(categoryNameExists(DEFAULT_CATEGORIES, ' خرج   روزمره ')).toBe(true);
    expect(categoryNameExists(DEFAULT_CATEGORIES, ' خرج   روزمره ', 'daily')).toBe(false);
  });

  it('maps server category names and fallback icons', () => {
    const categories = [{ code: 'daily', name: 'خرید روزانه', is_active: true }];
    expect(getCategoryLabels(categories)).toEqual({ daily: 'خرید روزانه' });
    expect(getCategoryIcons(categories)).toEqual({ daily: '☼' });
  });

  it('keeps the demo usable when no server category list exists', () => {
    expect(mergeCategories([]).map((category) => category.code)).toEqual(DEFAULT_CATEGORIES.map((category) => category.code));
    expect(mergeCategories([{ code: 'custom', name: 'تفریح' }])).toEqual([{ code: 'custom', name: 'تفریح' }]);
  });
});
