import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const styles = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8');
const mainSource = readFileSync(resolve(process.cwd(), 'src/main.jsx'), 'utf8');

describe('system dark mode contract', () => {
  it('uses semantic root colors so dark mode reaches inherited text', () => {
    const rootBlock = styles.match(/^:root \{([\s\S]*?)^\}/m)?.[1] || '';
    expect(rootBlock).toContain('color: var(--ink);');
    expect(rootBlock).toContain('background: var(--canvas);');
    expect(styles).toContain(':root[data-theme="dark"] .person-card');
  });

  it('defines an automatic dark palette and browser color scheme', () => {
    expect(styles).toContain('@media (prefers-color-scheme: dark)');
    expect(styles).toContain('color-scheme: dark');
    expect(styles).toContain('--canvas: #101510');
    expect(styles).toContain('--surface: #182019');
  });

  it('keeps person-card backgrounds and uses dark text in dark mode', () => {
    expect(styles).toContain('.person-card:nth-child(2) { background: #f8fff4; }');
    expect(styles).toContain('.person-card:nth-child(3) { background: #f5faef; }');
    expect(styles).toContain('--person-card-ink: #C3FFA3');
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
    expect(styles).toContain('--muted-light: #CCDBCC;');
    expect(styles).toContain('color: var(--on-accent);');
    expect(styles).toContain('.primary-button,');
    expect(styles).toContain('.download-button,');
    expect(styles).toContain('.filter-button.has-filter,');
    expect(styles).toContain('.brand-mark,');
    expect(styles).toContain('.profile-button, .logout-button');
    expect(styles).toContain('.insight-mark,');
    expect(styles).toContain('.theme-toggle {');
    expect(styles).toContain('.download-button:hover');
    expect(styles).toContain('.calendar-trigger:hover');
    expect(styles).toContain('.filter-button:hover, .filter-button.has-filter');
  });

  it('does not render a legacy version badge in the top bar', () => {
    expect(mainSource).not.toMatch(/className=["'][^"']*chip/);
    expect(styles).not.toMatch(/\.[\w-]*chip\b/);
  });
});
