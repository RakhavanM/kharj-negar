import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'src/main.jsx'), 'utf8');
const styles = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8');

describe('top bar controls', () => {
  it('removes the profile initial and gives profile/logout equal circular controls', () => {
    expect(source).not.toContain('<span>{PERSON_LABELS[session.person][0]}</span>');
    expect(styles).toContain('.profile-button, .logout-button');
    expect(styles).toContain('width: 36px');
    expect(styles).toContain('height: 36px');
    expect(styles).toContain('min-width: 36px');
    expect(styles).toContain('min-height: 36px');
  });

  it('hides the centered greeting below 460px', () => {
    expect(styles).toContain('@media (max-width: 459px)');
    expect(styles).toContain('.topbar-greeting { display: none; }');
  });
});
