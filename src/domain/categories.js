export const DEFAULT_CATEGORIES = Object.freeze([
  { id: 'default-daily', code: 'daily', name: 'خرج روزمره', is_active: true, sort_order: 10, version: 1, in_use: false },
  { id: 'default-installment', code: 'installment', name: 'قسط', is_active: true, sort_order: 20, version: 1, in_use: false },
  { id: 'default-rent', code: 'rent', name: 'اجاره', is_active: true, sort_order: 30, version: 1, in_use: false },
  { id: 'default-car', code: 'car', name: 'ماشین', is_active: true, sort_order: 40, version: 1, in_use: false },
  { id: 'default-home', code: 'home', name: 'وسایل خانه', is_active: true, sort_order: 50, version: 1, in_use: false },
  { id: 'default-debt', code: 'debt', name: 'قرض', is_active: true, sort_order: 60, version: 1, in_use: false },
  { id: 'default-pet', code: 'pet', name: 'پت', is_active: true, sort_order: 70, version: 1, in_use: false },
  { id: 'default-miscellaneous', code: 'miscellaneous', name: 'خرج متفرقه', is_active: true, sort_order: 80, version: 1, in_use: false },
]);

export function normalizeCategoryName(value) {
  return String(value ?? '').normalize('NFC').trim().replace(/\s+/g, ' ');
}

export function categoryNameExists(categories, name, exceptCode = '') {
  const normalized = normalizeCategoryName(name).toLocaleLowerCase('fa');
  return categories.some((category) => category.code !== exceptCode && normalizeCategoryName(category.name).toLocaleLowerCase('fa') === normalized);
}

export function getCategoryLabels(categories = DEFAULT_CATEGORIES) {
  return Object.fromEntries(categories.map((category) => [category.code, category.name]));
}

export function getCategoryIcons(categories = DEFAULT_CATEGORIES, fallback = '···') {
  const defaultIcons = Object.fromEntries(DEFAULT_CATEGORIES.map((category, index) => [category.code, ['☼', '↗', '⌂', '▱', '⌂', '↔', '♡', '···'][index]]));
  return Object.fromEntries(categories.map((category) => [category.code, defaultIcons[category.code] || fallback]));
}

export function mergeCategories(remoteCategories, fallback = DEFAULT_CATEGORIES) {
  return remoteCategories?.length ? remoteCategories : fallback.map((category) => ({ ...category }));
}
