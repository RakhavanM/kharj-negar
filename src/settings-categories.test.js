import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'src/main.jsx'), 'utf8');
const api = readFileSync(resolve(process.cwd(), 'src/api.js'), 'utf8');
const styles = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8');

describe('settings and category management contract', () => {
  it('opens settings with exactly the password and category management items', () => {
    expect(source).toContain('settings-button');
    expect(source).toContain('settings-menu');
    expect(source).toContain('تغییر پسورد');
    expect(source).toContain('تعریف دسته‌بندی');
    expect(source).toContain('role="menuitem"');
    expect(source).toContain('settingsOpen');
    expect(source.match(/role="menuitem"/g)).toHaveLength(2);
  });

  it('moves password access behind settings and exposes category CRUD APIs', () => {
    expect(source).toContain('categoryManagerOpen');
    expect(source).toContain('CategoryManager');
    expect(source).toContain('apiListCategories');
    expect(source).toContain('apiCreateCategory');
    expect(source).toContain('apiUpdateCategory');
    expect(source).toContain('apiDeleteCategory');
    expect(source).toContain('apiRestoreCategory');
    expect(api).toContain("apiRequest(`/categories");
    expect(api).toContain("apiRequest(`/categories/${id}`");
  });

  it('keeps category names dynamic across expense form, filters, summaries, and chart', () => {
    expect(source).toContain('categoryCatalog');
    expect(source).toContain('categoryCatalog.map');
    expect(source).toContain('categoryLabels');
    expect(source).toContain('getCategoryLabels');
  });

  it('supports safe archive and restore states in the manager', () => {
    expect(source).toContain('is_active');
    expect(source).toContain('archiveCategory');
    expect(source).toContain('restoreCategory');
    expect(source).toContain('settings-wrap');
  });
});
