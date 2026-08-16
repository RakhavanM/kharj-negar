import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const styles = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8');

describe('system dark mode contract', () => {
  it('defines an automatic dark palette and browser color scheme', () => {
    expect(styles).toContain('@media (prefers-color-scheme: dark)');
    expect(styles).toContain('color-scheme: dark');
    expect(styles).toContain('--canvas: #101510');
    expect(styles).toContain('--surface: #182019');
  });

  it('keeps person-card backgrounds and uses dark text in dark mode', () => {
    expect(styles).toContain('.person-card:nth-child(2) { background: #f8fff4; }');
    expect(styles).toContain('.person-card:nth-child(3) { background: #f5faef; }');
    expect(styles).toContain('--person-card-ink: #163300');
    expect(styles).toContain('color: var(--person-card-ink, var(--ink));');
  });

  it('defines readable dark-mode chart colors and key surface overrides', () => {
    expect(styles).toContain('--chart-1:');
    expect(styles).toContain('.total-card {');
    expect(styles).toContain('.bottom-nav {');
    expect(styles).toContain('.password-modal {');
  });

  it('uses a dark foreground on every light-green accent surface', () => {
    expect(styles).toContain('--on-accent: #163300');
    expect(styles).toContain('--on-accent: #163300;');
    expect(styles).toContain('color: var(--on-accent);');
    expect(styles).toContain('.primary-button,');
    expect(styles).toContain('.download-button,');
    expect(styles).toContain('.filter-button.has-filter,');
    expect(styles).toContain('.brand-mark,');
    expect(styles).toContain('.profile-button span,');
    expect(styles).toContain('.insight-mark,');
  });
});
