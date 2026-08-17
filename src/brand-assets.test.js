import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const indexHtml = readFileSync(resolve(root, 'index.html'), 'utf8');
const manifest = JSON.parse(readFileSync(resolve(root, 'public/manifest.webmanifest'), 'utf8'));

describe('brand asset contract', () => {
  it('provides a non-empty logo and favicon asset', () => {
    for (const file of ['public/logo.png', 'public/favicon.png']) {
      const path = resolve(root, file);
      expect(existsSync(path)).toBe(true);
      expect(statSync(path).size).toBeGreaterThan(0);
    }
  });

  it('references the logo in the app and favicon in the document', () => {
    expect(indexHtml).toContain('rel="icon"');
    expect(indexHtml).toContain('./favicon-pencil-v2.png');
    expect(indexHtml).toContain('./manifest.webmanifest');
    expect(readFileSync(resolve(root, 'src/main.jsx'), 'utf8')).toContain('import.meta.env.BASE_URL}logo.png');
    expect(readFileSync(resolve(root, 'vite.config.js'), 'utf8')).toContain("process.env.GITHUB_PAGES ? '/kharj-negar/' : './'");
  });

  it('declares installable logo icons in the manifest', () => {
    expect(manifest.icons).toEqual(expect.arrayContaining([
      expect.objectContaining({ src: './logo-192.png', sizes: '192x192' }),
      expect.objectContaining({ src: './logo-512.png', sizes: '512x512' }),
    ]));
  });
});
