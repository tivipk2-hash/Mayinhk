import { AppState, Order, Expense, MenuItem, CategoryConfig, User, Shift } from '../types';
import { INITIAL_STATE } from '../data/initialData';

const STORAGE_KEY = 'hk_cotran_app_state_v1';
const BACKUP_STORAGE_KEY = 'hk_cotran_app_state_backup';
const ORDERS_ARCHIVE_KEY = 'hk_cotran_persistent_orders_archive';
const EXPENSES_ARCHIVE_KEY = 'hk_cotran_persistent_expenses_archive';
const SHIFTS_ARCHIVE_KEY = 'hk_cotran_persistent_shifts_archive';
const EVENT_NAME = 'hk_cotran_state_change';

/**
 * Helper to safely retrieve items from an archive array in localStorage
 */
function getArchive<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Helper to safely save items to an archive array in localStorage
 */
function saveArchive<T>(key: string, items: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch (err) {
    console.warn(`Could not save archive for ${key}:`, err);
  }
}

/**
 * Helper to merge orders lists without losing completed status or counts,
 * while strictly honoring deletedOrderIds tombstones so deleted orders never resurrect.
 */
export function mergeOrdersList(
  primary: Order[] = [],
  secondary: Order[] = [],
  deletedIds: string[] = []
): Order[] {
  const deletedSet = new Set(deletedIds);
  const map = new Map<string, Order>();
  if (Array.isArray(secondary)) {
    secondary.forEach(o => {
      if (o && (o.id || o.code)) {
        if (!deletedSet.has(o.id) && !deletedSet.has(o.code)) {
          map.set(o.id || o.code, o);
        }
      }
    });
  }
  if (Array.isArray(primary)) {
    primary.forEach(o => {
      if (o && (o.id || o.code)) {
        if (deletedSet.has(o.id) || deletedSet.has(o.code)) return;
        const key = o.id || o.code;
        const existing = map.get(key);
        if (!existing) {
          map.set(key, o);
        } else {
          const preferPrimary =
            (o.status === 'completed' && existing.status !== 'completed') ||
            ((o.billPrintedCount || 0) >= (existing.billPrintedCount || 0) &&
             (o.labelsPrintedCount || 0) >= (existing.labelsPrintedCount || 0));
          if (preferPrimary) {
            map.set(key, { ...existing, ...o });
          }
        }
      }
    });
  }
  return Array.from(map.values()).sort((a, b) => {
    const timeA = new Date(a.createdAt || 0).getTime();
    const timeB = new Date(b.createdAt || 0).getTime();
    return timeB - timeA;
  });
}

/**
 * Helper to merge expenses lists without duplicates,
 * strictly honoring deletedExpenseIds tombstones.
 */
export function mergeExpensesList(
  primary: Expense[] = [],
  secondary: Expense[] = [],
  deletedIds: string[] = []
): Expense[] {
  const deletedSet = new Set(deletedIds);
  const map = new Map<string, Expense>();
  if (Array.isArray(secondary)) {
    secondary.forEach(e => {
      if (e && e.id && !deletedSet.has(e.id)) map.set(e.id, e);
    });
  }
  if (Array.isArray(primary)) {
    primary.forEach(e => {
      if (e && e.id && !deletedSet.has(e.id)) map.set(e.id, e);
    });
  }
  return Array.from(map.values()).sort((a, b) => {
    const timeA = new Date(a.createdAt || a.date || 0).getTime();
    const timeB = new Date(b.createdAt || b.date || 0).getTime();
    return timeB - timeA;
  });
}

/**
 * Helper to merge shifts lists
 */
export function mergeShiftsList(primary: Shift[] = [], secondary: Shift[] = []): Shift[] {
  const map = new Map<string, Shift>();
  if (Array.isArray(secondary)) {
    secondary.forEach(s => { if (s && s.id) map.set(s.id, s); });
  }
  if (Array.isArray(primary)) {
    primary.forEach(s => { if (s && s.id) map.set(s.id, s); });
  }
  return Array.from(map.values());
}

/**
 * Deep merge function:
 * - Orders & Expenses: safely merged with tombstone filtering so deleted records NEVER resurrect!
 * - Menu, Categories, Users: Never unioned! The incoming catalog replaces the old.
 */
export function mergeStates(local: AppState, cloud: AppState): AppState {
  if (!local && !cloud) return INITIAL_STATE;
  if (!local) return cloud;
  if (!cloud) return local;

  const combinedDeletedOrderIds = Array.from(new Set([
    ...(local.deletedOrderIds || []),
    ...(cloud.deletedOrderIds || [])
  ]));
  const combinedDeletedExpenseIds = Array.from(new Set([
    ...(local.deletedExpenseIds || []),
    ...(cloud.deletedExpenseIds || [])
  ]));

  const mergedOrders = mergeOrdersList(local.orders, cloud.orders, combinedDeletedOrderIds);
  const mergedExpenses = mergeExpensesList(local.expenses, cloud.expenses, combinedDeletedExpenseIds);
  const mergedShifts = mergeShiftsList(local.shifts, cloud.shifts);

  // For Catalog (Menu, Categories, Configs, Users):
  // Cloud catalog is authoritative if present, otherwise local.
  // CRITICAL: We NEVER union menu items, which caused deleted items to jump to the end!
  const finalMenu = (cloud.menu && Array.isArray(cloud.menu) && cloud.menu.length > 0)
    ? cloud.menu
    : (local.menu || INITIAL_STATE.menu);

  const finalCategories = (cloud.categories && Array.isArray(cloud.categories) && cloud.categories.length > 0)
    ? cloud.categories
    : (local.categories || INITIAL_STATE.categories);

  const finalCategoryConfigs = (cloud.categoryConfigs && Array.isArray(cloud.categoryConfigs) && cloud.categoryConfigs.length > 0)
    ? cloud.categoryConfigs
    : (local.categoryConfigs || INITIAL_STATE.categoryConfigs);

  const finalUsers = (cloud.users && Array.isArray(cloud.users) && cloud.users.length > 0)
    ? cloud.users
    : (local.users || INITIAL_STATE.users);

  return {
    ...INITIAL_STATE,
    ...local,
    ...cloud,
    orders: mergedOrders,
    expenses: mergedExpenses,
    deletedOrderIds: combinedDeletedOrderIds,
    deletedExpenseIds: combinedDeletedExpenseIds,
    menu: finalMenu,
    categories: finalCategories,
    categoryConfigs: finalCategoryConfigs,
    users: finalUsers,
    shifts: mergedShifts,
    currentShift: cloud.currentShift || local.currentShift,
    printerSettings: {
      ...INITIAL_STATE.printerSettings,
      ...(local.printerSettings || {}),
      ...(cloud.printerSettings || {}),
      billPrinterIp: (cloud.printerSettings?.billPrinterIp || local.printerSettings?.billPrinterIp || '192.168.1.79').trim(),
      labelPrinterIp: (
        (cloud.printerSettings?.labelPrinterIp && cloud.printerSettings.labelPrinterIp !== '192.168.1.80' ? cloud.printerSettings.labelPrinterIp : '') ||
        (local.printerSettings?.labelPrinterIp && local.printerSettings.labelPrinterIp !== '192.168.1.80' ? local.printerSettings.labelPrinterIp : '') ||
        '192.168.1.52'
      ).trim(),
      bridgeWsUrl: (cloud.printerSettings?.bridgeWsUrl || local.printerSettings?.bridgeWsUrl || 'ws://localhost:13579').trim(),
    },
    billTemplate: {
      ...INITIAL_STATE.billTemplate,
      ...(local.billTemplate || {}),
      ...(cloud.billTemplate || {}),
    },
    labelTemplate: {
      ...INITIAL_STATE.labelTemplate,
      ...(local.labelTemplate || {}),
      ...(cloud.labelTemplate || {}),
    },
    homepage: {
      ...INITIAL_STATE.homepage,
      ...(local.homepage || {}),
      ...(cloud.homepage || {}),
    },
  };
}

export const loadState = (): AppState => {
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    // If primary storage key is missing or empty, try reading secondary backup
    if (!raw) {
      raw = localStorage.getItem(BACKUP_STORAGE_KEY);
    }

    let parsed: Partial<AppState> = {};
    if (raw) {
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        console.error('Error parsing state from localStorage:', e);
      }
    }

    // Always merge persistent archives of orders, expenses, and shifts to ensure zero data loss
    const archivedOrders = getArchive<Order>(ORDERS_ARCHIVE_KEY);
    const archivedExpenses = getArchive<Expense>(EXPENSES_ARCHIVE_KEY);
    const archivedShifts = getArchive<any>(SHIFTS_ARCHIVE_KEY);

    const existingOrders = Array.isArray(parsed.orders) ? parsed.orders : [];
    const existingExpenses = Array.isArray(parsed.expenses) ? parsed.expenses : [];
    const existingShifts = Array.isArray(parsed.shifts) ? parsed.shifts : [];

    // Read tombstones to guarantee deleted orders and expenses are never revived
    const deletedOrderIds = Array.isArray(parsed.deletedOrderIds) ? parsed.deletedOrderIds : [];
    const deletedExpenseIds = Array.isArray(parsed.deletedExpenseIds) ? parsed.deletedExpenseIds : [];
    const deletedOrderSet = new Set(deletedOrderIds);
    const deletedExpenseSet = new Set(deletedExpenseIds);

    // Use existing orders/expenses/shifts from primary storage, falling back to backup archive if primary was wiped
    const rawOrders = existingOrders.length > 0 ? existingOrders : archivedOrders;
    const rawExpenses = existingExpenses.length > 0 ? existingExpenses : archivedExpenses;
    const finalShifts = existingShifts.length > 0 ? existingShifts : archivedShifts;

    const finalOrders = rawOrders.filter(o => o && !deletedOrderSet.has(o.id) && !deletedOrderSet.has(o.code));
    const finalExpenses = rawExpenses.filter(e => e && !deletedExpenseSet.has(e.id));

    if (parsed.users && Array.isArray(parsed.users)) {
      const adminUser = parsed.users.find((u: any) => u.username === 'admin');
      if (adminUser && adminUser.passwordHash === 'admin123') {
        adminUser.passwordHash = '0112143';
      }
    }

    const stateToReturn: AppState = {
      ...INITIAL_STATE,
      ...parsed,
      orders: finalOrders,
      expenses: finalExpenses,
      deletedOrderIds,
      deletedExpenseIds,
      shifts: finalShifts,
      currentShift: parsed.currentShift !== undefined ? parsed.currentShift : null,
      categories: (parsed.categories && Array.isArray(parsed.categories) && parsed.categories.length > 0)
        ? parsed.categories
        : INITIAL_STATE.categories,
      categoryConfigs: (parsed.categoryConfigs && Array.isArray(parsed.categoryConfigs) && parsed.categoryConfigs.length > 0)
        ? parsed.categoryConfigs
        : INITIAL_STATE.categoryConfigs,
      printerSettings: {
        ...INITIAL_STATE.printerSettings,
        ...(parsed.printerSettings || {}),
        billPrinterIp: (parsed.printerSettings?.billPrinterIp || '192.168.1.79').trim(),
        labelPrinterIp: (
          parsed.printerSettings?.labelPrinterIp && parsed.printerSettings.labelPrinterIp !== '192.168.1.80'
            ? parsed.printerSettings.labelPrinterIp
            : '192.168.1.52'
        ).trim(),
        bridgeWsUrl: (parsed.printerSettings?.bridgeWsUrl || 'ws://localhost:13579').trim(),
      },
      billTemplate: {
        ...INITIAL_STATE.billTemplate,
        ...(parsed.billTemplate || {}),
      },
      labelTemplate: {
        ...INITIAL_STATE.labelTemplate,
        ...(parsed.labelTemplate || {}),
      },
      homepage: {
        ...INITIAL_STATE.homepage,
        ...(parsed.homepage || {}),
      }
    };

    return stateToReturn;
  } catch (err) {
    console.error('Error loading state from localStorage:', err);
    return INITIAL_STATE;
  }
};

export const saveState = (state: AppState): void => {
  try {
    const jsonStr = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, jsonStr);
    localStorage.setItem(BACKUP_STORAGE_KEY, jsonStr);

    // Save orders, expenses, and shifts to secondary archive keys as failover backups
    if (state.orders && Array.isArray(state.orders)) {
      saveArchive(ORDERS_ARCHIVE_KEY, state.orders);
    }

    if (state.expenses && Array.isArray(state.expenses)) {
      saveArchive(EXPENSES_ARCHIVE_KEY, state.expenses);
    }

    if (state.shifts && Array.isArray(state.shifts)) {
      saveArchive(SHIFTS_ARCHIVE_KEY, state.shifts);
    }

    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: state }));
  } catch (err) {
    console.error('Error saving state to localStorage:', err);
  }
};

export const onStateChange = (callback: (state: AppState) => void): (() => void) => {
  const handler = (e: Event) => {
    const customEvent = e as CustomEvent<AppState>;
    callback(customEvent.detail || loadState());
  };
  window.addEventListener(EVENT_NAME, handler);
  window.addEventListener('storage', () => callback(loadState()));
  return () => {
    window.removeEventListener(EVENT_NAME, handler);
  };
};

export const exportBackupJSON = (): void => {
  const state = loadState();
  const jsonStr = JSON.stringify(state, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `hongkong_cotran_backup_${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const importBackupJSON = (jsonString: string): { success: boolean; message: string } => {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed.menu || !parsed.users || !parsed.printerSettings) {
      return { success: false, message: 'Tập tin sao lưu không đúng định dạng của HongKong Cổ Trấn!' };
    }
    const current = loadState();
    const merged = mergeStates(current, parsed);
    saveState(merged);
    return { success: true, message: 'Phục hồi và đồng bộ dữ liệu thành công!' };
  } catch (err) {
    return { success: false, message: 'Không thể đọc tập tin JSON: ' + (err as Error).message };
  }
};

/**
 * VÔ HIỆU HÓA HOÀN TOÀN TÍNH NĂNG RESET VỀ CÀI ĐẶT GỐC THEO YÊU CẦU
 * Tránh triệt để việc người dùng hoặc hàm ngầm vô tình xóa sạch dữ liệu thực tế của quán.
 */
export const resetToFactory = (): void => {
  console.warn('Tính năng "Khôi Phục Cài Đặt Gốc" đã được vô hiệu hóa hoàn toàn để bảo vệ toàn vẹn dữ liệu.');
};
