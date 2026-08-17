import { describe, expect, it } from 'vitest';

import {
  SAVINGS_ASSET_OPTIONS,
  SAVINGS_ASSET_TYPES,
  getSavingsAssetDefinition,
  getSavingsAssetOptions,
} from './savings.js';

describe('savings asset options', () => {
  it('exposes only the approved three asset types', () => {
    expect(Object.values(SAVINGS_ASSET_TYPES)).toEqual(['cash', 'crypto', 'gold']);
    expect(Object.keys(SAVINGS_ASSET_OPTIONS)).toEqual(['cash', 'crypto', 'gold']);
  });

  it('returns the dependent asset options for each type', () => {
    expect(getSavingsAssetOptions('cash').map((asset) => asset.value)).toEqual(['usd', 'toman']);
    expect(getSavingsAssetOptions('crypto').map((asset) => asset.value)).toEqual(['usdt', 'btc', 'eth', 'bnb', 'sol']);
    expect(getSavingsAssetOptions('gold').map((asset) => asset.value)).toEqual(['quarter_coin', 'half_coin', 'full_coin', 'gram']);
  });

  it('defines the submitted symbol, title, and unit from the selected asset', () => {
    expect(getSavingsAssetDefinition('cash', 'usd')).toEqual({ value: 'usd', label: 'دلار', symbol: 'USD', title: 'دلار', unit: 'دلار' });
    expect(getSavingsAssetDefinition('crypto', 'btc')).toEqual({ value: 'btc', label: 'BTC', symbol: 'BTC', title: 'بیت‌کوین', unit: 'BTC' });
    expect(getSavingsAssetDefinition('gold', 'gram')).toEqual({ value: 'gram', label: 'گرم', symbol: 'GRAM', title: 'گرم', unit: 'گرم' });
  });
});
