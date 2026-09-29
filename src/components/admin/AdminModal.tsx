import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  AppState,
  Order,
  Expense,
  User,
  MenuItem,
  PrinterSettings,
  BillTemplate,
  LabelTemplate,
  HomepageConfig,
  GalleryCorner,
  CategoryConfig,
  CategoryType
} from '../../types';
import {
  formatVND,
  renderReceiptToCanvas,
  renderLabelToCanvas,
  executePrintBill,
  executePrintLabels,
  printBridgeInstance,
  BridgeConnectionStatus,
  DEFAULT_BRIDGE_WS_URL,
  ERROR_BRIDGE_NOT_RUNNING
} from '../../services/printBridgeService';
import { exportBackupJSON, importBackupJSON } from '../../services/storage';
import { INITIAL_STATE } from '../../data/initialData';
import { pushStateToCloud, validateFirestoreConnection, getSyncStatus } from '../../services/firebase';
import { CloudSyncBadge } from '../common/CloudSyncBadge';
import { VIETNAMESE_BANKS } from '../../services/vietqr';
import { PrintReceiptModal } from '../pos/PrintReceiptModal';
import { DEFAULT_CATEGORY_CONFIGS, getDefaultPrintLabelForType, isItemPrintable } from '../../services/categoryService';
import {
  X,
  TrendingUp,
  Users,
  Printer,
  FileText,
  Tag,
  Coffee,
  Tv,
  KeyRound,
  Database,
  Plus,
  Trash2,
  Edit2,
  Check,
  Download,
  Upload,
  RotateCcw,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Cloud,
  Globe,
  Camera,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Sparkles,
  ExternalLink,
  Wifi,
  Layers,
  FolderPlus,
  Banknote,
  QrCode,
  ShieldCheck,
  CreditCard,
  Calendar,
  ChevronDown,
  LogOut,
  ToggleLeft,
  ToggleRight,
  Ban,
  Info,
  Utensils,
  Package,
  Monitor
} from 'lucide-react';

interface AdminModalProps {
  state: AppState;
  currentUser?: User | null;
  onUpdateState: (newState: AppState) => void;
  onClose: () => void;
  onLogout?: () => void;
}

type TabType =
  | 'revenue'
  | 'staff'
  | 'printers'
  | 'bill_template'
  | 'label_template'
  | 'menu'
  | 'gallery'
  | 'homepage'
  | 'security'
  | 'backup';

export type RevenueQuickFilter = 'yesterday' | 'today' | 'week' | 'month' | 'year' | null;

const parseItemDate = (item: { createdAt?: string; date?: string }): Date | null => {
  if (item.createdAt) {
    const d = new Date(item.createdAt);
    if (!isNaN(d.getTime())) return d;
  }
  if (item.date) {
    const parts = item.date.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return new Date(year, month, day, 12, 0, 0);
    }
    const d = new Date(item.date);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
};

const checkTimeMatch = (date: Date, filter: 'yesterday' | 'today' | 'week' | 'month' | 'year'): boolean => {
  const now = new Date();
  
  if (filter === 'yesterday') {
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    return (
      date.getFullYear() === yesterday.getFullYear() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getDate() === yesterday.getDate()
    );
  }

  if (filter === 'today') {
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    );
  }
  
  if (filter === 'week') {
    // Current week: Monday 00:00:00 to Sunday 23:59:59
    const day = now.getDay();
    const diffToMon = (day === 0 ? -6 : 1) - day;
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMon, 0, 0, 0, 0);
    const endOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMon + 6, 23, 59, 59, 999);
    return date >= startOfWeek && date <= endOfWeek;
  }
  
  if (filter === 'month') {
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth()
    );
  }
  
  if (filter === 'year') {
    return date.getFullYear() === now.getFullYear();
  }
  
  return true;
};

const getFilterDisplayLabel = (
  filter: RevenueQuickFilter,
  selectedYear: number,
  selectedMonth: number | 'all'
): string => {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  
  if (filter === 'yesterday') {
    const yest = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    return `Hôm qua (${pad(yest.getDate())}/${pad(yest.getMonth() + 1)}/${yest.getFullYear()})`;
  }
  if (filter === 'today') {
    return `Hôm nay (${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()})`;
  }
  if (filter === 'week') {
    const day = now.getDay();
    const diffToMon = (day === 0 ? -6 : 1) - day;
    const mon = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMon);
    const sun = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMon + 6);
    return `Tuần này (${pad(mon.getDate())}/${pad(mon.getMonth() + 1)} - ${pad(sun.getDate())}/${pad(sun.getMonth() + 1)}/${sun.getFullYear()})`;
  }
  if (filter === 'month') {
    return `Tháng này (Tháng ${pad(now.getMonth() + 1)}/${now.getFullYear()})`;
  }
  if (filter === 'year') {
    return `Năm nay (Năm ${now.getFullYear()})`;
  }

  // Custom Year & Month
  if (selectedMonth === 'all') {
    return `Năm ${selectedYear} (Cả năm)`;
  }
  return `Tháng ${pad(selectedMonth)}/${selectedYear}`;
};

const getFilterShortLabel = (
  filter: RevenueQuickFilter,
  selectedYear: number,
  selectedMonth: number | 'all'
): string => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  if (filter === 'yesterday') return 'Hôm qua';
  if (filter === 'today') return 'Hôm nay';
  if (filter === 'week') return 'Tuần này';
  if (filter === 'month') return 'Tháng này';
  if (filter === 'year') return 'Năm nay';
  if (selectedMonth === 'all') return `Năm ${selectedYear}`;
  return `Tháng ${pad(selectedMonth)}/${selectedYear}`;
};

export const AdminModal: React.FC<AdminModalProps> = ({
  state,
  currentUser,
  onUpdateState,
  onClose,
  onLogout,
}) => {
  const isViewer = currentUser?.role === 'viewer';
  const [activeTab, setActiveTab] = useState<TabType>('revenue');
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Gallery Corner Edit State (hinh.jpg)
  const [selectedCornerId, setSelectedCornerId] = useState<string>(
    state.homepage?.corners?.[0]?.id || 'c1'
  );
  const [newSlideImageUrl, setNewSlideImageUrl] = useState('');
  const [showMasterPass, setShowMasterPass] = useState(false);

  // Printer Form & Bill Form draft states
  const [printerForm, setPrinterForm] = useState<PrinterSettings>(state.printerSettings);
  const [billForm, setBillForm] = useState<BillTemplate>(state.billTemplate);
  const [billPreviewMethod, setBillPreviewMethod] = useState<'cash' | 'transfer'>('transfer');

  // Preview / Re-print modal state for Order History
  const [previewModalOrder, setPreviewModalOrder] = useState<Order | null>(null);
  const [previewModalMode, setPreviewModalMode] = useState<'bill' | 'label' | 'both'>('bill');

  useEffect(() => {
    setPrinterForm(state.printerSettings);
  }, [state.printerSettings]);

  useEffect(() => {
    setBillForm(state.billTemplate);
  }, [state.billTemplate]);

  // If user is viewer, force activeTab to 'revenue'
  useEffect(() => {
    if (isViewer) {
      setActiveTab('revenue');
    }
  }, [isViewer]);

  // Print Bridge WebSocket connection state
  const [bridgeStatus, setBridgeStatus] = useState<BridgeConnectionStatus>(printBridgeInstance.getStatus());
  const [isCheckingBridge, setIsCheckingBridge] = useState(false);

  useEffect(() => {
    const unsub = printBridgeInstance.onStatusChange((status) => {
      setBridgeStatus(status);
    });
    return () => unsub();
  }, []);

  const handleRefreshPrinters = async () => {
    setIsCheckingBridge(true);
    const wsUrl = printerForm.bridgeWsUrl || DEFAULT_BRIDGE_WS_URL;
    showToast(`Đang kiểm tra kết nối Print Bridge tại ${wsUrl}...`);
    try {
      const ok = await printBridgeInstance.checkConnection(wsUrl);
      if (ok) {
        showToast(`Đã kết nối thành công tới Print Bridge (${wsUrl})!`, 'success');
      } else {
        showToast(ERROR_BRIDGE_NOT_RUNNING, 'error');
      }
    } catch (e) {
      showToast(ERROR_BRIDGE_NOT_RUNNING, 'error');
    } finally {
      setIsCheckingBridge(false);
    }
  };

  // Category management states & rules for label printing
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryType, setNewCategoryType] = useState<CategoryType>('beverage');
  const [newCategoryPrintLabel, setNewCategoryPrintLabel] = useState<boolean>(true);
  const [newCategoryDesc, setNewCategoryDesc] = useState('');
  const [editingCategory, setEditingCategory] = useState<CategoryConfig | null>(null);
  const [inlineNewCategory, setInlineNewCategory] = useState('');
  const [showInlineAddCategory, setShowInlineAddCategory] = useState(false);

  // Bill & label previews in settings
  const billPreviewRef = useRef<HTMLDivElement>(null);
  const labelPreviewRef = useRef<HTMLDivElement>(null);

  // New Expense form state
  const [newExpenseTitle, setNewExpenseTitle] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [newExpenseCategory, setNewExpenseCategory] = useState('nguyen_lieu');
  const [newExpenseNote, setNewExpenseNote] = useState('');

  // New Staff form state (Supports 'viewer' role for "Xem sổ sách")
  const [newStaffUser, setNewStaffUser] = useState('');
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffPass, setNewStaffPass] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'staff' | 'admin' | 'viewer'>('staff');

  // Menu item edit state
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isAddingNewItem, setIsAddingNewItem] = useState(false);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Re-render template canvases when templates change
  useEffect(() => {
    if (activeTab === 'bill_template' && billPreviewRef.current) {
      billPreviewRef.current.innerHTML = '';
      const sampleOrder: Order = {
        id: 'sample_inbill',
        code: '0001',
        orderNumber: '0001',
        items: [
          { itemId: '1', name: 'Khoai môn kem chessee', price: 60000, quantity: 1, size: 'M', note: 'ít đá, ít ngọt' },
          { itemId: '2', name: 'Matcha sữa tươi đá', price: 60000, quantity: 1, size: 'M' },
        ],
        subtotal: 120000,
        discount: 0,
        total: 120000,
        type: 'takeaway',
        status: 'completed',
        staffId: 'staff1',
        staffName: 'Thanh Hằng',
        shiftId: 's1',
        createdAt: '2026-01-18T09:30:00.000Z',
        paymentMethod: billPreviewMethod,
        labelsPrintedCount: 1,
        billPrintedCount: 1,
      };
      const canvas = renderReceiptToCanvas(sampleOrder, billForm, printerForm.billPaperWidthMm || 85);
      canvas.className = 'w-[320px] max-w-full h-auto shadow-2xl rounded-sm bg-white';
      billPreviewRef.current.appendChild(canvas);
    }

    if (activeTab === 'label_template' && labelPreviewRef.current) {
      labelPreviewRef.current.innerHTML = '';
      const sampleOrder: Order = {
        id: 'sample',
        code: '0001',
        orderNumber: '0001',
        items: [
          { itemId: '1', name: 'Americano', price: 30000, quantity: 1, size: 'M', note: 'Ít đá' },
          { itemId: '2', name: 'Bạc xỉu (nóng)', price: 35000, quantity: 1, size: 'M', note: 'Đá riêng' },
        ],
        subtotal: 65000,
        discount: 0,
        total: 65000,
        type: 'takeaway',
        status: 'completed',
        staffId: 'staff1',
        staffName: 'Thu Ngân',
        shiftId: 's1',
        createdAt: '2026-09-23T21:50:00.000Z',
        paymentMethod: 'cash',
        labelsPrintedCount: 1,
        billPrintedCount: 1,
      };

      sampleOrder.items.forEach((item, idx) => {
        const canvas = renderLabelToCanvas(sampleOrder, item, idx + 1, 2, state.labelTemplate);
        canvas.className = 'w-full h-auto shadow-md border rounded-lg bg-white mb-3';
        labelPreviewRef.current?.appendChild(canvas);
      });
    }
  }, [activeTab, billForm, billPreviewMethod, state.labelTemplate, printerForm.billPaperWidthMm]);

  // Quick Filter & Custom Year/Month Filter State (Bóc tách Tiền mặt & Chuyển khoản)
  const [revenueQuickFilter, setRevenueQuickFilter] = useState<RevenueQuickFilter>('today');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>(new Date().getMonth() + 1);

  // Dynamically compute all available years from orders, expenses, and defaults
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    const currentYear = new Date().getFullYear();
    years.add(currentYear);
    years.add(currentYear - 1);
    years.add(currentYear - 2);
    state.orders.forEach(o => {
      const d = parseItemDate(o);
      if (d) years.add(d.getFullYear());
    });
    state.expenses.forEach(e => {
      const d = parseItemDate(e);
      if (d) years.add(d.getFullYear());
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [state.orders, state.expenses]);

  // Handler for Quick Filter buttons (Hôm qua, Hôm nay, Tuần này, Tháng này, Năm nay)
  // Quy tắc 1: Bộ chọn Tháng/Năm tự động cập nhật theo thời gian tương ứng
  const handleSelectQuickFilter = (filter: 'yesterday' | 'today' | 'week' | 'month' | 'year') => {
    const curDate = new Date();
    setRevenueQuickFilter(filter);
    if (filter === 'yesterday') {
      const yest = new Date(curDate.getFullYear(), curDate.getMonth(), curDate.getDate() - 1);
      setSelectedYear(yest.getFullYear());
      setSelectedMonth(yest.getMonth() + 1);
    } else {
      setSelectedYear(curDate.getFullYear());
      if (filter === 'year') {
        setSelectedMonth('all');
      } else {
        setSelectedMonth(curDate.getMonth() + 1);
      }
    }
  };

  // Handler for Year Dropdown
  // Quy tắc 2: Khi người dùng chủ động chọn Dropdown, bỏ chọn các nút chọn nhanh để tránh xung đột
  const handleYearChange = (year: number) => {
    setRevenueQuickFilter(null);
    setSelectedYear(year);
  };

  // Handler for Month Dropdown
  // Quy tắc 2: Khi người dùng chủ động chọn Dropdown, bỏ chọn các nút chọn nhanh để tránh xung đột
  const handleMonthChange = (month: number | 'all') => {
    setRevenueQuickFilter(null);
    setSelectedMonth(month);
  };

  // Check matching logic for Order / Expense
  const checkItemTimeMatch = (date: Date): boolean => {
    if (revenueQuickFilter) {
      return checkTimeMatch(date, revenueQuickFilter);
    }
    // Custom filter: Year & Month
    if (date.getFullYear() !== selectedYear) return false;
    if (selectedMonth !== 'all') {
      if (date.getMonth() + 1 !== selectedMonth) return false;
    }
    return true;
  };

  const filteredOrders = state.orders.filter(o => {
    const d = parseItemDate(o);
    return d ? checkItemTimeMatch(d) : false;
  });

  const filteredExpenses = state.expenses.filter(e => {
    const d = parseItemDate(e);
    return d ? checkItemTimeMatch(d) : false;
  });

  const completedOrders = filteredOrders.filter(o => o.status === 'completed');
  const totalRevenue = completedOrders.reduce((sum, o) => sum + o.total, 0);
  const cashOrders = completedOrders.filter(o => o.paymentMethod !== 'transfer');
  const cashRevenue = cashOrders.reduce((sum, o) => sum + o.total, 0);
  const transferOrders = completedOrders.filter(o => o.paymentMethod === 'transfer');
  const transferRevenue = transferOrders.reduce((sum, o) => sum + o.total, 0);

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = totalRevenue - totalExpenses;

  const cashPercentage = totalRevenue > 0 ? Math.round((cashRevenue / totalRevenue) * 100) : 0;
  const transferPercentage = totalRevenue > 0 ? Math.round((transferRevenue / totalRevenue) * 100) : 0;
  const expenseRatio = totalRevenue > 0 ? Math.min(100, Math.round((totalExpenses / totalRevenue) * 100)) : (totalExpenses > 0 ? 100 : 0);
  const profitRatio = totalRevenue > 0 ? Math.max(0, Math.round((netProfit / totalRevenue) * 100)) : 0;

  // Handlers for Order Preview & Re-print label
  const handlePreviewOrderBill = (order: Order) => {
    setPreviewModalOrder(order);
    setPreviewModalMode('bill');
  };

  const handleReprintOrderLabels = async (order: Order) => {
    showToast(`Đang gửi lệnh in tem cho đơn #${order.code}...`, 'info');
    try {
      const res = await executePrintLabels(order, state.labelTemplate, state.printerSettings);
      if (res.success) {
        showToast(`Đã gửi in ${res.count} tem ly cho đơn #${order.code} thành công!`);
      } else {
        setPreviewModalOrder(order);
        setPreviewModalMode('label');
        showToast(`Mở hộp thoại in tem: ${res.message}`, 'error');
      }
    } catch (e) {
      setPreviewModalOrder(order);
      setPreviewModalMode('label');
    }
  };

  // Handlers for Expenses
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(newExpenseAmount.replace(/\D/g, ''));
    if (!newExpenseTitle || isNaN(amountNum) || amountNum <= 0) {
      showToast('Vui lòng điền đúng tiêu đề và số tiền chi!', 'error');
      return;
    }

    const newExp: Expense = {
      id: 'exp_' + Date.now(),
      title: newExpenseTitle,
      amount: amountNum,
      category: newExpenseCategory,
      date: new Date().toISOString().slice(0, 10),
      staffId: 'admin',
      staffName: 'Admin',
      note: newExpenseNote,
      createdAt: new Date().toISOString(),
    };

    onUpdateState({
      ...state,
      expenses: [newExp, ...state.expenses],
    });

    setNewExpenseTitle('');
    setNewExpenseAmount('');
    setNewExpenseNote('');
    showToast('Đã thêm phiếu chi thành công!');
  };

  const handleDeleteExpense = (id: string) => {
    const updatedDeletedExpenseIds = Array.from(new Set([
      ...(state.deletedExpenseIds || []),
      id,
    ]));
    const updated: AppState = {
      ...state,
      expenses: state.expenses.filter(e => e.id !== id),
      deletedExpenseIds: updatedDeletedExpenseIds,
    };
    onUpdateState(updated);
    pushStateToCloud(updated);
    showToast('Đã xoá phiếu chi.');
  };

  // Handlers for Orders
  const handleDeleteOrder = (id: string) => {
    const targetOrder = state.orders.find(o => o.id === id);
    const idsToDelete = [id];
    if (targetOrder?.code) idsToDelete.push(targetOrder.code);

    const updatedDeletedOrderIds = Array.from(new Set([
      ...(state.deletedOrderIds || []),
      ...idsToDelete,
    ]));

    let updatedShift = state.currentShift;
    if (updatedShift && targetOrder && targetOrder.shiftId === updatedShift.id) {
      updatedShift = {
        ...updatedShift,
        totalSales: Math.max(0, updatedShift.totalSales - (targetOrder.total || 0)),
        orderCount: Math.max(0, updatedShift.orderCount - 1),
      };
    }

    const updated: AppState = {
      ...state,
      orders: state.orders.filter(o => o.id !== id && o.code !== id),
      deletedOrderIds: updatedDeletedOrderIds,
      currentShift: updatedShift,
    };
    onUpdateState(updated);
    pushStateToCloud(updated);
    showToast('Đã xoá đơn hàng.');
  };

  // Handlers for Staff
  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffUser || !newStaffName || !newStaffPass) {
      showToast('Vui lòng điền đủ thông tin tài khoản!', 'error');
      return;
    }

    if (state.users.some(u => u.username.toLowerCase() === newStaffUser.trim().toLowerCase())) {
      showToast('Tên đăng nhập này đã tồn tại!', 'error');
      return;
    }

    const newUser: User = {
      id: 'usr_' + Date.now(),
      username: newStaffUser.trim().toLowerCase(),
      name: newStaffName.trim(),
      role: newStaffRole,
      passwordHash: newStaffPass,
    };

    const updated = {
      ...state,
      users: [...state.users, newUser],
    };

    onUpdateState(updated);
    pushStateToCloud(updated);

    setNewStaffUser('');
    setNewStaffName('');
    setNewStaffPass('');
    showToast(`Đã tạo tài khoản ${newUser.name} thành công!`);
  };

  const handleDeleteStaff = (id: string) => {
    if (state.users.length <= 1) {
      showToast('Không thể xoá tài khoản duy nhất còn lại!', 'error');
      return;
    }
    const updated = {
      ...state,
      users: state.users.filter(u => u.id !== id),
    };
    onUpdateState(updated);
    pushStateToCloud(updated);
    showToast('Đã xoá tài khoản.');
  };

  // Handlers for Printer Settings
  const handleSavePrinterSettings = (newSettings: PrinterSettings) => {
    setPrinterForm(newSettings);
    const updated = {
      ...state,
      printerSettings: newSettings,
    };
    onUpdateState(updated);
    pushStateToCloud(updated);
    showToast('Đã lưu cấu hình máy in LAN thành công!');
  };

  const handleSaveAllPrinterSettings = () => {
    const updated = {
      ...state,
      printerSettings: printerForm,
    };
    onUpdateState(updated);
    pushStateToCloud(updated);
    showToast('Đã lưu cấu hình máy in LAN thành công!');
  };

  const handleSaveBillTemplate = () => {
    const updated = {
      ...state,
      billTemplate: billForm,
    };
    onUpdateState(updated);
    pushStateToCloud(updated);
    showToast('Đã lưu mẫu hóa đơn 85mm thành công!');
  };

  // Category management helpers & rich category configurations
  const allCategories = React.useMemo(() => {
    const set = new Set<string>();
    if (state.categories && Array.isArray(state.categories)) {
      state.categories.forEach(c => {
        if (c && c.trim()) set.add(c.trim());
      });
    }
    state.menu.forEach(m => {
      if (m.category && m.category.trim()) set.add(m.category.trim());
    });
    return Array.from(set);
  }, [state.categories, state.menu]);

  // Unified Category Configurations (Single source of truth)
  const currentCategoryConfigs: CategoryConfig[] = React.useMemo(() => {
    let configs: CategoryConfig[] = [];
    if (state.categoryConfigs && Array.isArray(state.categoryConfigs) && state.categoryConfigs.length > 0) {
      configs = state.categoryConfigs.map(c => ({ ...c }));
    } else {
      configs = DEFAULT_CATEGORY_CONFIGS.map(c => ({ ...c }));
    }

    // Ensure any category discovered in allCategories exists in configs
    allCategories.forEach(catName => {
      const exists = configs.find(c => c.name.toLowerCase() === catName.toLowerCase());
      if (!exists) {
        const isAccessory = ['phụ kiện', 'phu kien', 'đồ dùng', 'do dung', 'muỗng', 'đũa', 'khăn', 'cổ phục', 'quần áo', 'áo choàng'].some(k => catName.toLowerCase().includes(k));
        configs.push({
          id: 'cat_' + catName.toLowerCase().replace(/[^a-z0-9]/g, ''),
          name: catName,
          type: isAccessory ? 'accessory' : 'beverage',
          printLabel: !isAccessory,
          description: isAccessory ? 'Đồ dùng & phụ kiện - KHÔNG in tem' : 'Món chế biến - Có in tem',
        });
      }
    });

    return configs;
  }, [state.categoryConfigs, allCategories]);

  // When category type changes:
  // Rule: Mặc định tạo mới danh mục món ăn/nước uống sẽ là Có. Tạo mới các mục đồ dùng/phụ kiện là Không.
  const handleCategoryTypeChange = (type: CategoryType) => {
    setNewCategoryType(type);
    setNewCategoryPrintLabel(getDefaultPrintLabelForType(type));
  };

  const handleAddCategory = (catNameInput?: string) => {
    const rawName = typeof catNameInput === 'string' ? catNameInput : newCategoryName;
    const trimmed = rawName.trim();
    if (!trimmed) {
      showToast('Vui lòng nhập tên danh mục!', 'error');
      return;
    }
    if (currentCategoryConfigs.some(c => c.name.toLowerCase() === trimmed.toLowerCase())) {
      showToast('Danh mục này đã tồn tại!', 'error');
      return;
    }

    const newConfig: CategoryConfig = {
      id: 'cat_' + Date.now(),
      name: trimmed,
      type: newCategoryType,
      printLabel: newCategoryPrintLabel,
      description: newCategoryDesc.trim() || undefined,
    };

    const updatedConfigs = [...currentCategoryConfigs, newConfig];
    const currentList = state.categories && state.categories.length > 0 ? state.categories : allCategories;
    const updatedCategories = Array.from(new Set([...currentList, trimmed]));

    const updated = {
      ...state,
      categories: updatedCategories,
      categoryConfigs: updatedConfigs,
    };

    onUpdateState(updated);
    pushStateToCloud(updated);

    setNewCategoryName('');
    setNewCategoryDesc('');
    setNewCategoryType('beverage');
    setNewCategoryPrintLabel(true);

    showToast(`Đã thêm danh mục "${trimmed}" (${newConfig.printLabel ? 'CÓ IN TEM' : 'KHÔNG IN TEM'}) thành công!`);
  };

  // 1-Click Toggle: Switch label printing for any category directly in the table
  const handleToggleCategoryPrintLabel = (catId: string, currentVal: boolean) => {
    const target = currentCategoryConfigs.find(c => c.id === catId || c.name.toLowerCase() === catId.toLowerCase());
    const nextVal = !currentVal;

    const updatedConfigs = currentCategoryConfigs.map(c => {
      if (c.id === catId || c.name.toLowerCase() === catId.toLowerCase()) {
        return { ...c, printLabel: nextVal };
      }
      return c;
    });

    const updated = {
      ...state,
      categoryConfigs: updatedConfigs,
    };

    onUpdateState(updated);
    pushStateToCloud(updated);
    showToast(
      `Danh mục "${target?.name || catId}" đã chuyển sang: ${nextVal ? 'CÓ IN TEM (50x30)' : 'KHÔNG IN TEM (Bỏ qua tem)'}`,
      nextVal ? 'success' : 'info'
    );
  };

  const handleSaveCategory = (updatedCat: CategoryConfig) => {
    const updatedConfigs = currentCategoryConfigs.map(c => (c.id === updatedCat.id ? updatedCat : c));
    const updated = {
      ...state,
      categoryConfigs: updatedConfigs,
    };
    onUpdateState(updated);
    pushStateToCloud(updated);
    setEditingCategory(null);
    showToast(`Đã cập nhật danh mục "${updatedCat.name}"!`);
  };

  const handleDeleteCategory = (catName: string) => {
    const count = state.menu.filter(m => m.category.toLowerCase() === catName.toLowerCase()).length;
    if (count > 0) {
      if (!confirm(`Danh mục "${catName}" hiện có ${count} món. Xóa danh mục sẽ bỏ khỏi danh sách phân loại nhưng các món vẫn được giữ. Bạn có chắc muốn tiếp tục?`)) {
        return;
      }
    }
    const currentList = state.categories && state.categories.length > 0 ? state.categories : allCategories;
    const updatedList = currentList.filter(c => c.toLowerCase() !== catName.toLowerCase());
    const updatedConfigs = currentCategoryConfigs.filter(c => c.name.toLowerCase() !== catName.toLowerCase());
    const updated = {
      ...state,
      categories: updatedList,
      categoryConfigs: updatedConfigs,
    };
    onUpdateState(updated);
    pushStateToCloud(updated);
    showToast(`Đã xóa danh mục "${catName}".`);
  };

  // Test Print Bill
  const handleTestPrintBill = async () => {
    const sampleOrder: Order = {
      id: 'sample_test',
      code: 'TEST-BILL',
      orderNumber: '70000000030588',
      items: [
        { itemId: '1', name: 'Khoai môn kem chessee', price: 60000, quantity: 1, size: 'M', note: 'ít đá, ít ngọt' },
        { itemId: '2', name: 'Matcha sữa tươi đá', price: 60000, quantity: 1, size: 'M' }
      ],
      subtotal: 120000,
      discount: 0,
      total: 120000,
      type: 'takeaway',
      status: 'completed',
      staffId: 'admin',
      staffName: 'Thanh Hằng',
      shiftId: 's1',
      createdAt: new Date().toISOString(),
      paymentMethod: 'cash',
      labelsPrintedCount: 0,
      billPrintedCount: 0,
    };

    const res = await executePrintBill(sampleOrder, billForm, printerForm, () => {
      window.print();
    });
    showToast(res.message, res.success ? 'success' : 'error');
  };

  // Test Print Label (KHÔNG CÓ GIÁ MÓN THEO YÊU CẦU - IN THỬ 2 LY ĐỂ KIỂM TRA CHUẨN KHỔ 50x30mm)
  const handleTestPrintLabel = async () => {
    const sampleOrder: Order = {
      id: 'sample_test_label',
      code: '0001',
      orderNumber: '0001',
      items: [
        { itemId: '1', name: 'Americano', price: 30000, quantity: 1, size: 'M', note: 'Ít đá' },
        { itemId: '2', name: 'Bạc xỉu (nóng)', price: 35000, quantity: 1, size: 'M', note: 'Đá riêng' },
      ],
      subtotal: 65000,
      discount: 0,
      total: 65000,
      type: 'takeaway',
      status: 'completed',
      staffId: 'admin',
      staffName: 'Admin',
      shiftId: 's1',
      createdAt: new Date().toISOString(),
      paymentMethod: 'cash',
      labelsPrintedCount: 0,
      billPrintedCount: 0,
    };

    const res = await executePrintLabels(sampleOrder, state.labelTemplate, printerForm, () => {
      window.print();
    });
    showToast(res.message, res.success ? 'success' : 'error');
  };

  // Menu Handlers
  const handleSaveMenuItem = (item: MenuItem) => {
    // Ensure item.category is also registered in state.categories
    let updatedCategories = state.categories && state.categories.length > 0 ? [...state.categories] : [...allCategories];
    if (item.category && !updatedCategories.some(c => c.toLowerCase() === item.category.trim().toLowerCase())) {
      updatedCategories.push(item.category.trim());
    }

    if (isAddingNewItem) {
      const updated = {
        ...state,
        categories: updatedCategories,
        menu: [...state.menu, item],
      };
      onUpdateState(updated);
      pushStateToCloud(updated);
      setIsAddingNewItem(false);
      showToast('Đã thêm món mới vào thực đơn!');
    } else {
      const updated = {
        ...state,
        categories: updatedCategories,
        menu: state.menu.map(m => (m.id === item.id ? item : m)),
      };
      onUpdateState(updated);
      pushStateToCloud(updated);
      setEditingItem(null);
      showToast('Đã cập nhật thông tin món!');
    }
  };

  const handleDeleteMenuItem = (id: string) => {
    const updated = {
      ...state,
      menu: state.menu.filter(m => m.id !== id),
    };
    onUpdateState(updated);
    pushStateToCloud(updated);
    showToast('Đã xoá món khỏi thực đơn.');
  };

  // Gallery Corners Handlers (hinh.jpg)
  const currentCorners: GalleryCorner[] =
    state.homepage?.corners && state.homepage.corners.length > 0
      ? state.homepage.corners
      : INITIAL_STATE.homepage?.corners || [];
  const activeCorner: GalleryCorner =
    currentCorners.find(c => c.id === selectedCornerId) || currentCorners[0] || {
      id: 'c1',
      title: 'Hiên Cổ Phục',
      subtitle: '尖沙嘴 Select 18',
      category: 'cophuc',
      description: 'Không gian gác gỗ mộc mạc lưu giữ nét duyên trang phục hỷ sự cổ truyền Hong Kong.',
      images: [
        'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=800&auto=format&fit=crop&q=80',
      ],
    };

  const handleUpdateCorner = (updated: GalleryCorner) => {
    const updatedCorners = currentCorners.map(c => (c.id === updated.id ? updated : c));
    const updatedState: AppState = {
      ...state,
      homepage: {
        ...state.homepage,
        corners: updatedCorners,
      },
    };
    onUpdateState(updatedState);
    pushStateToCloud(updatedState, 'admin_update_gallery');
    showToast(`Đã lưu thay đổi góc "${updated.title}"!`);
  };

  const handleAddCorner = () => {
    const newId = `corner-${Date.now()}`;
    const newCorner: GalleryCorner = {
      id: newId,
      title: 'Góc Chụp Mới',
      subtitle: '香港 Cổ Trấn',
      category: 'cophuc',
      description: 'Mô tả góc check-in đậm chất phim ảnh Hong Kong thập niên 90.',
      images: [
        'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80',
      ],
    };
    const updatedCorners = [...currentCorners, newCorner];
    const updatedState: AppState = {
      ...state,
      homepage: {
        ...state.homepage,
        corners: updatedCorners,
      },
    };
    onUpdateState(updatedState);
    pushStateToCloud(updatedState, 'admin_add_gallery_corner');
    setSelectedCornerId(newId);
    showToast('Đã thêm góc check-in mới!');
  };

  const handleDeleteCorner = (cornerId: string) => {
    if (currentCorners.length <= 1) {
      showToast('Cần giữ lại ít nhất 1 góc chụp trong danh sách.', 'error');
      return;
    }
    const updatedCorners = currentCorners.filter(c => c.id !== cornerId);
    const updatedState: AppState = {
      ...state,
      homepage: {
        ...state.homepage,
        corners: updatedCorners,
      },
    };
    onUpdateState(updatedState);
    pushStateToCloud(updatedState, 'admin_delete_gallery_corner');
    setSelectedCornerId(updatedCorners[0].id);
    showToast('Đã xoá góc check-in.');
  };

  const handleResetCorners = () => {
    if (window.confirm('Khôi phục danh sách 9 góc chụp mẫu ban đầu (như trong ảnh)?')) {
      const defaultCorners = INITIAL_STATE.homepage?.corners || [];
      const updatedState: AppState = {
        ...state,
        homepage: {
          ...state.homepage,
          corners: defaultCorners,
        },
      };
      onUpdateState(updatedState);
      pushStateToCloud(updatedState, 'admin_reset_gallery');
      setSelectedCornerId(defaultCorners[0]?.id || 'c1');
      showToast('Đã khôi phục 9 góc chụp mẫu ban đầu!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <div className="w-full max-w-6xl h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden border border-neutral-300 text-neutral-900 animate-in fade-in">
        {/* Sidebar Tabs matching caidat.jpg */}
        <aside className="w-full md:w-72 bg-neutral-900 text-white flex flex-col shrink-0 border-r border-neutral-800">
          <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-600 text-black flex items-center justify-center font-bold text-sm">
                ⚙
              </div>
              <div>
                <h3 className="font-bold text-sm text-neutral-100 font-serif">CÀI ĐẶT HỆ THỐNG</h3>
                <p className="text-[10px] text-amber-400 font-mono">
                  {isViewer ? 'HongKong Cổ Trấn (Xem Sổ Sách)' : 'HongKong Cổ Trấn Admin'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="md:hidden w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center text-neutral-400"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Viewer role indicator */}
          {isViewer && (
            <div className="mx-3 mt-3 p-3 rounded-xl bg-blue-950/80 border border-blue-600/50 text-blue-200 text-xs">
              <div className="font-bold flex items-center gap-1.5 text-blue-300 mb-1">
                <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
                <span>Nhóm: Xem Sổ Sách</span>
              </div>
              <p className="text-[11px] text-blue-200/80 leading-snug">
                Chế độ xem báo cáo tài chính (Read-only). Không có quyền thêm, sửa, xóa dữ liệu.
              </p>
            </div>
          )}

          {/* Navigation Items */}
          <nav className="flex-1 overflow-y-auto p-2 space-y-1">
            {[
              { id: 'revenue', label: 'Doanh thu & Lợi nhuận', icon: TrendingUp },
              ...(!isViewer
                ? [
                    { id: 'staff', label: 'Tài khoản nhân viên & Phân quyền', icon: Users },
                    { id: 'printers', label: 'Thiết lập máy in (LAN IP)', icon: Printer },
                    { id: 'bill_template', label: 'Mẫu in bill (85mm)', icon: FileText },
                    { id: 'label_template', label: 'Mẫu in tem (50x30mm)', icon: Tag },
                    { id: 'menu', label: 'Quản lý thực đơn & Món', icon: Coffee },
                    { id: 'gallery', label: 'Góc Check-in Trang Chủ (hinh.jpg)', icon: Camera },
                    { id: 'homepage', label: 'Tùy biến Trang Chủ & Tivi', icon: Tv },
                    { id: 'security', label: 'Bảo mật & Mật khẩu chủ', icon: KeyRound },
                    { id: 'backup', label: 'Sao lưu & Phục hồi dữ liệu', icon: Database },
                  ]
                : []),
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`w-full text-left px-3.5 py-3 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-amber-600 text-black font-bold shadow-md'
                      : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-black' : 'text-amber-500'}`} />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Bottom actions on desktop sidebar */}
          <div className="p-3 border-t border-neutral-800 space-y-2">
            <a
              href={`${window.location.origin}${window.location.pathname}?pos=orderdisplay`}
              target="_blank"
              rel="noreferrer"
              className="w-full py-2 px-3 rounded-xl bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-xs"
              title="Mở màn hình phụ cho khách (?pos=orderdisplay)"
            >
              <Monitor className="w-4 h-4 text-indigo-400" />
              <span>Mở Màn Hình Phụ</span>
            </a>

            {onLogout && (
              <button
                onClick={() => {
                  onClose();
                  onLogout();
                }}
                className="w-full py-2 rounded-xl bg-neutral-800/80 hover:bg-red-950 text-neutral-300 hover:text-red-300 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Đăng Xuất</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>Đóng Cài Đặt</span>
            </button>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 flex flex-col bg-neutral-50 overflow-hidden">
          {/* Header Bar */}
          <div className="px-6 py-4 bg-white border-b border-neutral-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-neutral-900 capitalize">
                  {activeTab === 'revenue' && 'Báo Cáo Doanh Thu, Chi Phí & Lợi Nhuận'}
                  {activeTab === 'staff' && 'Quản Lý Tài Khoản Nhân Viên & Phân Quyền Bán Hàng'}
                  {activeTab === 'printers' && 'Cấu Hình Máy In Mạng LAN (192.168.1.79 & 192.168.1.52)'}
                  {activeTab === 'bill_template' && 'Cấu Hình Mẫu In Hóa Đơn Bill (Khổ 85mm)'}
                  {activeTab === 'label_template' && 'Cấu Hình Mẫu In Tem Dán Ly (Khổ 50mm x 30mm)'}
                  {activeTab === 'menu' && 'Quản Lý Thực Đơn & Giá Món Cà Phê'}
                  {activeTab === 'gallery' && 'Quản Lý Những Góc Check-in & Hình Ảnh Slide (hinh.jpg)'}
                  {activeTab === 'homepage' && 'Tùy Biến Nội Dung Trang Chủ & 5 Kênh Tivi Thập Niên 90'}
                  {activeTab === 'security' && 'Bảo Mật & Quản Lý Mật Khẩu Chủ (Master Key)'}
                  {activeTab === 'backup' && 'Sao Lưu & Phục Hồi Cơ Sở Dữ Liệu'}
                </h2>
              </div>

              <button
                onClick={onClose}
                className="hidden md:flex w-8 h-8 rounded-lg bg-neutral-100 hover:bg-neutral-200 items-center justify-center text-neutral-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Filter Bar (Thanh chọn nhanh & Bộ chọn tùy chỉnh Tháng / Năm) */}
            {activeTab === 'revenue' && (
              <div className="mt-3.5 pt-3.5 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-3">
                {/* Left group: Quick Filter Tabs + Custom Year & Month Dropdowns */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  {/* Quick Filters */}
                  <div className="flex items-center gap-1 sm:gap-1.5 p-1 bg-neutral-100/90 rounded-xl border border-neutral-200/80">
                    <button
                      type="button"
                      onClick={() => handleSelectQuickFilter('yesterday')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        revenueQuickFilter === 'yesterday'
                          ? 'bg-red-600 text-white shadow-sm ring-1 ring-red-600'
                          : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/80'
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Hôm qua</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectQuickFilter('today')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        revenueQuickFilter === 'today'
                          ? 'bg-red-600 text-white shadow-sm ring-1 ring-red-600'
                          : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/80'
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Hôm nay</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectQuickFilter('week')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        revenueQuickFilter === 'week'
                          ? 'bg-red-600 text-white shadow-sm ring-1 ring-red-600'
                          : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/80'
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Tuần này</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectQuickFilter('month')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        revenueQuickFilter === 'month'
                          ? 'bg-red-600 text-white shadow-sm ring-1 ring-red-600'
                          : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/80'
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Tháng này</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectQuickFilter('year')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        revenueQuickFilter === 'year'
                          ? 'bg-red-600 text-white shadow-sm ring-1 ring-red-600'
                          : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/80'
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Năm nay</span>
                    </button>
                  </div>

                  {/* Vertical Divider */}
                  <div className="hidden md:block h-6 w-[1px] bg-neutral-200"></div>

                  {/* Custom Filter: Dropdown Năm & Tháng trong Năm */}
                  <div className="flex items-center gap-1.5">
                    {/* Dropdown Năm */}
                    <div className="relative">
                      <select
                        value={selectedYear}
                        onChange={(e) => handleYearChange(parseInt(e.target.value, 10))}
                        className={`pl-2.5 pr-7 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer appearance-none bg-white ${
                          revenueQuickFilter === null
                            ? 'border-red-500 text-red-700 ring-2 ring-red-500/20 shadow-xs'
                            : 'border-neutral-300 text-neutral-700 hover:border-neutral-400'
                        }`}
                        title="Chọn năm cần xem báo cáo"
                      >
                        {availableYears.map((yr) => (
                          <option key={yr} value={yr}>
                            {yr === new Date().getFullYear()
                              ? `Năm ${yr} (Năm nay)`
                              : yr === new Date().getFullYear() - 1
                              ? `Năm ${yr} (Năm trước)`
                              : `Năm ${yr}`}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-neutral-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    {/* Dropdown Tháng trong Năm */}
                    <div className="relative">
                      <select
                        value={selectedMonth}
                        onChange={(e) => {
                          const val = e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10);
                          handleMonthChange(val);
                        }}
                        className={`pl-2.5 pr-7 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer appearance-none bg-white ${
                          revenueQuickFilter === null
                            ? 'border-red-500 text-red-700 ring-2 ring-red-500/20 shadow-xs'
                            : 'border-neutral-300 text-neutral-700 hover:border-neutral-400'
                        }`}
                        title="Chọn tháng trong năm"
                      >
                        <option value="all">Cả năm ({selectedYear})</option>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                          <option key={m} value={m}>
                            Tháng {m < 10 ? `0${m}` : m}/{selectedYear}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-neutral-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Right side: Active Range Badge */}
                <div className="flex items-center gap-2.5 text-xs text-neutral-600">
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-100 border border-neutral-200/70 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Phạm vi: <strong className="text-neutral-800 font-semibold">{getFilterDisplayLabel(revenueQuickFilter, selectedYear, selectedMonth)}</strong></span>
                  </span>
                  <span className="hidden sm:inline text-neutral-400 font-mono text-[11px]">
                    {completedOrders.length} đơn hoàn thành
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Toast Notification */}
          {toastMsg && (
            <div className={`mx-6 mt-4 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-md animate-in fade-in ${
              toastMsg.type === 'success' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-red-100 text-red-800 border border-red-300'
            }`}>
              {toastMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
              <span>{toastMsg.text}</span>
            </div>
          )}

          {/* Tab Body */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* TAB 1: DOANH THU & LỢI NHUẬN */}
            {activeTab === 'revenue' && (
              <div className="space-y-6">
                {/* METRIC CARDS: Bóc tách Tiền mặt & Chuyển khoản & Tổng Doanh thu */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Card 1: Tổng Doanh Thu Cả Tiền Mặt & Chuyển Khoản */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 shadow-sm relative overflow-hidden sm:col-span-2 lg:col-span-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-blue-900 font-bold uppercase tracking-wider">Tổng Doanh Thu (Tất Cả)</span>
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                    </div>
                    <h3 className="text-2xl font-black text-blue-700 mt-1 font-mono">
                      {formatVND(totalRevenue)}đ
                    </h3>
                    <span className="text-[11px] text-blue-900/70 mt-1 block font-medium">
                      Tổng {completedOrders.length} đơn hoàn thành (Tiền mặt + Chuyển khoản)
                    </span>
                  </div>

                  {/* Card 2: Doanh Thu Bán Hàng Tiền Mặt */}
                  <div className="p-4 rounded-2xl bg-white border border-emerald-200 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-emerald-800 font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <Banknote className="w-4 h-4 text-emerald-600" />
                        Doanh Thu Bán Hàng Tiền Mặt
                      </span>
                    </div>
                    <h3 className="text-2xl font-black text-emerald-600 mt-1 font-mono">
                      {formatVND(cashRevenue)}đ
                    </h3>
                    <span className="text-[11px] text-neutral-500 mt-1 block">
                      {cashOrders.length} đơn thanh toán tiền mặt trực tiếp
                    </span>
                  </div>

                  {/* Card 3: Doanh Thu Bán Hàng Chuyển Khoản */}
                  <div className="p-4 rounded-2xl bg-white border border-blue-200 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-blue-800 font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <QrCode className="w-4 h-4 text-blue-600" />
                        Doanh Thu Bán Hàng Chuyển Khoản
                      </span>
                    </div>
                    <h3 className="text-2xl font-black text-indigo-600 mt-1 font-mono">
                      {formatVND(transferRevenue)}đ
                    </h3>
                    <span className="text-[11px] text-neutral-500 mt-1 block">
                      {transferOrders.length} đơn thanh toán quét mã VietQR / Chuyển khoản
                    </span>
                  </div>

                  {/* Card 4: Tổng Chi Phí (Phiếu Chi) */}
                  <div className="p-4 rounded-2xl bg-white border border-neutral-200 shadow-sm">
                    <span className="text-xs text-neutral-500 font-medium">Tổng Chi Phí (Phiếu Chi)</span>
                    <h3 className="text-2xl font-black text-red-600 mt-1 font-mono">
                      {formatVND(totalExpenses)}đ
                    </h3>
                    <span className="text-[11px] text-neutral-400 mt-1 block">
                      {filteredExpenses.length} khoản chi nguyên liệu, vật tư
                    </span>
                  </div>

                  {/* Card 5: Lợi Nhuận Thuần (Doanh thu - Chi) */}
                  <div className="p-4 rounded-2xl bg-white border border-neutral-200 shadow-sm sm:col-span-2">
                    <span className="text-xs text-neutral-500 font-medium">Lợi Nhuận Thuần (Doanh thu - Chi)</span>
                    <h3 className={`text-2xl font-black mt-1 font-mono ${netProfit >= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {formatVND(netProfit)}đ
                    </h3>
                    <span className="text-[11px] text-neutral-400 mt-1 block">
                      Tỷ suất lợi nhuận: {totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                </div>

                {/* Visual Ratio & Comparison Chart (Biểu Đồ Cơ Cấu Dòng Tiền & Hiệu Quả Kinh Doanh) */}
                <div className="p-4 rounded-2xl bg-white border border-neutral-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-neutral-700" />
                      <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
                        Biểu Đồ Phân Tích & Cơ Cấu Tài Chính ({getFilterShortLabel(revenueQuickFilter, selectedYear, selectedMonth)})
                      </h4>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-medium text-neutral-500 flex-wrap">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block"></span>
                        Tiền mặt ({cashPercentage}%)
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500 inline-block"></span>
                        Chuyển khoản ({transferPercentage}%)
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm bg-red-400 inline-block"></span>
                        Chi phí ({expenseRatio}%)
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    {/* Bar 1: Tiền mặt vs Chuyển khoản */}
                    <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-100 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-neutral-700">Tỷ lệ Tiền mặt vs Chuyển khoản</span>
                        <span className="font-mono font-bold text-neutral-900">
                          {formatVND(cashRevenue)}đ / {formatVND(transferRevenue)}đ
                        </span>
                      </div>
                      <div className="w-full h-3 rounded-full bg-neutral-200 overflow-hidden flex">
                        <div
                          style={{ width: `${cashPercentage}%` }}
                          className="h-full bg-emerald-500 transition-all duration-500"
                          title={`Tiền mặt: ${cashPercentage}%`}
                        />
                        <div
                          style={{ width: `${transferPercentage}%` }}
                          className="h-full bg-indigo-500 transition-all duration-500"
                          title={`Chuyển khoản: ${transferPercentage}%`}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] text-neutral-500">
                        <span>Tiền mặt: {cashOrders.length} đơn ({cashPercentage}%)</span>
                        <span>Chuyển khoản: {transferOrders.length} đơn ({transferPercentage}%)</span>
                      </div>
                    </div>

                    {/* Bar 2: Doanh Thu so với Chi Phí & Lợi Nhuận */}
                    <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-100 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-neutral-700">Tỷ suất Lợi nhuận / Doanh thu</span>
                        <span className={`font-mono font-bold ${netProfit >= 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                          {profitRatio}% Lợi nhuận
                        </span>
                      </div>
                      <div className="w-full h-3 rounded-full bg-neutral-200 overflow-hidden flex">
                        <div
                          style={{ width: `${profitRatio}%` }}
                          className={`h-full ${netProfit >= 0 ? 'bg-emerald-500' : 'bg-amber-500'} transition-all duration-500`}
                          title={`Lợi nhuận: ${profitRatio}%`}
                        />
                        <div
                          style={{ width: `${expenseRatio}%` }}
                          className="h-full bg-red-400 transition-all duration-500"
                          title={`Chi phí: ${expenseRatio}%`}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] text-neutral-500">
                        <span>Chi phí: {formatVND(totalExpenses)}đ</span>
                        <span>Lợi nhuận: {formatVND(netProfit)}đ</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Add Expense Form (Read-only banner for Viewer) */}
                {isViewer ? (
                  <div className="p-4 rounded-2xl bg-blue-50/90 border border-blue-200 text-blue-900 text-xs flex items-center gap-3 shadow-xs">
                    <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
                    <div>
                      <h5 className="font-bold text-blue-950">Chế độ phân quyền: Xem Sổ Sách (Read-only)</h5>
                      <p className="text-blue-800 text-[11px] mt-0.5">
                        Tài khoản của bạn chỉ có quyền tra cứu, xem báo cáo doanh thu & chi phí. Không có quyền lập phiếu chi, sửa hoặc xóa dữ liệu.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-sm">
                    <h4 className="text-sm font-bold text-neutral-900 mb-3 flex items-center gap-2">
                      <Plus className="w-4 h-4 text-red-600" />
                      Thêm Khoản Chi Mới (Phiếu Chi Tiền Mặt)
                    </h4>
                    <form onSubmit={handleAddExpense} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <input
                        type="text"
                        value={newExpenseTitle}
                        onChange={(e) => setNewExpenseTitle(e.target.value)}
                        placeholder="Khoản chi (VD: Mua đá, cà phê mộc...)"
                        required
                        className="px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:border-red-500"
                      />
                      <input
                        type="number"
                        value={newExpenseAmount}
                        onChange={(e) => setNewExpenseAmount(e.target.value)}
                        placeholder="Số tiền chi (VND)..."
                        required
                        className="px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:border-red-500"
                      />
                      <select
                        value={newExpenseCategory}
                        onChange={(e) => setNewExpenseCategory(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:border-red-500 bg-white"
                      >
                        <option value="nguyen_lieu">Nguyên liệu (Cà phê, sữa, trà)</option>
                        <option value="bao_bi">Bao bì & Ly mang đi</option>
                        <option value="dien_nuoc">Điện, Nước & Wifi</option>
                        <option value="nhan_cong">Nhân công & Phụ cấp</option>
                        <option value="khac">Chi phí khác</option>
                      </select>
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer"
                      >
                        Lập Phiếu Chi
                      </button>
                    </form>
                  </div>
                )}

                {/* Order List & Expense Slips List */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Order List */}
                  <div className="p-4 rounded-2xl bg-white border border-neutral-200 shadow-sm flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
                        Lịch Sử Đơn Hàng ({filteredOrders.length})
                      </h4>
                      <span className="text-[11px] text-neutral-400 font-mono">
                        {filteredOrders.filter(o => o.paymentMethod === 'transfer').length} CK • {filteredOrders.filter(o => o.paymentMethod !== 'transfer').length} TM
                      </span>
                    </div>
                    <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                      {filteredOrders.length === 0 ? (
                        <div className="py-12 text-center text-neutral-400 text-xs flex flex-col items-center justify-center gap-1.5">
                          <Calendar className="w-5 h-5 text-neutral-300" />
                          <span>Chưa có đơn hàng nào trong {getFilterShortLabel(revenueQuickFilter, selectedYear, selectedMonth).toLowerCase()}</span>
                        </div>
                      ) : (
                        filteredOrders.map((o) => (
                          <div
                            key={o.id}
                            className="p-3 rounded-xl border border-neutral-200 bg-neutral-50 hover:bg-neutral-100/80 transition-all space-y-2 text-xs"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold font-mono text-blue-700">#{o.code}</span>
                                  <span className="text-neutral-500 font-medium">({o.type === 'takeaway' ? 'Mang đi' : `Bàn ${o.tableNumber || 'B01'}`})</span>
                                  {o.paymentMethod === 'transfer' ? (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-300/80 flex items-center gap-1 font-mono">
                                      <QrCode className="w-3 h-3" /> Chuyển khoản
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300/80 flex items-center gap-1 font-mono">
                                      <Banknote className="w-3 h-3" /> Tiền mặt
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-neutral-500 mt-1 flex items-center gap-2">
                                  <span>NV: <strong>{o.staffName}</strong></span>
                                  <span>•</span>
                                  <span>{new Date(o.createdAt).toLocaleTimeString('vi-VN')} {new Date(o.createdAt).toLocaleDateString('vi-VN')}</span>
                                  <span>•</span>
                                  <span className="font-semibold text-neutral-700">{o.items.reduce((s, i) => s + i.quantity, 0)} món</span>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <span className="font-black text-sm text-neutral-900 font-mono">
                                  {formatVND(o.total)}đ
                                </span>
                              </div>
                            </div>

                            {/* Action Row: Nút "Xem lại hóa đơn", Nút "In lại tem", Nút Xóa */}
                            <div className="pt-2 border-t border-neutral-200 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                {/* 1. Nút "Xem lại hóa đơn" (Preview bill) */}
                                <button
                                  onClick={() => handlePreviewOrderBill(o)}
                                  className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                                  title="Xem lại hóa đơn (Preview bill)"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Xem bill</span>
                                </button>

                                {/* 2. Nút "In lại tem" (Re-print label) */}
                                <button
                                  onClick={() => handleReprintOrderLabels(o)}
                                  className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                                  title="In lại tem dán ly 50x30mm (Re-print label)"
                                >
                                  <Tag className="w-3.5 h-3.5" />
                                  <span>In lại tem</span>
                                </button>
                              </div>

                              {/* 3. Nút Xóa (Chỉ dành cho Admin, ẩn với nhóm Xem sổ sách) */}
                              {!isViewer && (
                                <button
                                  onClick={() => handleDeleteOrder(o.id)}
                                  className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                  title="Xoá đơn này (Chỉ Admin)"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Expenses List */}
                  <div className="p-4 rounded-2xl bg-white border border-neutral-200 shadow-sm flex flex-col">
                    <h4 className="text-xs font-bold text-neutral-700 uppercase tracking-wider mb-3">
                      Danh Sách Phiếu Chi ({filteredExpenses.length})
                    </h4>
                    <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                      {filteredExpenses.length === 0 ? (
                        <div className="py-12 text-center text-neutral-400 text-xs flex flex-col items-center justify-center gap-1.5">
                          <Calendar className="w-5 h-5 text-neutral-300" />
                          <span>Chưa có phiếu chi nào trong {getFilterShortLabel(revenueQuickFilter, selectedYear, selectedMonth).toLowerCase()}</span>
                        </div>
                      ) : (
                        filteredExpenses.map((e) => (
                          <div
                            key={e.id}
                            className="p-3 rounded-xl border border-neutral-200 bg-neutral-50 flex items-center justify-between text-xs"
                          >
                            <div>
                              <span className="font-bold text-neutral-800">{e.title}</span>
                              <div className="text-[11px] text-neutral-500 mt-0.5">
                                {e.date} • {e.staffName}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-black text-red-600 font-mono">
                                -{formatVND(e.amount)}đ
                              </span>
                              {!isViewer && (
                                <button
                                  onClick={() => handleDeleteExpense(e.id)}
                                  className="p-1 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                  title="Xoá phiếu chi (Chỉ Admin)"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: TÀI KHOẢN NHÂN VIÊN & PHÂN QUYỀN */}
            {activeTab === 'staff' && (
              <div className="space-y-6">
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
                  <div className="font-bold text-amber-950 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-amber-700" />
                    <span>Quy Tắc Phân Quyền Hệ Thống:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-900/90 pl-1">
                    <li><strong>Nhân viên (POS):</strong> Bán hàng tại quầy POS, in tem 50x30, in bill 85mm.</li>
                    <li><strong>Xem sổ sách:</strong> Tự động chuyển hướng thẳng vào màn hình Báo cáo Doanh thu, Chi phí & Lợi nhuận khi đăng nhập. Quyền chỉ xem (Read-only), không được thêm, sửa, xóa bất kỳ dữ liệu nào.</li>
                    <li><strong>Quản trị viên (Admin):</strong> Toàn quyền truy cập cài đặt hệ thống, menu món, cấu hình máy in, phân quyền và quản lý tài chính.</li>
                  </ul>
                </div>

                {/* Add New Staff Account Form */}
                <div className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-sm">
                  <h4 className="text-sm font-bold text-neutral-900 mb-3">Tạo Tài Khoản Mới</h4>
                  <form onSubmit={handleAddStaff} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <input
                      type="text"
                      value={newStaffUser}
                      onChange={(e) => setNewStaffUser(e.target.value)}
                      placeholder="Tên đăng nhập (VD: ketoan)..."
                      required
                      className="px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:border-amber-500"
                    />
                    <input
                      type="text"
                      value={newStaffName}
                      onChange={(e) => setNewStaffName(e.target.value)}
                      placeholder="Họ tên nhân viên..."
                      required
                      className="px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:border-amber-500"
                    />
                    <input
                      type="password"
                      value={newStaffPass}
                      onChange={(e) => setNewStaffPass(e.target.value)}
                      placeholder="Mật khẩu..."
                      required
                      className="px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:border-amber-500"
                    />
                    <div className="flex gap-2">
                      <select
                        value={newStaffRole}
                        onChange={(e) => setNewStaffRole(e.target.value as any)}
                        className="flex-1 px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:border-amber-500 bg-white"
                      >
                        <option value="staff">Nhân viên bán hàng (POS)</option>
                        <option value="viewer">Xem sổ sách (Chỉ xem Báo cáo)</option>
                        <option value="admin">Quản trị viên (Admin)</option>
                      </select>
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-black font-bold text-xs shadow-sm transition-colors cursor-pointer"
                      >
                        Thêm
                      </button>
                    </div>
                  </form>
                </div>

                {/* Existing Accounts Table */}
                <div className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-sm">
                  <h4 className="text-sm font-bold text-neutral-900 mb-3">
                    Danh Sách Tài Khoản ({state.users.length})
                  </h4>
                  <div className="space-y-3">
                    {state.users.map((u) => (
                      <div
                        key={u.id}
                        className="p-3.5 rounded-xl border border-neutral-200 bg-neutral-50 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                            u.role === 'admin'
                              ? 'bg-amber-600 text-black'
                              : u.role === 'viewer'
                              ? 'bg-blue-600 text-white'
                              : 'bg-neutral-800 text-white'
                          }`}>
                            {u.role === 'admin' ? 'AD' : u.role === 'viewer' ? 'KT' : 'NV'}
                          </div>
                          <div>
                            <h5 className="font-bold text-neutral-900">{u.name}</h5>
                            <span className="text-neutral-500 font-mono">
                              @{u.username} • {
                                u.role === 'admin'
                                  ? 'Quản trị viên (Toàn quyền)'
                                  : u.role === 'viewer'
                                  ? 'Xem sổ sách (Read-only)'
                                  : 'Nhân viên bán hàng'
                              }
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[11px] bg-neutral-200 px-2 py-0.5 rounded font-mono">
                            Pass: ••••••
                          </span>
                          <button
                            onClick={() => handleDeleteStaff(u.id)}
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Xoá tài khoản này"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: THIẾT LẬP MÁY IN (mayin.jpg) */}
            {activeTab === 'printers' && (
              <div className="space-y-6">
                {/* CARD 1: Cổng Kết Nối WebSocket QZ Tray */}
                <div className="p-5 rounded-2xl bg-[#181614] border border-neutral-800 shadow-xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl border ${
                        bridgeStatus === 'connected'
                          ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400'
                          : 'bg-neutral-900 border-neutral-700 text-neutral-400'
                      }`}>
                        <Wifi className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5">
                          <h4 className="text-sm font-bold text-white">Local Print Bridge (WebSocket Trực Tiếp)</h4>
                          {bridgeStatus === 'connected' ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                              ● Đã kết nối ws://localhost:13579
                            </span>
                          ) : bridgeStatus === 'connecting' || isCheckingBridge ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-950/70 border border-amber-500/50 text-amber-300">
                              Đang kiểm tra kết nối...
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-950/70 border border-red-500/50 text-red-300">
                              ○ Chưa kết nối Print Bridge
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-400 mt-0.5">
                          Ứng dụng kết nối trực tiếp đến <strong className="text-neutral-200">print-bridge.exe</strong> tại cổng <strong className="text-amber-400 font-mono">ws://localhost:13579</strong> để truyền lệnh in byte trực tiếp tới máy in qua mạng LAN.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleRefreshPrinters}
                      disabled={isCheckingBridge}
                      className="px-3.5 py-1.5 rounded-xl bg-[#221f1d] hover:bg-[#2c2724] border border-neutral-700 text-neutral-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto shrink-0"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-neutral-400 ${isCheckingBridge ? 'animate-spin' : ''}`} />
                      <span>{isCheckingBridge ? 'Đang kiểm tra...' : 'Kiểm tra Print Bridge'}</span>
                    </button>
                  </div>

                  {/* Offline Warning Notice */}
                  {bridgeStatus !== 'connected' && (
                    <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-800/80 text-xs text-red-200 flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block text-red-300 mb-0.5">Không thể kết nối tới Print Bridge:</span>
                        <span>{ERROR_BRIDGE_NOT_RUNNING}</span>
                      </div>
                    </div>
                  )}

                  {/* 2 Status Boxes */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    {/* Bill status */}
                    <div className={`border rounded-xl p-3.5 flex items-start gap-3 transition-colors ${
                      bridgeStatus === 'connected'
                        ? 'bg-[#0f241a] border-emerald-800/80'
                        : 'bg-[#141210] border-neutral-800'
                    }`}>
                      {bridgeStatus === 'connected' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-cyan-500 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">Máy in Hóa đơn (Bill)</span>
                          <span className="text-xs font-mono font-bold text-cyan-400">
                            {printerForm.billPrinterIp || '192.168.1.79'}:{printerForm.billPrinterPort || 9100}
                          </span>
                        </div>
                        <div className={`text-[11px] mt-0.5 ${
                          bridgeStatus === 'connected' ? 'text-emerald-400' : 'text-neutral-400'
                        }`}>
                          {bridgeStatus === 'connected'
                            ? `● Sẵn sàng gửi lệnh in RAW ESC/POS tới ${printerForm.billPrinterIp || '192.168.1.79'}`
                            : 'Bật print-bridge.exe để kích hoạt in LAN'}
                        </div>
                      </div>
                    </div>

                    {/* Label status */}
                    <div className={`border rounded-xl p-3.5 flex items-start gap-3 transition-colors ${
                      bridgeStatus === 'connected'
                        ? 'bg-[#0f241a] border-emerald-800/80'
                        : 'bg-[#141210] border-neutral-800'
                    }`}>
                      {bridgeStatus === 'connected' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">Máy in Tem dán ly (50x30mm)</span>
                          <span className="text-xs font-mono font-bold text-amber-400">
                            {printerForm.labelPrinterIp || '192.168.1.52'}:{printerForm.labelPrinterPort || 9100}
                          </span>
                        </div>
                        <div className={`text-[11px] mt-0.5 ${
                          bridgeStatus === 'connected' ? 'text-emerald-400' : 'text-neutral-400'
                        }`}>
                          {bridgeStatus === 'connected'
                            ? `● Sẵn sàng gửi lệnh in TSPL/ESC/POS tới ${printerForm.labelPrinterIp || '192.168.1.52'}`
                            : 'Bật print-bridge.exe để kích hoạt in LAN'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* WebSocket Bridge address configuration */}
                  <div className="p-3 rounded-xl bg-[#11100f] border border-neutral-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-400 font-semibold">Địa chỉ Print Bridge Local Service:</span>
                      <input
                        type="text"
                        value={printerForm.bridgeWsUrl || DEFAULT_BRIDGE_WS_URL}
                        onChange={(e) => setPrinterForm({ ...printerForm, bridgeWsUrl: e.target.value })}
                        placeholder="ws://localhost:13579"
                        className="px-3 py-1 rounded bg-[#181614] border border-neutral-700 text-amber-400 text-xs font-mono font-bold focus:border-amber-500 focus:outline-none w-56"
                      />
                    </div>
                    <span className="text-[11px] text-neutral-500">
                      Chuẩn kết nối: Payload JSON action &quot;print_lan&quot;
                    </span>
                  </div>
                </div>

                {/* CARD 2: Máy In Hóa Đơn Thanh Toán (Bill Printer) */}
                <div className="p-5 rounded-2xl bg-[#181614] border border-neutral-800 shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-400">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">Máy In Hóa Đơn Thanh Toán (Bill Printer)</h4>
                        <p className="text-xs text-neutral-400">
                          Khổ giấy chuẩn 85mm • In qua Local Print Bridge trực tiếp tới IP máy in LAN
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-cyan-950/60 border border-cyan-500/40 text-cyan-300">
                      Khổ 85mm
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">
                        Tên / Model máy in hóa đơn
                      </label>
                      <input
                        type="text"
                        value={printerForm.billPrinterName || 'XP-80C (Bill LAN)'}
                        onChange={(e) => setPrinterForm({ ...printerForm, billPrinterName: e.target.value })}
                        placeholder="Ví dụ: XP-80C..."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#11100f] border border-neutral-700 text-white text-xs font-semibold focus:border-cyan-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">
                        Địa chỉ IP Máy In Bill (Mạng LAN)
                      </label>
                      <input
                        type="text"
                        value={printerForm.billPrinterIp}
                        onChange={(e) => setPrinterForm({ ...printerForm, billPrinterIp: e.target.value })}
                        placeholder="192.168.1.79"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#11100f] border border-neutral-700 text-cyan-400 text-xs font-mono font-bold focus:border-cyan-500 focus:outline-none"
                      />
                      <span className="block text-[11px] text-neutral-500 mt-1">
                        Mặc định quán: 192.168.1.79 (Cổng 9100)
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">
                        Khổ giấy in hóa đơn
                      </label>
                      <select
                        value={printerForm.billPaperWidthMm || 85}
                        onChange={(e) => setPrinterForm({ ...printerForm, billPaperWidthMm: parseInt(e.target.value) || 85 })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#11100f] border border-neutral-700 text-white text-xs font-medium focus:border-cyan-500 focus:outline-none"
                      >
                        <option value={85}>85mm (Tiêu chuẩn HongKong Cổ Trấn)</option>
                        <option value={80}>80mm (Khổ nhiệt phổ biến)</option>
                        <option value={58}>58mm (Khổ nhỏ mini)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">
                        Cổng kết nối (Port)
                      </label>
                      <input
                        type="number"
                        value={printerForm.billPrinterPort || 9100}
                        onChange={(e) => setPrinterForm({ ...printerForm, billPrinterPort: parseInt(e.target.value) || 9100 })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#11100f] border border-neutral-700 text-white text-xs font-mono focus:border-cyan-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">
                        Số liên in khi thanh toán
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={5}
                        value={printerForm.billCopies || 1}
                        onChange={(e) => setPrinterForm({ ...printerForm, billCopies: parseInt(e.target.value) || 1 })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#11100f] border border-neutral-700 text-white text-xs font-mono focus:border-cyan-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">
                        Chế độ in
                      </label>
                      <select
                        value={printerForm.printMode === 'browser' ? 'browser' : 'bridge'}
                        onChange={(e) => setPrinterForm({ ...printerForm, printMode: e.target.value as any })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#11100f] border border-neutral-700 text-white text-xs font-medium focus:border-cyan-500 focus:outline-none"
                      >
                        <option value="bridge">In trực tiếp qua Print Bridge (ws://localhost:13579 - Khuyên dùng)</option>
                        <option value="browser">In qua Trình duyệt (Hộp thoại in hệ thống)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleTestPrintBill}
                      className="px-4 py-2 rounded-xl bg-[#0e2a33] hover:bg-[#133845] border border-cyan-500/50 text-cyan-300 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      <span>In thử Hóa đơn (192.168.1.79)</span>
                    </button>
                  </div>
                </div>

                {/* CARD 3: Máy In Tem Dán Ly (Label Printer) */}
                <div className="p-5 rounded-2xl bg-[#181614] border border-neutral-800 shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-400">
                        <Tag className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">Máy In Tem Dán Ly (Label Printer)</h4>
                        <p className="text-xs text-neutral-400">
                          Khổ tem chuẩn 50mm x 30mm (ngang) • In dán từng ly nước qua Local Print Bridge
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-950/60 border border-amber-500/40 text-amber-300">
                      Khổ 50mm x 30mm
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">
                        Tên / Model máy in tem
                      </label>
                      <input
                        type="text"
                        value={printerForm.labelPrinterName || 'XP-350B (Tem LAN)'}
                        onChange={(e) => setPrinterForm({ ...printerForm, labelPrinterName: e.target.value })}
                        placeholder="Ví dụ: Xprinter XP-350B..."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#11100f] border border-neutral-700 text-white text-xs font-semibold focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">
                        Địa chỉ IP Máy in tem (Mạng LAN)
                      </label>
                      <input
                        type="text"
                        value={printerForm.labelPrinterIp}
                        onChange={(e) => setPrinterForm({ ...printerForm, labelPrinterIp: e.target.value })}
                        placeholder="192.168.1.52"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#11100f] border border-neutral-700 text-amber-400 text-xs font-mono font-bold focus:border-amber-500 focus:outline-none"
                      />
                      <span className="block text-[11px] text-neutral-500 mt-1">
                        Mặc định quán: 192.168.1.52 (Cổng 9100)
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">
                        Kích thước tem nhãn
                      </label>
                      <select
                        value={`${printerForm.labelWidthMm || 50}x${printerForm.labelHeightMm || 30}`}
                        onChange={(e) => {
                          const [w, h] = e.target.value.split('x').map(n => parseInt(n));
                          setPrinterForm({
                            ...printerForm,
                            labelWidthMm: w || 50,
                            labelHeightMm: h || 30,
                          });
                        }}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#11100f] border border-neutral-700 text-white text-xs font-medium focus:border-amber-500 focus:outline-none"
                      >
                        <option value="50x30">50mm x 30mm (Chuẩn tem ngang HongKong Cổ Trấn)</option>
                        <option value="40x30">40mm x 30mm (Tem vuông nhỏ)</option>
                        <option value="50x40">50mm x 40mm</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">
                        Định dạng lệnh in tem
                      </label>
                      <select
                        value={printerForm.labelCommandType || 'tspl'}
                        onChange={(e) => setPrinterForm({ ...printerForm, labelCommandType: e.target.value as any })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#11100f] border border-neutral-700 text-white text-xs font-medium focus:border-amber-500 focus:outline-none"
                      >
                        <option value="tspl">TSPL (Chuẩn cho Xprinter XP-350B, có căn khoảng cách Gap)</option>
                        <option value="escpos">ESC/POS (Raster bitmap)</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">
                        Quy tắc in khi Thanh toán
                      </label>
                      <div className="p-3 rounded-xl bg-[#11100f] border border-neutral-700/80 space-y-1.5">
                        <label className="flex items-start gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={printerForm.printBothOnCheckout !== false}
                            onChange={(e) => setPrinterForm({ ...printerForm, printBothOnCheckout: e.target.checked })}
                            className="mt-0.5 rounded bg-neutral-800 border-neutral-600 text-amber-500 w-4 h-4 cursor-pointer"
                          />
                          <span className="text-xs font-bold text-amber-400">
                            In Hóa đơn ({printerForm.billPrinterIp || '192.168.1.79'}) và In Tem ly ({printerForm.labelPrinterIp || '192.168.1.52'}) cùng lúc khi nhấn Thanh toán (F1)
                          </span>
                        </label>
                        <p className="text-[11px] text-neutral-400 leading-relaxed pl-6.5">
                          Khi thu ngân bấm phím Thanh toán (F1), hệ thống tự động gửi 2 gói tin WebSocket song song tới Print Bridge: một gói cho Máy in Bill ({printerForm.billPrinterIp || '192.168.1.79'}) và một gói cho Máy in Tem ({printerForm.labelPrinterIp || '192.168.1.52'}).
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleTestPrintLabel}
                      className="px-4 py-2 rounded-xl bg-[#2a1b12] hover:bg-[#382317] border border-amber-500/50 text-amber-300 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      <span>In thử Tem dán ly (192.168.1.52)</span>
                    </button>
                  </div>
                </div>

                {/* SAVE BUTTON FOR PRINTER SETTINGS */}
                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleSaveAllPrinterSettings}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs shadow-lg shadow-orange-950/40 flex items-center gap-2 cursor-pointer transition-all"
                  >
                    <Check className="w-4 h-4" />
                    <span>Lưu Cài Đặt Máy In</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 4: MẪU IN BILL (85mm - inbill.jpg) */}
            {activeTab === 'bill_template' && (
              <div className="space-y-4">
                {/* Top preview bar matching inbill.jpg */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
                    <Eye className="w-4 h-4" />
                    <span>👁 Xem trước bản in (Khổ 85mm):</span>
                  </div>
                  <div className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1.5">
                    <span className="text-neutral-400">Máy in:</span>
                    <span>{printerForm.billPrinterIp || '192.168.1.79'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Column: Form Settings (inbill.jpg) */}
                  <div className="lg:col-span-6 bg-[#181614] rounded-2xl border border-neutral-800 p-6 space-y-4 shadow-xl">
                    <div>
                      <h4 className="text-base font-bold text-white">Cấu Hình Mẫu Hóa Đơn 85mm</h4>
                      <p className="text-xs text-neutral-400 mt-1">
                        Nội dung in ra máy in hóa đơn thanh toán (Mô phỏng hóa đơn thực tế)
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">
                        Tên quán / Thương hiệu
                      </label>
                      <input
                        type="text"
                        value={billForm.shopName}
                        onChange={(e) => setBillForm({ ...billForm, shopName: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#11100f] border border-neutral-700 text-white text-xs font-semibold focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-neutral-300 mb-1">
                          Địa chỉ
                        </label>
                        <input
                          type="text"
                          value={billForm.address}
                          onChange={(e) => setBillForm({ ...billForm, address: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#11100f] border border-neutral-700 text-white text-xs focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-neutral-300 mb-1">
                          Số điện thoại / Hotline
                        </label>
                        <input
                          type="text"
                          value={billForm.phone}
                          onChange={(e) => setBillForm({ ...billForm, phone: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#11100f] border border-neutral-700 text-white text-xs focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">
                        Tiêu đề hóa đơn
                      </label>
                      <input
                        type="text"
                        value={billForm.billTitle}
                        onChange={(e) => setBillForm({ ...billForm, billTitle: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#11100f] border border-neutral-700 text-white text-xs font-semibold focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">
                        Ghi chú chân trang (Theo bill mẫu quán)
                      </label>
                      <input
                        type="text"
                        value={billForm.tableNotice}
                        onChange={(e) => setBillForm({ ...billForm, tableNotice: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#11100f] border border-neutral-700 text-white text-xs focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-neutral-300 mb-1">
                          Tên Wifi
                        </label>
                        <input
                          type="text"
                          value={billForm.wifiSsid}
                          onChange={(e) => setBillForm({ ...billForm, wifiSsid: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#11100f] border border-neutral-700 text-white text-xs font-mono focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-neutral-300 mb-1">
                          Mật khẩu Wifi
                        </label>
                        <input
                          type="text"
                          value={billForm.wifiPass}
                          onChange={(e) => setBillForm({ ...billForm, wifiPass: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#11100f] border border-neutral-700 text-white text-xs font-mono focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">
                        Lời chào chân trang
                      </label>
                      <input
                        type="text"
                        value={billForm.footerMessage}
                        onChange={(e) => setBillForm({ ...billForm, footerMessage: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#11100f] border border-neutral-700 text-white text-xs focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-2 pt-1 border-t border-neutral-800">
                      <label className="flex items-center gap-2.5 text-xs text-neutral-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={billForm.printDateTime !== false}
                          onChange={(e) => setBillForm({ ...billForm, printDateTime: e.target.checked })}
                          className="rounded bg-neutral-800 border-neutral-600 text-amber-500 w-4 h-4 cursor-pointer"
                        />
                        <span>In ngày giờ xuất bill</span>
                      </label>
                      <label className="flex items-center gap-2.5 text-xs text-neutral-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={billForm.printCashier !== false}
                          onChange={(e) => setBillForm({ ...billForm, printCashier: e.target.checked })}
                          className="rounded bg-neutral-800 border-neutral-600 text-amber-500 w-4 h-4 cursor-pointer"
                        />
                        <span>In tên thu ngân phụ trách</span>
                      </label>
                    </div>

                    {/* CẤU HÌNH MÃ QR THANH TOÁN ĐỘNG (VIETQR) - Yêu cầu 5 */}
                    <div className="pt-3 border-t border-neutral-800 space-y-3.5 bg-neutral-900/60 p-4 rounded-xl border border-neutral-700/60">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <QrCode className="w-4 h-4 text-amber-400" />
                          <h5 className="text-xs font-bold text-white uppercase tracking-wider">
                            Cấu Hình Mã QR Động (VietQR) Trên Bill
                          </h5>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={billForm.vietQr?.enabled !== false}
                            onChange={(e) => setBillForm({
                              ...billForm,
                              vietQr: {
                                ...(billForm.vietQr || {
                                  bankId: 'MB',
                                  bankName: 'MBBank - Ngân hàng Quân Đội',
                                  accountNo: '',
                                  accountName: '',
                                  template: 'compact2',
                                  transferSyntax: 'DH {code}',
                                }),
                                enabled: e.target.checked,
                              }
                            })}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
                        </label>
                      </div>

                      <div className="text-[11px] text-neutral-300 space-y-1">
                        <p className="text-amber-400 font-semibold">
                          ✓ Tự động điền số tiền chính xác bằng tổng đơn khi quét mã.
                        </p>
                        <p className="text-neutral-400">
                          * ĐIỀU KIỆN HIỂN THỊ: Mã QR chỉ tự động in ra khi thu ngân chọn phương thức <strong>"Chuyển khoản"</strong> tại quầy.
                        </p>
                      </div>

                      {billForm.vietQr?.enabled !== false && (
                        <div className="space-y-3 pt-1 border-t border-neutral-800/80">
                          {/* Ngân hàng thụ hưởng */}
                          <div>
                            <label className="block text-xs font-semibold text-neutral-300 mb-1">
                              Ngân hàng nhận tiền
                            </label>
                            <select
                              value={billForm.vietQr?.bankId || 'MB'}
                              onChange={(e) => {
                                const selectedBank = VIETNAMESE_BANKS.find(b => b.code === e.target.value);
                                setBillForm({
                                  ...billForm,
                                  vietQr: {
                                    ...(billForm.vietQr || {
                                      accountNo: '',
                                      accountName: '',
                                      enabled: true,
                                      template: 'compact2',
                                      transferSyntax: 'DH {code}',
                                    }),
                                    bankId: e.target.value,
                                    bankName: selectedBank ? selectedBank.name : e.target.value,
                                  }
                                });
                              }}
                              className="w-full px-3 py-2 rounded-xl bg-[#11100f] border border-neutral-700 text-white text-xs focus:border-amber-500 focus:outline-none cursor-pointer"
                            >
                              {VIETNAMESE_BANKS.map(b => (
                                <option key={b.code} value={b.code}>
                                  {b.shortName} - {b.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Số tài khoản & Tên chủ TK */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                                Số tài khoản (STK)
                              </label>
                              <input
                                type="text"
                                value={billForm.vietQr?.accountNo || ''}
                                onChange={(e) => setBillForm({
                                  ...billForm,
                                  vietQr: {
                                    ...(billForm.vietQr || {
                                      bankId: 'MB',
                                      bankName: 'MBBank - Ngân hàng Quân Đội',
                                      enabled: true,
                                      template: 'compact2',
                                      transferSyntax: 'DH {code}',
                                      accountName: '',
                                    }),
                                    accountNo: e.target.value.trim(),
                                  }
                                })}
                                placeholder="VD: 0336730797"
                                className="w-full px-3 py-2 rounded-xl bg-[#11100f] border border-neutral-700 text-white text-xs font-mono focus:border-amber-500 focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                                Tên chủ tài khoản
                              </label>
                              <input
                                type="text"
                                value={billForm.vietQr?.accountName || ''}
                                onChange={(e) => setBillForm({
                                  ...billForm,
                                  vietQr: {
                                    ...(billForm.vietQr || {
                                      bankId: 'MB',
                                      bankName: 'MBBank - Ngân hàng Quân Đội',
                                      enabled: true,
                                      accountNo: '',
                                      template: 'compact2',
                                      transferSyntax: 'DH {code}',
                                    }),
                                    accountName: e.target.value.toUpperCase(),
                                  }
                                })}
                                placeholder="VD: HONGKONG CO TRAN"
                                className="w-full px-3 py-2 rounded-xl bg-[#11100f] border border-neutral-700 text-white text-xs font-semibold focus:border-amber-500 focus:outline-none"
                              />
                            </div>
                          </div>

                          {/* Cú pháp nội dung chuyển khoản */}
                          <div>
                            <label className="block text-xs font-semibold text-neutral-300 mb-1">
                              Cú pháp nội dung chuyển khoản
                            </label>
                            <input
                              type="text"
                              value={billForm.vietQr?.transferSyntax || 'DH {code}'}
                              onChange={(e) => setBillForm({
                                ...billForm,
                                vietQr: {
                                  ...(billForm.vietQr || {
                                    bankId: 'MB',
                                    bankName: 'MBBank - Ngân hàng Quân Đội',
                                    accountNo: '',
                                    accountName: '',
                                    enabled: true,
                                    template: 'compact2',
                                  }),
                                  transferSyntax: e.target.value,
                                }
                              })}
                              placeholder="VD: DH {code}"
                              className="w-full px-3 py-2 rounded-xl bg-[#11100f] border border-neutral-700 text-white text-xs font-mono focus:border-amber-500 focus:outline-none"
                            />
                            <p className="text-[10px] text-neutral-400 mt-1">
                              Ký hiệu <code>&#123;code&#125;</code> sẽ tự động thay bằng mã đơn hàng (Ví dụ: <code>DH T45326</code>).
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={handleSaveBillTemplate}
                        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs shadow-lg flex items-center gap-2 cursor-pointer transition-all"
                      >
                        <Check className="w-4 h-4" />
                        <span>Lưu Mẫu Hóa Đơn & Cấu Hình VietQR</span>
                      </button>
                    </div>
                  </div>

                  {/* Right Column: Realtime Canvas Preview (inbill.jpg) */}
                  <div className="lg:col-span-6 flex flex-col items-center justify-start bg-[#12100e] p-5 rounded-2xl border border-neutral-800 shadow-inner space-y-3">
                    {/* Method Preview Switcher */}
                    <div className="w-full flex items-center justify-between bg-neutral-900 p-1.5 rounded-xl border border-neutral-800 text-xs">
                      <span className="text-[11px] text-neutral-400 pl-2 font-medium">Chế độ xem trước:</span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setBillPreviewMethod('transfer')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            billPreviewMethod === 'transfer'
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-neutral-400 hover:text-white'
                          }`}
                        >
                          Chuyển khoản (Có VietQR)
                        </button>
                        <button
                          type="button"
                          onClick={() => setBillPreviewMethod('cash')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            billPreviewMethod === 'cash'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-neutral-400 hover:text-white'
                          }`}
                        >
                          Tiền mặt (Không QR)
                        </button>
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded-md shadow-2xl border border-neutral-300">
                      <div ref={billPreviewRef} className="flex justify-center" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: MẪU IN TEM (50x30mm) */}
            {activeTab === 'label_template' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-6 space-y-4 bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm">
                  <h4 className="text-sm font-bold text-neutral-900 border-b pb-2">
                    Cấu Hình Mẫu Tem Dán Ly (50x30mm)
                  </h4>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">Tiền tố số thứ tự ly</label>
                    <input
                      type="text"
                      value={state.labelTemplate.headerPrefix}
                      onChange={(e) =>
                        onUpdateState({
                          ...state,
                          labelTemplate: { ...state.labelTemplate, headerPrefix: e.target.value },
                        })
                      }
                      placeholder="VD: Ly"
                      className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Ghi chú chung ở hàng dưới cùng
                    </label>
                    <input
                      type="text"
                      value={state.labelTemplate.footerNote}
                      onChange={(e) =>
                        onUpdateState({
                          ...state,
                          labelTemplate: { ...state.labelTemplate, footerNote: e.target.value },
                        })
                      }
                      placeholder="VD: HongKong Cổ Trấn - Chúc ngon miệng"
                      className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs"
                    />
                  </div>

                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-950 space-y-1.5">
                    <p className="font-bold flex items-center gap-1.5 text-amber-900">
                      <CheckCircle2 className="w-4 h-4 text-amber-700" />
                      Quy tắc in tem nhãn (Đã bỏ hiển thị giá):
                    </p>
                    <p>• <strong>Hàng trên cùng:</strong> Số thứ tự ly [1/3] • Mã đơn hàng (chữ nhỏ gọn)</p>
                    <p>• <strong>Hàng trung tâm:</strong> Tên món (in to, rõ ràng)</p>
                    <p className="text-emerald-700 font-semibold">
                      • <strong>Tuyệt đối KHÔNG hiển thị giá món trên tem</strong> (Theo yêu cầu chuẩn hóa)
                    </p>
                    <p>• <strong>Hàng dưới:</strong> Ghi chú món (* ít đá, ít ngọt...)</p>
                    <p>• <strong>Hàng dưới cùng:</strong> Lời chúc quán cà phê & ngày giờ</p>
                  </div>
                </div>

                {/* Realtime Label Preview */}
                <div className="lg:col-span-6 flex flex-col items-center justify-start bg-neutral-200 p-4 rounded-2xl border border-neutral-300">
                  <span className="text-xs font-bold text-neutral-600 mb-2 uppercase">
                    Bản Xem Trước Tem Khổ 50mm x 30mm (Không Giá)
                  </span>
                  <div ref={labelPreviewRef} className="w-full max-w-sm" />
                </div>
              </div>
            )}

            {/* TAB 6: QUẢN LÝ THỰC ĐƠN & MÓN */}
            {activeTab === 'menu' && (
              <div className="space-y-6">
                {/* QUẢN LÝ DANH MỤC MÓN & CẤU HÌNH IN TEM (Rule: In tem khi chế biến/gọi món) */}
                <div className="p-5 rounded-2xl bg-[#181614] border border-neutral-800 shadow-xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                        <Layers className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                          <span>Quản Lý Danh Mục Món & Cấu Hình In Tem</span>
                          <span className="text-[10px] font-mono font-normal normal-case bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full">
                            Quy tắc in nhãn 50x30mm
                          </span>
                        </h4>
                        <p className="text-xs text-neutral-400 mt-0.5">
                          Phân loại danh mục để hệ thống tự động in tem hoặc bỏ qua (tránh lãng phí tem cho muỗng, đũa, khăn, đồ mặc...)
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-neutral-400">
                        Tổng số: <strong className="text-amber-400 font-mono">{currentCategoryConfigs.length}</strong> danh mục
                      </span>
                    </div>
                  </div>

                  {/* Form Tạo Mới Danh Mục Món (Có Toggle In Tem Mặc định theo Loại) */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleAddCategory();
                    }}
                    className="p-4 rounded-xl bg-[#11100f] border border-neutral-800 space-y-3"
                  >
                    <div className="text-xs font-bold text-neutral-300 flex items-center gap-1.5 uppercase">
                      <Plus className="w-3.5 h-3.5 text-amber-400" />
                      <span>Thêm Danh Mục Mới</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                      {/* Tên Danh Mục */}
                      <div className="md:col-span-4">
                        <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                          Tên danh mục <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          placeholder="VD: Cà Phê, Trà Sữa, Đồ Dùng..."
                          className="w-full px-3 py-2 rounded-xl bg-[#1b1917] border border-neutral-700 text-white text-xs placeholder:text-neutral-500 focus:outline-none focus:border-amber-500 font-medium"
                          required
                        />
                      </div>

                      {/* Phân loại Loại Danh Mục */}
                      <div className="md:col-span-3">
                        <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                          Phân loại (Loại mục)
                        </label>
                        <select
                          value={newCategoryType}
                          onChange={(e) => handleCategoryTypeChange(e.target.value as CategoryType)}
                          className="w-full px-3 py-2 rounded-xl bg-[#1b1917] border border-neutral-700 text-white text-xs focus:outline-none focus:border-amber-500 font-medium"
                        >
                          <option value="beverage">🧋 Đồ uống (Nước uống)</option>
                          <option value="food">🍲 Đồ ăn (Món ăn)</option>
                          <option value="accessory">🥢 Đồ dùng & Phụ kiện (Muỗng, đũa...)</option>
                          <option value="other">📦 Khác</option>
                        </select>
                      </div>

                      {/* Tùy chọn In Tem Khi Chế Biến / Gọi Món (Có / Không Toggle) */}
                      <div className="md:col-span-5">
                        <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                          In tem khi chế biến/gọi món:
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setNewCategoryPrintLabel(!newCategoryPrintLabel)}
                            className={`flex-1 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center justify-between border transition-all cursor-pointer ${
                              newCategoryPrintLabel
                                ? 'bg-emerald-950/60 border-emerald-500/80 text-emerald-300 shadow-sm shadow-emerald-900/30'
                                : 'bg-neutral-800/80 border-neutral-700 text-neutral-400'
                            }`}
                          >
                            <span className="flex items-center gap-1.5">
                              {newCategoryPrintLabel ? (
                                <Tag className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Ban className="w-3.5 h-3.5 text-neutral-500" />
                              )}
                              <span>
                                In tem: {newCategoryPrintLabel ? 'CÓ IN TEM' : 'KHÔNG IN TEM'}
                              </span>
                            </span>

                            {newCategoryPrintLabel ? (
                              <ToggleRight className="w-5 h-5 text-emerald-400 shrink-0" />
                            ) : (
                              <ToggleLeft className="w-5 h-5 text-neutral-500 shrink-0" />
                            )}
                          </button>

                          <button
                            type="submit"
                            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-black font-bold text-xs flex items-center gap-1.5 shrink-0 transition-all active:scale-95 cursor-pointer shadow-sm"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Thêm</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-1">
                      <span>
                        💡 <strong>Quy tắc tự động:</strong> Chọn <em>Đồ uống</em> hoặc <em>Đồ ăn</em> mặc định sẽ là <strong>Có</strong>. Chọn <em>Đồ dùng/phụ kiện</em> mặc định sẽ là <strong>Không</strong>.
                      </span>
                    </div>
                  </form>

                  {/* BẢNG / DANH SÁCH TẤT CẢ DANH MỤC & CÔNG TẮC IN TEM TRỰC TIẾP */}
                  <div className="rounded-xl border border-neutral-800 overflow-hidden bg-[#11100f]">
                    <div className="px-4 py-2.5 bg-[#161413] border-b border-neutral-800 flex items-center justify-between text-xs font-bold text-neutral-300">
                      <span>Danh Sách Danh Mục ({currentCategoryConfigs.length})</span>
                      <span className="text-[11px] text-neutral-500 font-normal">
                        Bấm trực tiếp vào công tắc để bật/tắt in tem tức thì
                      </span>
                    </div>

                    <div className="divide-y divide-neutral-800/80">
                      {currentCategoryConfigs.map((cat) => {
                        const count = state.menu.filter(
                          m => m.category.toLowerCase() === cat.name.toLowerCase()
                        ).length;

                        return (
                          <div
                            key={cat.id || cat.name}
                            className="p-3 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-neutral-900/60 transition-colors"
                          >
                            {/* Cột 1: Tên Danh mục & Phân loại */}
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                                cat.type === 'beverage'
                                  ? 'bg-blue-900/40 text-blue-400 border border-blue-700/50'
                                  : cat.type === 'food'
                                  ? 'bg-purple-900/40 text-purple-400 border border-purple-700/50'
                                  : 'bg-amber-900/40 text-amber-400 border border-amber-700/50'
                              }`}>
                                {cat.type === 'beverage' ? (
                                  <Coffee className="w-4 h-4" />
                                ) : cat.type === 'food' ? (
                                  <Utensils className="w-4 h-4" />
                                ) : (
                                  <Package className="w-4 h-4" />
                                )}
                              </div>

                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-xs text-white">
                                    {cat.name}
                                  </span>
                                  <span className="text-[10px] bg-neutral-800 text-neutral-400 px-2 py-0.2 rounded-full font-mono">
                                    {count} món
                                  </span>
                                  <span className={`text-[10px] px-2 py-0.2 rounded-full font-medium ${
                                    cat.type === 'beverage'
                                      ? 'bg-blue-950 text-blue-300 border border-blue-800/60'
                                      : cat.type === 'food'
                                      ? 'bg-purple-950 text-purple-300 border border-purple-800/60'
                                      : 'bg-amber-950 text-amber-300 border border-amber-800/60'
                                  }`}>
                                    {cat.type === 'beverage'
                                      ? 'Đồ uống'
                                      : cat.type === 'food'
                                      ? 'Món ăn'
                                      : 'Phụ kiện / Đồ dùng'}
                                  </span>
                                </div>
                                {cat.description && (
                                  <p className="text-[11px] text-neutral-500 mt-0.5">
                                    {cat.description}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Cột 2: CÔNG TẮC IN TEM 1 CHẠM & NÚT XÓA */}
                            <div className="flex items-center gap-3 self-end sm:self-center">
                              {/* 1-Click Toggle Print Label Button */}
                              <button
                                type="button"
                                onClick={() => handleToggleCategoryPrintLabel(cat.id, cat.printLabel !== false)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer ${
                                  cat.printLabel !== false
                                    ? 'bg-emerald-950/60 border-emerald-500/80 text-emerald-300 hover:bg-emerald-900/60'
                                    : 'bg-neutral-800/80 border-neutral-700 text-neutral-400 hover:bg-neutral-800'
                                }`}
                                title="Bấm để chuyển đổi Có in tem hoặc Không in tem"
                              >
                                {cat.printLabel !== false ? (
                                  <>
                                    <Tag className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>In tem: CÓ</span>
                                    <ToggleRight className="w-4 h-4 text-emerald-400" />
                                  </>
                                ) : (
                                  <>
                                    <Ban className="w-3.5 h-3.5 text-neutral-500" />
                                    <span>In tem: KHÔNG</span>
                                    <ToggleLeft className="w-4 h-4 text-neutral-500" />
                                  </>
                                )}
                              </button>

                              {/* Delete button */}
                              <button
                                onClick={() => handleDeleteCategory(cat.name)}
                                className="p-1.5 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-neutral-800 transition-colors cursor-pointer"
                                title={`Xóa danh mục "${cat.name}"`}
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-500">
                    Tổng số {state.menu.length} món trong thực đơn ({allCategories.length} danh mục)
                  </span>
                  <button
                    onClick={() => {
                      setEditingItem({
                        id: 'm_' + Date.now(),
                        name: '',
                        category: allCategories[0] || 'Coffee',
                        price: 60000,
                        image: 'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=400',
                        isAvailable: true,
                        description: '',
                      });
                      setIsAddingNewItem(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Thêm Món Mới
                  </button>
                </div>

                {/* Edit or Add Item Modal/Form with Item-level printLabel override */}
                {(editingItem || isAddingNewItem) && (
                  <div className="p-5 rounded-2xl bg-white border-2 border-blue-500 shadow-md space-y-4">
                    <h4 className="text-sm font-bold text-neutral-900">
                      {isAddingNewItem ? 'Thêm Món Mới Vào Menu' : `Chỉnh Sửa Món: ${editingItem?.name}`}
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-neutral-700 mb-1">Tên món</label>
                        <input
                          type="text"
                          value={editingItem?.name || ''}
                          onChange={(e) => setEditingItem(editingItem ? { ...editingItem, name: e.target.value } : null)}
                          className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs font-bold"
                          placeholder="VD: Cà phê cốt dừa..."
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-semibold text-neutral-700">Danh mục</label>
                          <button
                            type="button"
                            onClick={() => setShowInlineAddCategory(!showInlineAddCategory)}
                            className="text-[11px] text-blue-600 hover:underline flex items-center gap-0.5 cursor-pointer"
                          >
                            <FolderPlus className="w-3 h-3" />
                            <span>{showInlineAddCategory ? 'Chọn có sẵn' : '+ Tạo danh mục mới'}</span>
                          </button>
                        </div>
                        {showInlineAddCategory ? (
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              value={inlineNewCategory}
                              onChange={(e) => setInlineNewCategory(e.target.value)}
                              placeholder="Tên danh mục mới..."
                              className="flex-1 px-3 py-2 rounded-xl border border-blue-400 text-xs font-semibold"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (inlineNewCategory.trim()) {
                                  handleAddCategory(inlineNewCategory);
                                  if (editingItem) {
                                    setEditingItem({ ...editingItem, category: inlineNewCategory.trim() });
                                  }
                                  setShowInlineAddCategory(false);
                                  setInlineNewCategory('');
                                }
                              }}
                              className="px-3 py-1 bg-blue-600 text-white rounded-xl text-xs font-bold cursor-pointer"
                            >
                              Thêm
                            </button>
                          </div>
                        ) : (
                          <select
                            value={editingItem?.category || allCategories[0] || 'Coffee'}
                            onChange={(e) => setEditingItem(editingItem ? { ...editingItem, category: e.target.value } : null)}
                            className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs bg-white font-medium"
                          >
                            {allCategories.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-neutral-700 mb-1">Giá bán (VND)</label>
                        <input
                          type="number"
                          value={editingItem?.price || 60000}
                          onChange={(e) => setEditingItem(editingItem ? { ...editingItem, price: parseFloat(e.target.value) || 0 } : null)}
                          className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs font-bold font-mono"
                        />
                      </div>
                    </div>

                    {/* Item-level Print Label Rule */}
                    <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-1.5">
                      <label className="block text-xs font-semibold text-neutral-800">
                        Cấu hình In Tem Nhãn Dán Ly / Chế Biến (Khổ 50x30mm) cho món này:
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingItem(editingItem ? { ...editingItem, printLabel: undefined } : null)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            editingItem?.printLabel === undefined
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-100'
                          }`}
                        >
                          Tự động theo Danh Mục ({isItemPrintable({ category: editingItem?.category }, currentCategoryConfigs) ? 'Có in tem' : 'Không in tem'})
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditingItem(editingItem ? { ...editingItem, printLabel: true } : null)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1 transition-all cursor-pointer ${
                            editingItem?.printLabel === true
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                              : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-100'
                          }`}
                        >
                          <Tag className="w-3.5 h-3.5" />
                          <span>Luôn in tem</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditingItem(editingItem ? { ...editingItem, printLabel: false } : null)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1 transition-all cursor-pointer ${
                            editingItem?.printLabel === false
                              ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                              : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-100'
                          }`}
                        >
                          <Ban className="w-3.5 h-3.5" />
                          <span>Không in tem (Bỏ qua tem)</span>
                        </button>
                      </div>
                      <p className="text-[11px] text-neutral-500">
                        {editingItem?.printLabel === false
                          ? '⚠️ Món này sẽ KHÔNG in tem nhãn khi thu ngân gọi món (tiết kiệm giấy cho muỗng, đũa, khăn, đồ mặc...).'
                          : editingItem?.printLabel === true
                          ? '✅ Món này sẽ LUÔN in tem nhãn 50x30mm khi gọi món hoặc thanh toán.'
                          : `ℹ️ Kế thừa theo danh mục "${editingItem?.category || 'Chưa chọn'}" (${isItemPrintable({ category: editingItem?.category }, currentCategoryConfigs) ? 'Sẽ in tem' : 'Không in tem'}).`}
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">Đường dẫn hình ảnh (URL)</label>
                      <input
                        type="text"
                        value={editingItem?.image || ''}
                        onChange={(e) => setEditingItem(editingItem ? { ...editingItem, image: e.target.value } : null)}
                        className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs font-mono"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        onClick={() => { setEditingItem(null); setIsAddingNewItem(false); }}
                        className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-600 hover:bg-neutral-100"
                      >
                        Huỷ
                      </button>
                      <button
                        onClick={() => editingItem && handleSaveMenuItem(editingItem)}
                        className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm"
                      >
                        Lưu Thay Đổi
                      </button>
                    </div>
                  </div>
                )}

                {/* Menu Item Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {state.menu.map((item) => {
                    const printable = isItemPrintable(item, currentCategoryConfigs);

                    return (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl bg-white border border-neutral-200 shadow-sm flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-12 h-12 rounded-lg object-cover border border-neutral-200"
                          />
                          <div>
                            <h5 className="font-bold text-xs text-neutral-900">{item.name}</h5>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] text-blue-600 font-semibold uppercase">{item.category}</span>
                              {printable ? (
                                <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-300/60 px-1.5 py-0.2 rounded font-semibold flex items-center gap-0.5">
                                  <Tag className="w-2.5 h-2.5 text-emerald-600" /> In tem
                                </span>
                              ) : (
                                <span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-300/60 px-1.5 py-0.2 rounded font-semibold flex items-center gap-0.5">
                                  <Ban className="w-2.5 h-2.5 text-amber-600" /> Bỏ qua tem
                                </span>
                              )}
                            </div>
                            <div className="font-mono font-bold text-xs text-neutral-800 mt-0.5">{formatVND(item.price)}đ</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => { setEditingItem(item); setIsAddingNewItem(false); }}
                            className="p-2 rounded-lg text-neutral-600 hover:bg-neutral-100 transition-colors cursor-pointer"
                            title="Sửa món"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteMenuItem(item.id)}
                            className="p-2 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Xoá món"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 6.5: QUẢN LÝ NHỮNG GÓC CHECK-IN & ẢNH SLIDE (hinh.jpg) */}
            {activeTab === 'gallery' && (
              <div className="space-y-6">
                {/* Header Banner */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-red-950/30 to-amber-950/40 border border-amber-600/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                      <Camera className="w-4 h-4" />
                      <span>Quản Lý Những Góc Check-in & Ảnh Slide (hinh.jpg)</span>
                    </div>
                    <p className="text-xs text-neutral-400 mt-1">
                      Tùy chỉnh tiêu đề chính, tiêu đề phụ (thẻ chữ Hán), mô tả và danh sách 5 hình ảnh chạy slide cho từng góc chụp của quán trên Trang Chủ.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={handleAddCorner}
                      className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-black font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm Góc Mới</span>
                    </button>
                    <button
                      onClick={handleResetCorners}
                      className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Khôi phục lại 9 góc chụp chuẩn ban đầu"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Khôi Phục Mẫu</span>
                    </button>
                  </div>
                </div>

                {/* Corner Selector Tabs */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
                      Chọn Góc Check-in Cần Chỉnh Sửa ({currentCorners.length} góc chụp)
                    </span>
                    <span className="text-[11px] text-amber-700 font-medium">
                      Nhấp vào góc bên dưới để mở giao diện chỉnh sửa
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                    {currentCorners.map((corner, idx) => {
                      const isSelected = corner.id === activeCorner.id;
                      const thumb = corner.images?.[0] || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800';
                      return (
                        <button
                          key={corner.id}
                          onClick={() => setSelectedCornerId(corner.id)}
                          className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2.5 cursor-pointer relative overflow-hidden ${
                            isSelected
                              ? 'bg-amber-900/10 border-amber-600 ring-2 ring-amber-500/40 shadow-md'
                              : 'bg-white border-neutral-200 hover:border-amber-400 hover:bg-neutral-50'
                          }`}
                        >
                          <div className="w-12 h-12 rounded-lg bg-neutral-900 overflow-hidden shrink-0 border border-neutral-300 relative">
                            <img
                              src={thumb}
                              alt={corner.title}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                            <span className="absolute bottom-0 right-0 px-1 py-0.2 bg-black/80 text-[9px] font-mono text-amber-300">
                              {corner.images?.length || 0}
                            </span>
                          </div>

                          <div className="min-w-0 flex-1">
                            <span className="block text-[10px] text-amber-700 font-mono truncate">
                              #{idx + 1} {corner.subtitle || 'HongKong'}
                            </span>
                            <h5 className="font-bold text-xs text-neutral-900 truncate">
                              {corner.title}
                            </h5>
                            <span className="inline-block text-[9px] px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600 mt-0.5">
                              {corner.category === 'cophuc' ? 'Cổ phục' : corner.category === 'gacgo' ? 'Gác gỗ' : 'Đồ cổ & Tivi'}
                            </span>
                          </div>

                          {isSelected && (
                            <span className="w-2 h-2 rounded-full bg-amber-600 absolute top-2 right-2" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Editor & Live Preview Side-by-side */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Left: Edit Form (7 cols) */}
                  <div className="lg:col-span-7 space-y-5">
                    <div className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b pb-3">
                        <div className="flex items-center gap-2">
                          <Edit2 className="w-4 h-4 text-amber-600" />
                          <h4 className="font-bold text-sm text-neutral-900">
                            Chỉnh Sửa: <span className="text-amber-700">{activeCorner.title}</span>
                          </h4>
                        </div>
                        <button
                          onClick={() => handleDeleteCorner(activeCorner.id)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 flex items-center gap-1 transition-colors cursor-pointer"
                          title="Xóa góc này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Xóa Góc Này</span>
                        </button>
                      </div>

                      {/* Title & Subtitle */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-neutral-700 mb-1">
                            Tiêu Đề Góc Chụp (Ví dụ: Hiên Cổ Phục) *
                          </label>
                          <input
                            type="text"
                            value={activeCorner.title}
                            onChange={(e) =>
                              handleUpdateCorner({
                                ...activeCorner,
                                title: e.target.value,
                              })
                            }
                            placeholder="Nhập tiêu đề góc chụp..."
                            className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs font-bold text-neutral-900 focus:outline-none focus:border-amber-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-neutral-700 mb-1">
                            Tiêu Đề Phụ / Thẻ Chữ Hán (Góc trên trái)
                          </label>
                          <input
                            type="text"
                            value={activeCorner.subtitle}
                            onChange={(e) =>
                              handleUpdateCorner({
                                ...activeCorner,
                                subtitle: e.target.value,
                              })
                            }
                            placeholder="VD: 尖沙嘴 Select 18 hoặc 中西區..."
                            className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs text-neutral-800 focus:outline-none focus:border-amber-500 font-mono"
                          />
                        </div>
                      </div>

                      {/* Category */}
                      <div>
                        <label className="block text-xs font-semibold text-neutral-700 mb-1">
                          Danh Mục Phân Loại Bộ Lọc
                        </label>
                        <select
                          value={activeCorner.category}
                          onChange={(e) =>
                            handleUpdateCorner({
                              ...activeCorner,
                              category: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs text-neutral-800 bg-white focus:outline-none focus:border-amber-500"
                        >
                          <option value="cophuc">Cổ phục Hong Kong</option>
                          <option value="gacgo">Gác gỗ & Bảng hiệu</option>
                          <option value="doco">Đồ cổ & Tivi</option>
                          <option value="all">Tất cả góc chụp (Mặc định)</option>
                        </select>
                      </div>

                      {/* Description */}
                      <div>
                        <label className="block text-xs font-semibold text-neutral-700 mb-1">
                          Đoạn Văn Mô Tả Góc Chụp
                        </label>
                        <textarea
                          rows={3}
                          value={activeCorner.description}
                          onChange={(e) =>
                            handleUpdateCorner({
                              ...activeCorner,
                              description: e.target.value,
                            })
                          }
                          placeholder="Mô tả nét duyên dáng, cổ kính của góc chụp..."
                          className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs text-neutral-800 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    {/* Manage Slide Images (All 5 images) */}
                    <div className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b pb-3">
                        <div className="flex items-center gap-2">
                          <ImageIcon className="w-4 h-4 text-amber-600" />
                          <h4 className="font-bold text-sm text-neutral-900">
                            Danh Sách Hình Ảnh Chạy Slide ({activeCorner.images?.length || 0} ảnh)
                          </h4>
                        </div>
                        <span className="text-[11px] text-neutral-500">
                          Tự động chạy vòng tròn trên Trang Chủ
                        </span>
                      </div>

                      <div className="space-y-3">
                        {activeCorner.images?.map((imgUrl, imgIdx) => (
                          <div
                            key={imgIdx}
                            className="p-3 rounded-xl border border-neutral-200 bg-neutral-50 flex flex-col sm:flex-row items-start sm:items-center gap-3"
                          >
                            {/* Thumbnail */}
                            <div className="w-16 h-16 rounded-lg bg-neutral-900 overflow-hidden shrink-0 border border-neutral-300 relative group">
                              <img
                                src={imgUrl}
                                alt={`Ảnh ${imgIdx + 1}`}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                              <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono text-amber-300 font-bold">
                                {imgIdx + 1}/{activeCorner.images.length}
                              </span>
                            </div>

                            {/* URL input */}
                            <div className="flex-1 w-full min-w-0">
                              <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                                Đường dẫn hình ảnh {imgIdx + 1}:
                              </label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={imgUrl}
                                  onChange={(e) => {
                                    const updatedImages = [...activeCorner.images];
                                    updatedImages[imgIdx] = e.target.value;
                                    handleUpdateCorner({
                                      ...activeCorner,
                                      images: updatedImages,
                                    });
                                  }}
                                  placeholder="https://..."
                                  className="flex-1 px-3 py-1.5 rounded-lg border border-neutral-300 text-xs font-mono text-neutral-800 focus:outline-none focus:border-amber-500"
                                />
                                <a
                                  href={imgUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-2 rounded-lg bg-neutral-200 hover:bg-neutral-300 text-neutral-700 transition-colors"
                                  title="Mở ảnh gốc trong tab mới"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                                {activeCorner.images.length > 1 && (
                                  <button
                                    onClick={() => {
                                      const updatedImages = activeCorner.images.filter((_, i) => i !== imgIdx);
                                      handleUpdateCorner({
                                        ...activeCorner,
                                        images: updatedImages,
                                      });
                                    }}
                                    className="p-2 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                    title="Xóa ảnh này khỏi slide"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Add new slide image */}
                      <div className="pt-2 border-t border-neutral-200">
                        <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                          Thêm hình ảnh mới vào danh sách slide:
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newSlideImageUrl}
                            onChange={(e) => setNewSlideImageUrl(e.target.value)}
                            placeholder="Dán link ảnh (https://...) vào đây..."
                            className="flex-1 px-3 py-2 rounded-xl border border-neutral-300 text-xs font-mono text-neutral-800 focus:outline-none focus:border-amber-500"
                          />
                          <button
                            onClick={() => {
                              if (!newSlideImageUrl.trim()) {
                                showToast('Vui lòng nhập đường link hình ảnh!', 'error');
                                return;
                              }
                              const updatedImages = [...(activeCorner.images || []), newSlideImageUrl.trim()];
                              handleUpdateCorner({
                                ...activeCorner,
                                images: updatedImages,
                              });
                              setNewSlideImageUrl('');
                              showToast('Đã thêm ảnh vào slide thành công!');
                            }}
                            className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Thêm Vào Slide</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Live Preview Card (5 cols) matching hinh.jpg */}
                  <div className="lg:col-span-5 space-y-4">
                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        <strong>Bản Xem Trước Trực Tiếp (Live Card):</strong> Hiển thị giống 100% hình ảnh thực tế trên Trang Chủ (hinh.jpg).
                      </span>
                    </div>

                    {/* Exact Card Preview matching hinh.jpg */}
                    <div className="group rounded-2xl border border-amber-900/40 bg-[#161210] overflow-hidden shadow-2xl transition-all relative">
                      {/* Image Area */}
                      <div className="relative aspect-[4/3] w-full overflow-hidden bg-neutral-950">
                        <img
                          src={activeCorner.images?.[0] || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800'}
                          alt={activeCorner.title}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />

                        {/* Scanline texture */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

                        {/* Top left badge */}
                        <div className="absolute top-3 left-3 px-2.5 py-1 rounded bg-black/70 backdrop-blur-md border border-amber-500/40 text-amber-300 font-mono text-[11px] font-bold shadow-md">
                          {activeCorner.subtitle || '尖沙嘴 Select 18'}
                        </div>

                        {/* Top right slide indicator */}
                        <div className="absolute top-3 right-3 px-2 py-0.5 rounded bg-black/70 backdrop-blur-md text-amber-200 font-mono text-[11px]">
                          1 / {activeCorner.images?.length || 1}
                        </div>

                        {/* Dots */}
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                          {activeCorner.images?.map((_, i) => (
                            <div
                              key={i}
                              className={`h-1.5 rounded-full transition-all ${
                                i === 0 ? 'w-5 bg-amber-500' : 'w-1.5 bg-neutral-600'
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Content Area */}
                      <div className="p-4 sm:p-5">
                        <h4 className="text-base sm:text-lg font-bold font-serif text-amber-300 tracking-wide mb-1">
                          {activeCorner.title}
                        </h4>
                        <p className="text-xs text-neutral-400 line-clamp-3 leading-relaxed mb-4 font-light">
                          {activeCorner.description}
                        </p>

                        {/* Card Footer */}
                        <div className="pt-3 border-t border-amber-950/60 flex items-center justify-between text-[11px] text-amber-500/80 font-mono">
                          <span className="flex items-center gap-1">
                            ✨ HongKong Cổ Trấn
                          </span>
                          <span className="text-neutral-400 flex items-center gap-1">
                            ↗ Xem ảnh lớn
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white border border-neutral-200 text-xs text-neutral-600 space-y-2">
                      <h5 className="font-bold text-neutral-800">Gợi Ý Ảnh Cổ Phong Hong Kong Đẹp:</h5>
                      <p className="text-[11px] leading-relaxed">
                        Bạn có thể sử dụng link ảnh từ Unsplash, Imgur, Facebook, Google Drive công khai hoặc máy chủ nội bộ. Link ảnh có đuôi .jpg, .jpeg, .png, .webp.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 7: TÙY BIẾN TRANG CHỦ & TIVI */}
            {activeTab === 'homepage' && (
              <div className="space-y-6">
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                  <strong>Tùy biến Trang Chủ:</strong> Bạn có thể dễ dàng thay đổi 5 liên kết YouTube tương ứng với 5 kênh trên tivi cổ, hình ảnh các góc check-in của quán và thông tin hotline, wifi.
                </div>

                {/* Shop Basic Meta */}
                <div className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-sm space-y-4">
                  <h4 className="text-sm font-bold text-neutral-900 border-b pb-2">Thông Tin Chung Trang Chủ</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">Tên Quán</label>
                      <input
                        type="text"
                        value={state.homepage.shopName}
                        onChange={(e) =>
                          onUpdateState({
                            ...state,
                            homepage: { ...state.homepage, shopName: e.target.value },
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">Hotline</label>
                      <input
                        type="text"
                        value={state.homepage.hotline}
                        onChange={(e) =>
                          onUpdateState({
                            ...state,
                            homepage: { ...state.homepage, hotline: e.target.value },
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">Đoạn văn giới thiệu không gian quán</label>
                    <textarea
                      rows={3}
                      value={state.homepage.introText}
                      onChange={(e) =>
                        onUpdateState({
                          ...state,
                          homepage: { ...state.homepage, introText: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs"
                    />
                  </div>
                </div>

                {/* 5 YouTube TV Channels */}
                <div className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-sm space-y-4">
                  <h4 className="text-sm font-bold text-neutral-900 border-b pb-2 flex items-center gap-2">
                    <Tv className="w-4 h-4 text-amber-600" />
                    <span>5 Kênh Video YouTube Cho Tivi Cổ</span>
                  </h4>

                  <div className="space-y-3">
                    {state.homepage.tvChannels.map((channel, idx) => (
                      <div key={channel.id} className="p-3.5 rounded-xl border border-neutral-200 bg-neutral-50 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-amber-700 font-mono">
                            KÊNH {idx + 1}: {channel.channelName}
                          </span>
                          <span className="text-[10px] text-neutral-500 font-mono">ID: {channel.youtubeId}</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={channel.title}
                            onChange={(e) => {
                              const updated = [...state.homepage.tvChannels];
                              updated[idx].title = e.target.value;
                              onUpdateState({
                                ...state,
                                homepage: { ...state.homepage, tvChannels: updated },
                              });
                            }}
                            placeholder="Tiêu đề video..."
                            className="px-3 py-1.5 rounded-lg border border-neutral-300 text-xs font-medium"
                          />
                          <input
                            type="text"
                            value={channel.youtubeId}
                            onChange={(e) => {
                              const updated = [...state.homepage.tvChannels];
                              updated[idx].youtubeId = e.target.value;
                              onUpdateState({
                                ...state,
                                homepage: { ...state.homepage, tvChannels: updated },
                              });
                            }}
                            placeholder="Mã YouTube ID (VD: Wk4h77B4wQ8)..."
                            className="px-3 py-1.5 rounded-lg border border-neutral-300 text-xs font-mono"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 8: BẢO MẬT & QUẢN LÝ MẬT KHẨU CHỦ */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <div className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 border-b pb-2 text-neutral-900 font-bold text-sm">
                    <KeyRound className="w-4 h-4 text-amber-600" />
                    <span>Mật Khẩu Chủ Hệ Thống (Master Key)</span>
                  </div>

                  <p className="text-xs text-neutral-600 leading-relaxed">
                    Mật khẩu chủ được dùng để đặt lại mật khẩu cho tài khoản Admin hoặc bất kỳ nhân viên nào tại màn hình đăng nhập khi xảy ra sự cố quên mật khẩu. Mật khẩu này được ẩn và bảo mật tuyệt đối để tránh việc người ngoài nhìn thấy.
                  </p>

                  <div className="p-4 bg-neutral-100 rounded-xl border border-neutral-200 text-xs space-y-2">
                    <span className="font-semibold text-neutral-800">Cấu hình mật khẩu chủ:</span>
                    <div className="flex items-center gap-3">
                      <div className="relative w-72">
                        <input
                          type={showMasterPass ? 'text' : 'password'}
                          value={state.masterPassword}
                          onChange={(e) =>
                            onUpdateState({
                              ...state,
                              masterPassword: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 pr-10 rounded-xl border border-neutral-300 text-xs font-mono font-bold text-neutral-800 bg-white"
                          placeholder="Nhập mật khẩu chủ..."
                        />
                        <button
                          type="button"
                          onClick={() => setShowMasterPass(!showMasterPass)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700 cursor-pointer"
                          title={showMasterPass ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                        >
                          {showMasterPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      <button
                        onClick={() => {
                          pushStateToCloud(state, 'admin_update_master_pass');
                          showToast('Đã lưu cấu hình Mật khẩu chủ thành công!');
                        }}
                        className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs cursor-pointer shadow-sm transition-colors"
                      >
                        Lưu Cấu Hình
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 9: SAO LƯU & PHỤC HỒI DỮ LIỆU */}
            {activeTab === 'backup' && (
              <div className="space-y-6">
                {/* Cloud Firestore Multi-device Sync Card */}
                <div className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b pb-3">
                    <div className="flex items-center gap-2 text-neutral-900 font-bold text-sm">
                      <Cloud className="w-5 h-5 text-emerald-600" />
                      <span>Đồng Bộ Đa Thiết Bị & Khác Mạng (Firebase Cloud)</span>
                    </div>
                    <CloudSyncBadge />
                  </div>

                  <p className="text-xs text-neutral-600 leading-relaxed">
                    Hệ thống đã kích hoạt cơ chế <strong>Đồng Bộ Thời Gian Thực (Real-time Cloud Sync)</strong> qua Firebase Firestore. Mọi thay đổi về đơn hàng bán ra, doanh thu, phiếu chi, món ăn mới, hoặc cài đặt máy in từ máy này sẽ tự động hiển thị ngay lập tức trên các máy tính, laptop, iPad, điện thoại khác dù ở mạng Wifi khác hoặc mạng di động 4G/5G.
                  </p>

                  <div className="p-4 bg-emerald-50/80 rounded-xl border border-emerald-200 text-xs text-emerald-900 space-y-2">
                    <div className="flex items-center gap-2 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Trạng thái: Máy chủ đám mây hoạt động liên tục 24/7</span>
                    </div>
                    <p className="text-neutral-600">
                      ID Dự Án Cloud: <code className="bg-emerald-100 px-1.5 py-0.5 rounded font-mono font-bold text-emerald-800">gen-lang-client-0291381308</code>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button
                      onClick={async () => {
                        const success = await pushStateToCloud(state, 'admin_manual_push');
                        if (success) {
                          showToast('Đã đẩy toàn bộ dữ liệu lên máy chủ Cloud thành công!');
                        } else {
                          showToast('Không thể kết nối đến máy chủ Cloud!', 'error');
                        }
                      }}
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Đồng Bộ Lên Cloud Ngay (Push To Cloud)
                    </button>

                    <button
                      onClick={async () => {
                        await validateFirestoreConnection();
                        showToast('Đã kiểm tra kết nối Cloud thành công!');
                      }}
                      className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
                    >
                      <Globe className="w-4 h-4 text-amber-400" />
                      Kiểm Tra Kết Nối Đám Mây
                    </button>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 border-b pb-2 text-neutral-900 font-bold text-sm">
                    <Database className="w-4 h-4 text-blue-600" />
                    <span>Xuất & Nhập Cơ Sở Dữ Liệu (JSON)</span>
                  </div>

                  <p className="text-xs text-neutral-600">
                    Toàn bộ đơn hàng, menu, thiết lập máy in IP và cài đặt mẫu in đều có thể tải về dưới dạng tập tin JSON để sao lưu hoặc chuyển đổi sang máy POS khác.
                  </p>

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => {
                        exportBackupJSON();
                        showToast('Đã xuất tập tin sao lưu JSON thành công!');
                      }}
                      className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      Tải File Sao Lưu (.JSON)
                    </button>

                    <label className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm cursor-pointer">
                      <Upload className="w-4 h-4" />
                      <span>Khôi Phục Dữ Liệu Từ File</span>
                      <input
                        type="file"
                        accept=".json"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const content = event.target?.result as string;
                              const res = importBackupJSON(content);
                              showToast(res.message, res.success ? 'success' : 'error');
                            };
                            reader.readAsText(file);
                          }
                        }}
                      />
                    </label>


                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Preview / Reprint Bill & Label Modal */}
      {previewModalOrder && (
        <PrintReceiptModal
          order={previewModalOrder}
          billTemplate={state.billTemplate}
          labelTemplate={state.labelTemplate}
          printerSettings={state.printerSettings}
          mode={previewModalMode}
          onClose={() => setPreviewModalOrder(null)}
        />
      )}
    </div>
  );
};
