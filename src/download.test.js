import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'src/main.jsx'), 'utf8');
const styles = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8');

describe('download confirmation contract', () => {
  it('uses an icon-only download trigger and a confirmation card', () => {
    expect(source).toContain('download-confirmation');
    expect(source).toContain('دانلود خروجی Excel');
    expect(source).toContain('لغو');
    expect(source).toContain('دانلود');
    expect(styles).toContain('.download-confirmation');
  });

  it('keeps the top-bar controls icon-only', () => {
    expect(source).toContain('aria-label={DOWNLOAD_CONFIRMATION_LABEL}');
    expect(source).toContain('aria-label={dark ? \'فعال کردن حالت روشن\' : \'فعال کردن حالت تاریک\'}');
    expect(source).not.toContain("<span>{exporting ? 'در حال آماده‌سازی...' : 'Download'}</span>");
    expect(source).not.toContain('<span>{dark ? \'Light\' : \'Dark\'}</span>');
    expect(styles).toContain('.theme-toggle span { display: none; }');
    expect(styles).toContain('.download-button span { display: none; }');
  });
});
