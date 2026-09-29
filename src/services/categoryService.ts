import { CategoryConfig, CategoryType, MenuItem, OrderItem } from '../types';

export const DEFAULT_CATEGORY_CONFIGS: CategoryConfig[] = [
  { id: 'cat_coffee', name: 'Coffee', type: 'beverage', printLabel: true, description: 'Cà phê pha phin, máy, truyền thống' },
  { id: 'cat_nuoctraicay', name: 'Nước Trái Cây', type: 'beverage', printLabel: true, description: 'Nước ép trái cây tươi' },
  { id: 'cat_tratraicay', name: 'Trà Trái Cây', type: 'beverage', printLabel: true, description: 'Trà hoa quả nhiệt đới' },
  { id: 'cat_trasua', name: 'Trà Sữa', type: 'beverage', printLabel: true, description: 'Trà sữa Hong Kong & Đài Loan' },
  { id: 'cat_suatuoi', name: 'Sữa Tươi', type: 'beverage', printLabel: true, description: 'Sữa tươi trân châu đường đen' },
  { id: 'cat_yaourt', name: 'Yaourt', type: 'beverage', printLabel: true, description: 'Sữa chua dẻo & Yaourt trái cây' },
  { id: 'cat_doan', name: 'Đồ Ăn', type: 'food', printLabel: true, description: 'Bánh ngọt, điểm tâm, đồ ăn nhẹ' },
  { id: 'cat_monmoi', name: 'Món Mới', type: 'beverage', printLabel: true, description: 'Thực đơn thử nghiệm theo mùa' },
  { id: 'cat_phukien', name: 'Đồ Dùng & Phụ Kiện', type: 'accessory', printLabel: false, description: 'Muỗng, đũa, khăn lạnh, ly mang về - KHÔNG in tem' },
  { id: 'cat_cophuc', name: 'Cổ Phục & Đồ Mặc', type: 'accessory', printLabel: false, description: 'Trang phục chụp ảnh, phụ kiện check-in - KHÔNG in tem' },
];

/**
 * Determines whether a given category type should have label printing enabled by default:
 * - Food & Beverage: TRUE (In tem khi gọi món/chế biến)
 * - Accessories & Utensils: FALSE (Không in tem tránh lãng phí)
 */
export function getDefaultPrintLabelForType(type: CategoryType): boolean {
  if (type === 'beverage' || type === 'food') {
    return true;
  }
  return false;
}

/**
 * Checks whether an item should have a 50x30mm cup/preparation label printed:
 * 1. If explicit `item.printLabel` is defined (boolean), it overrides category config.
 * 2. If item category matches a `CategoryConfig`, returns `config.printLabel`.
 * 3. Falls back to detecting accessory/utensil/merchandise keywords (muỗng, đũa, khăn, đồ mặc...).
 * 4. Otherwise defaults to `true`.
 */
export function isItemPrintable(
  item: { category?: string; printLabel?: boolean } | null | undefined,
  categoryConfigs?: CategoryConfig[]
): boolean {
  if (!item) return false;

  // 1. Explicit item-level override
  if (typeof item.printLabel === 'boolean') {
    return item.printLabel;
  }

  const catName = item.category?.trim().toLowerCase() || '';
  if (!catName) return true;

  // 2. Lookup in configured category configs
  const configs = categoryConfigs && categoryConfigs.length > 0 ? categoryConfigs : DEFAULT_CATEGORY_CONFIGS;
  const matched = configs.find(c => c.name.trim().toLowerCase() === catName);
  if (matched) {
    return matched.printLabel !== false;
  }

  // 3. Fallback smart keywords for accessories / non-printable items
  const nonPrintableKeywords = [
    'phụ kiện',
    'phu kien',
    'đồ dùng',
    'do dung',
    'muỗng',
    'muong',
    'đũa',
    'dua',
    'khăn',
    'khan',
    'đồ mặc',
    'do mac',
    'cổ phục',
    'co phuc',
    'quần áo',
    'quan ao',
    'áo choàng',
    'ao choang',
    'nón',
    'quạt',
    'quat',
    'dụng cụ',
    'dung cu',
    'vật tư',
    'vat tu',
    'túi',
    'tui mang ve'
  ];

  if (nonPrintableKeywords.some(kw => catName.includes(kw))) {
    return false;
  }

  return true;
}

/**
 * Filters an array of OrderItems to only those requiring physical labels.
 */
export function getPrintableOrderItems(
  items: OrderItem[],
  categoryConfigs?: CategoryConfig[]
): OrderItem[] {
  return items.filter(item => isItemPrintable(item, categoryConfigs));
}
