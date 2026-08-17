import { describe, expect, it } from 'vitest';

import {
  SAVINGS_ASSET_TYPES,
  SAVINGS_OWNERS,
  formatSavingsQuantity,
  normalizeSavingsQuantity,
  validateSavingsQuantity,
} from './savings.js';

describe('savings domain', () => {
  it('normalizes Persian decimal quantities without losing precision', () => {
    expect(normalizeSavingsQuantity('۰٫۵')).toBe('0.5');
    expect(validateSavingsQuantity('۰٫۵۰۰۰۰۰۰۰')).toBe('0.50000000');
    expect(formatSavingsQuantity('0.50000000')).toBe('0.5');
  });

  it('rejects zero, negative, malformed, and over-precise quantities', () => {
    for (const value of ['0', '-1', 'abc', '1.1234567890123']) {
      expect(() => validateSavingsQuantity(value)).toThrow();
    }
  });

  it('exposes the independent asset types and ownership options', () => {
    expect(Object.values(SAVINGS_ASSET_TYPES)).toEqual(['cash', 'crypto', 'gold', 'other']);
    expect(Object.values(SAVINGS_OWNERS)).toEqual(['ramin', 'mana', 'shared']);
  });
});
