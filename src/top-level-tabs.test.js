import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'src/main.jsx'), 'utf8');
const styles = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8');

describe('top-level section navigation', () => {
  it('renders the two primary sections below the top bar', () => {
    expect(source).toContain('top-level-tabs');
    expect(source).toContain('هزینه‌ها');
    expect(source).toContain('پس‌انداز');
    expect(source).toContain('activeSection');
    expect(source).toContain('role="tablist"');
    expect(source).toContain('aria-selected={activeSection ===');
  });

  it('keeps expenses and savings as full-page mutually exclusive sections', () => {
    expect(source).toContain("activeSection === 'expenses'");
    expect(source).toContain("activeSection === 'savings'");
    expect(source).toContain('SavingsView');
    expect(source).toContain('Dashboard');
    expect(styles).toContain('.top-level-tabs');
  });

  it('does not keep a savings tab inside the expenses section tabs', () => {
    const sectionTabs = source.match(/<div className="section-tabs"[\s\S]*?<\/div>/)?.[0] || '';
    expect(sectionTabs).toContain('نمای کلی');
    expect(sectionTabs).toContain('همه هزینه‌ها');
    expect(sectionTabs).not.toContain('پس‌اندازها');
  });
});
