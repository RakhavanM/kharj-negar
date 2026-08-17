import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'src/main.jsx'), 'utf8');
const styles = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8');

describe('bottom navigation and dashboard copy', () => {
  it('renders one context-sensitive bottom action per primary tab', () => {
    expect(source).toContain('className="bottom-nav"');
    expect(source).toContain("activeSection === 'expenses' ? 'ثبت هزینه' : 'افزودن دارایی'");
    expect(source).toContain("activeSection === 'expenses' ? openAdd : openSavingsAdd");
    expect(source).toContain('className="bottom-action"');
    expect(styles).toContain('.bottom-nav');
  });

  it('moves the greeting into the centered top bar and updates page copy', () => {
    expect(source).toContain('topbar-greeting');
    expect(source).toContain('هزینه‌های ما');
    expect(source).toContain('پس‌اندازهای ما');
    expect(source).not.toContain('داشبورد مشترک');
    expect(source).not.toContain('دارایی‌های ثبت‌شده');
    expect(styles).toContain('.topbar-greeting');
    expect(styles).toContain('font-size: 20px');
    expect(styles).toContain('.welcome-row');
    expect(styles).toContain('padding: 30px 0 30px');
  });

  it('does not add a stacked bar chart or valuation model', () => {
    expect(source.toLowerCase()).not.toContain('stacked');
    expect(source).not.toContain('ارزش تقریبی');
  });
});
