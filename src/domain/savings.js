export const SAVINGS_STORAGE_KEY = 'kharj-negar-savings-v1';

export const SAVINGS_ASSET_TYPES = Object.freeze({
  cash: 'cash',
  crypto: 'crypto',
  gold: 'gold',
});

export const SAVINGS_ASSET_OPTIONS = Object.freeze({
  cash: Object.freeze([
    { value: 'usd', label: 'دلار', symbol: 'USD', title: 'دلار', unit: 'دلار' },
    { value: 'toman', label: 'تومان', symbol: 'TOMAN', title: 'تومان', unit: 'تومان' },
  ]),
  crypto: Object.freeze([
    { value: 'usdt', label: 'USDT', symbol: 'USDT', title: 'تتر', unit: 'USDT' },
    { value: 'btc', label: 'BTC', symbol: 'BTC', title: 'بیت‌کوین', unit: 'BTC' },
    { value: 'eth', label: 'ETH', symbol: 'ETH', title: 'اتریوم', unit: 'ETH' },
    { value: 'bnb', label: 'BNB', symbol: 'BNB', title: 'بایننس کوین', unit: 'BNB' },
    { value: 'sol', label: 'SOL', symbol: 'SOL', title: 'سولانا', unit: 'SOL' },
  ]),
  gold: Object.freeze([
    { value: 'quarter_coin', label: 'ربع سکه', symbol: 'QUARTER_COIN', title: 'ربع سکه', unit: 'عدد' },
    { value: 'half_coin', label: 'نیم سکه', symbol: 'HALF_COIN', title: 'نیم سکه', unit: 'عدد' },
    { value: 'full_coin', label: 'تمام سکه', symbol: 'FULL_COIN', title: 'تمام سکه', unit: 'عدد' },
    { value: 'gram', label: 'گرم', symbol: 'GRAM', title: 'گرم', unit: 'گرم' },
  ]),
});

export function getSavingsAssetOptions(type) {
  return SAVINGS_ASSET_OPTIONS[type] || [];
}

export function getSavingsAssetDefinition(type, value) {
  return getSavingsAssetOptions(type).find((asset) => asset.value === value) || null;
}

export const SAVINGS_ASSET_TYPE_LABELS = Object.freeze({
  [SAVINGS_ASSET_TYPES.cash]: 'نقد',
  [SAVINGS_ASSET_TYPES.crypto]: 'رمزارز',
  [SAVINGS_ASSET_TYPES.gold]: 'طلا',
});

export const SAVINGS_ASSET_ICONS = Object.freeze({
  [SAVINGS_ASSET_TYPES.cash]: '₮',
  [SAVINGS_ASSET_TYPES.crypto]: '₿',
  [SAVINGS_ASSET_TYPES.gold]: '◆',
});

export const SAVINGS_OWNERS = Object.freeze({
  ramin: 'ramin',
  mana: 'mana',
  shared: 'shared',
});

export const SAVINGS_OWNER_LABELS = Object.freeze({
  [SAVINGS_OWNERS.ramin]: 'رامین',
  [SAVINGS_OWNERS.mana]: 'مانا',
  [SAVINGS_OWNERS.shared]: 'مشترک',
});

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

export function normalizeSavingsQuantity(value) {
  return String(value ?? '')
    .replace(/[۰-۹]/g, (digit) => String(PERSIAN_DIGITS.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String(ARABIC_DIGITS.indexOf(digit)))
    .replace(/[٬،,\s]/g, '')
    .replace(/٫/g, '.');
}

export function validateSavingsQuantity(value) {
  const normalized = normalizeSavingsQuantity(value);
  if (!/^\d+(\.\d{1,12})?$/.test(normalized) || Number(normalized) <= 0) {
    throw new Error('مقدار دارایی باید عددی بزرگ‌تر از صفر باشد.');
  }
  return normalized;
}

export function formatSavingsQuantity(value) {
  const normalized = normalizeSavingsQuantity(value);
  if (!normalized) return '';
  const [integer, rawFraction] = normalized.split('.');
  const fraction = rawFraction?.replace(/0+$/, '');
  const formattedInteger = new Intl.NumberFormat('en-US').format(Number(integer));
  return fraction ? `${formattedInteger}.${fraction}` : formattedInteger;
}

export function savingsOwnerLabel(owner) {
  return SAVINGS_OWNER_LABELS[owner] || owner;
}

export function savingsAssetTypeLabel(type) {
  return SAVINGS_ASSET_TYPE_LABELS[type] || type;
}

export function savingsAssetToLocal(asset) {
  return {
    ...asset,
    id: String(asset.id),
    serverId: asset.id,
    quantity: normalizeSavingsQuantity(asset.quantity),
  };
}
