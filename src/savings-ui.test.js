import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'src/main.jsx'), 'utf8');
const styles = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8');

describe('savings UI contract', () => {
  it('has an independent savings tab and bottom navigation entry', () => {
    expect(source).toContain('activeView === \'savings\'');
    expect(source).toContain('پس‌اندازها');
    expect(source).toContain('<SavingsView');
    expect(source).toContain('SavingsModal');
  });

  it('keeps savings presentation separate from expense summary and uses responsive cards', () => {
    expect(source).toContain('const visibleSavingsAssets');
    expect(source).toContain('savings-section');
    expect(styles).toContain('.savings-grid');
    expect(styles).toContain('.savings-card');
    expect(styles).toContain('@media (max-width: 760px)');
  });

  it('supports the requested asset examples and explicit owner values', () => {
    expect(source).toContain('USDT');
    expect(source).toContain('BTC');
    expect(source).toContain('طلا');
    expect(source).toContain('مشترک');
  });
});
