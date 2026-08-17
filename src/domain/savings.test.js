import { describe, expect, it } from 'vitest';

import {
  SAVINGS_ASSET_TYPES,
  SAVINGS_ASSET_OPTIONS,
  SAVINGS_OWNERS,
  getSavingsAssetDefinition,
  getSavingsAssetOptions,
  aggregateSavingsAssets,
  addSavingsQuantities,
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
    expect(Object.values(SAVINGS_ASSET_TYPES)).toEqual(['cash', 'crypto', 'gold']);
    expect(Object.values(SAVINGS_OWNERS)).toEqual(['ramin', 'mana', 'shared']);
  });

  it('exposes dependent options for each approved asset type', () => {
    expect(Object.keys(SAVINGS_ASSET_OPTIONS)).toEqual(['cash', 'crypto', 'gold']);
    expect(getSavingsAssetOptions('cash').map((asset) => asset.value)).toEqual(['usd', 'toman']);
    expect(getSavingsAssetOptions('crypto').map((asset) => asset.value)).toEqual(['usdt', 'btc', 'eth', 'bnb', 'sol']);
    expect(getSavingsAssetOptions('gold').map((asset) => asset.value)).toEqual(['quarter_coin', 'half_coin', 'full_coin', 'gram']);
    expect(getSavingsAssetDefinition('crypto', 'btc')).toEqual({ value: 'btc', label: 'BTC', symbol: 'BTC', title: 'بیت‌کوین', unit: 'BTC' });
  });
});
