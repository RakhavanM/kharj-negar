import { describe, expect, it } from 'vitest';

import { aggregateSavingsAssets, addSavingsQuantities } from './savings.js';

const asset = (overrides = {}) => ({
  id: overrides.id || crypto.randomUUID(),
  assetType: 'crypto',
  symbol: 'USDT',
  title: 'تتر',
  quantity: '100',
  unit: 'USDT',
  owner: 'shared',
  asOfJalaliDate: '1405/05/26',
  note: '',
  ...overrides,
});

describe('savings aggregation', () => {
  it('adds exact decimal quantities for the same asset and owner', () => {
    expect(addSavingsQuantities('100.25', '50.75')).toBe('151');
    expect(aggregateSavingsAssets([asset(), asset({ quantity: '50' })])).toHaveLength(1);
    expect(aggregateSavingsAssets([asset(), asset({ quantity: '50' })])[0].quantity).toBe('150');
  });

  it('keeps different owners separate for the same asset', () => {
    const result = aggregateSavingsAssets([asset(), asset({ quantity: '50', owner: 'ramin' })]);
    expect(result).toHaveLength(2);
    expect(result.map((item) => [item.owner, item.quantity])).toEqual([
      ['shared', '100'],
      ['ramin', '50'],
    ]);
  });

  it('keeps different assets separate even when the owner is the same', () => {
    const result = aggregateSavingsAssets([asset(), asset({ symbol: 'BTC', title: 'بیت‌کوین', unit: 'BTC', quantity: '0.5' })]);
    expect(result).toHaveLength(2);
    expect(result.map((item) => item.symbol)).toEqual(['USDT', 'BTC']);
  });
});
