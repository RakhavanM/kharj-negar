export const SAVINGS_STORAGE_KEY = 'kharj-negar-savings-v1';

export const SAVINGS_ASSET_TYPES = Object.freeze({
  cash: 'cash',
  crypto: 'crypto',
  gold: 'gold',
  other: 'other',
});

export const SAVINGS_ASSET_TYPE_LABELS = Object.freeze({
  [SAVINGS_ASSET_TYPES.cash]: 'پول نقد',
  [SAVINGS_ASSET_TYPES.crypto]: 'رمزارز',
  [SAVINGS_ASSET_TYPES.gold]: 'طلا',
  [SAVINGS_ASSET_TYPES.other]: 'سایر دارایی‌ها',
});

export const SAVINGS_ASSET_ICONS = Object.freeze({
  [SAVINGS_ASSET_TYPES.cash]: '₮',
  [SAVINGS_ASSET_TYPES.crypto]: '₿',
  [SAVINGS_ASSET_TYPES.gold]: '◆',
  [SAVINGS_ASSET_TYPES.other]: '◇',
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
