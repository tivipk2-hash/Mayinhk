import React, { useState, useMemo, useEffect } from 'react';
import { AppState, Order, OrderItem, MenuItem, User } from '../../types';
import { PosHeader } from './PosHeader';
import { CategorySidebar } from './CategorySidebar';
import { ProductGrid } from './ProductGrid';
import { CartPanel } from './CartPanel';
import { PosBottomBar } from './PosBottomBar';
import { NoteModal } from './NoteModal';
import { PrintReceiptModal } from './PrintReceiptModal';
import { CustomerDisplayModal } from './CustomerDisplayModal';
import { executePrintBill, executePrintLabels, formatVND, ERROR_BRIDGE_NOT_RUNNING } from '../../services/printBridgeService';
import { isItemPrintable } from '../../services/categoryService';
import { broadcastToCustomerDisplay, listenForDisplayRequests } from '../../services/customerDisplayService';
import { generateNextOrderCode } from '../../services/orderSequence';
import { ShoppingCart, ArrowRight, Sparkles, AlertCircle, RotateCcw, CheckCircle2 } from 'lucide-react';

interface PosLayoutProps {
  state: AppState;
  currentUser: User;
  onUpdateState: (newState: AppState) => void;
  onOpenSettings: () => void;
  onLogout: () => void;
  onBackToHome: () => void;
}

export const PosLayout: React.FC<PosLayoutProps> = ({
  state,
  currentUser,
  onUpdateState,
  onOpenSettings,
  onLogout,
  onBackToHome,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);
  const [editingNoteItemIndex, setEditingNoteItemIndex] = useState<number | null>(null);
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [showCustomerDisplayModal, setShowCustomerDisplayModal] = useState(false);

  // Active print modal
  const [printModalData, setPrintModalData] = useState<{
    order: Order;
    mode: 'bill' | 'label' | 'both';
  } | null>(null);

  // Notification Banner with Retry action support
  const [notification, setNotification] = useState<{
    text: string;
    type: 'success' | 'info' | 'error';
    onRetry?: () => void;
    retryLabel?: string;
  } | null>(null);

  const showNotification = (
    text: string,
    type: 'success' | 'info' | 'error' = 'success',
    onRetry?: () => void,
    retryLabel: string = 'Thử lại'
  ) => {
    setNotification({ text, type, onRetry, retryLabel });
    // Keep error with retry open longer so cashier can click
    const duration = type === 'error' && onRetry ? 8000 : 3500;
    setTimeout(() => {
      setNotification((curr) => (curr?.text === text ? null : curr));
    }, duration);
  };

  // Active working draft order in POS with sequential order code (e.g. 0001, 0002...)
  const [currentOrder, setCurrentOrder] = useState<Order>(() => {
    const nextCode = generateNextOrderCode(state.orders);
    return {
      id: 'draft_' + Date.now(),
      code: nextCode,
      orderNumber: nextCode,
      items: [],
      subtotal: 0,
      discount: 0,
      total: 0,
      type: 'takeaway',
      tableNumber: 'B01',
      customerCount: 1,
      status: 'pending',
      staffId: currentUser.id,
      staffName: currentUser.name,
      shiftId: state.currentShift?.id || 'shift_default',
      createdAt: new Date().toISOString(),
      paymentMethod: 'cash',
      labelsPrintedCount: 0,
      billPrintedCount: 0,
    };
  });

  // Keep draft order's code automatically in sync with latest order sequence when cart is empty
  // (e.g. when cashier deletes orders in Admin or completes orders on other devices)
  useEffect(() => {
    if (currentOrder.items.length === 0) {
      const nextCode = generateNextOrderCode(state.orders);
      if (currentOrder.code !== nextCode) {
        setCurrentOrder((prev) => ({
          ...prev,
          code: nextCode,
          orderNumber: nextCode,
        }));
      }
    }
  }, [state.orders, currentOrder.items.length, currentOrder.code]);

  // Synchronize current order to Customer Facing Display
  useEffect(() => {
    return listenForDisplayRequests(() => ({
      order: currentOrder,
      status: currentOrder.items.length > 0 ? 'ordering' : 'idle',
      lastUpdated: Date.now(),
      cashierName: currentUser.name,
      vietQr: state.billTemplate?.vietQr,
      storeName: state.homepage?.shopName,
      storeAddress: state.homepage?.address,
      storeHotline: state.homepage?.hotline,
      wifiSsid: state.homepage?.wifiSsid,
      wifiPass: state.homepage?.wifiPass,
    }));
  }, [currentOrder, currentUser.name, state.billTemplate?.vietQr, state.homepage]);

  // Categories list
  const categories = useMemo(() => {
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
  }, [state.menu, state.categories]);

  // Filtered menu items
  const filteredItems = useMemo(() => {
    return state.menu.filter(item => {
      const matchCat = activeCategory === 'ALL' || item.category === activeCategory;
      const matchSearch = !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch && item.isAvailable;
    });
  }, [state.menu, activeCategory, searchQuery]);

  // Recalculate order totals whenever items or discount changes
  const recalculateOrder = (items: OrderItem[], discount: number = currentOrder.discount): Order => {
    const subtotal = items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    const total = Math.max(0, subtotal - discount);
    return {
      ...currentOrder,
      items,
      subtotal,
      discount,
      total,
    };
  };

  // Handle adding an item to the order
  const handleSelectItem = (item: MenuItem) => {
    const existingIndex = currentOrder.items.findIndex(
      i => i.itemId === item.id && !i.note && (!i.size || i.size === 'M')
    );

    let newItems: OrderItem[];

    if (existingIndex > -1) {
      newItems = currentOrder.items.map((it, idx) => {
        if (idx === existingIndex) {
          return { ...it, quantity: it.quantity + 1 };
        }
        return it;
      });
      setSelectedItemIndex(existingIndex);
    } else {
      const printable = isItemPrintable(item, state.categoryConfigs);
      const newItem: OrderItem = {
        itemId: item.id,
        name: item.name,
        category: item.category,
        price: item.price,
        quantity: 1,
        size: 'M',
        labelsPrinted: false,
        printLabel: printable,
      };
      newItems = [...currentOrder.items, newItem];
      setSelectedItemIndex(newItems.length - 1);
    }

    const updated = recalculateOrder(newItems);
    setCurrentOrder(updated);
    broadcastToCustomerDisplay({
      order: updated,
      status: 'ordering',
      lastUpdated: Date.now(),
      cashierName: currentUser.name,
      vietQr: state.billTemplate?.vietQr,
      storeName: state.homepage?.shopName,
      storeAddress: state.homepage?.address,
      storeHotline: state.homepage?.hotline,
      wifiSsid: state.homepage?.wifiSsid,
      wifiPass: state.homepage?.wifiPass,
      lastAction: 'item_added',
      lastActionItemName: item.name,
    });
  };

  // Stepper quantity changes
  const handleUpdateQuantity = (index: number, delta: number) => {
    const target = currentOrder.items[index];
    if (!target) return;

    const newQty = target.quantity + delta;
    if (newQty <= 0) {
      handleRemoveItem(index);
      return;
    }

    const newItems = currentOrder.items.map((it, idx) => (idx === index ? { ...it, quantity: newQty } : it));
    const updated = recalculateOrder(newItems);
    setCurrentOrder(updated);
    broadcastToCustomerDisplay({
      order: updated,
      status: 'ordering',
      lastUpdated: Date.now(),
      cashierName: currentUser.name,
      vietQr: state.billTemplate?.vietQr,
      storeName: state.homepage?.shopName,
      storeAddress: state.homepage?.address,
      storeHotline: state.homepage?.hotline,
      wifiSsid: state.homepage?.wifiSsid,
      wifiPass: state.homepage?.wifiPass,
      lastAction: 'quantity_changed',
      lastActionItemName: target.name,
    });
  };

  // Remove item
  const handleRemoveItem = (index: number) => {
    const target = currentOrder.items[index];
    const newItems = currentOrder.items.filter((_, idx) => idx !== index);
    if (selectedItemIndex === index) setSelectedItemIndex(null);
    const updated = recalculateOrder(newItems);
    setCurrentOrder(updated);
    broadcastToCustomerDisplay({
      order: updated,
      status: newItems.length > 0 ? 'ordering' : 'idle',
      lastUpdated: Date.now(),
      cashierName: currentUser.name,
      vietQr: state.billTemplate?.vietQr,
      storeName: state.homepage?.shopName,
      storeAddress: state.homepage?.address,
      storeHotline: state.homepage?.hotline,
      wifiSsid: state.homepage?.wifiSsid,
      wifiPass: state.homepage?.wifiPass,
      lastAction: 'item_removed',
      lastActionItemName: target ? target.name : undefined,
    });
  };

  // Save updated item note
  const handleSaveItemNote = (updatedItem: OrderItem) => {
    if (editingNoteItemIndex === null) return;
    const newItems = currentOrder.items.map((it, idx) => (idx === editingNoteItemIndex ? updatedItem : it));
    const updated = recalculateOrder(newItems);
    setCurrentOrder(updated);
    broadcastToCustomerDisplay({
      order: updated,
      status: 'ordering',
      lastUpdated: Date.now(),
      cashierName: currentUser.name,
      vietQr: state.billTemplate?.vietQr,
      storeName: state.homepage?.shopName,
      storeAddress: state.homepage?.address,
      storeHotline: state.homepage?.hotline,
      wifiSsid: state.homepage?.wifiSsid,
      wifiPass: state.homepage?.wifiPass,
      lastAction: 'quantity_changed',
      lastActionItemName: updatedItem.name,
    });
    showNotification(`Đã lưu ghi chú cho ${updatedItem.name}!`);
  };

  // Print Labels (Direct send to QZ Tray without modal confirmation)
  const handlePrintLabels = async () => {
    if (currentOrder.items.length === 0) return;

    const printableItems = currentOrder.items.filter(i => i.printLabel !== false);
    if (printableItems.length === 0) {
      showNotification('Đơn hàng không có món nào cần in tem (Đã bỏ qua các món phụ kiện/đồ dùng)!', 'info');
      return;
    }

    const updatedOrder: Order = {
      ...currentOrder,
      labelsPrintedCount: currentOrder.labelsPrintedCount + 1,
      items: currentOrder.items.map(i => ({ ...i, labelsPrinted: i.printLabel !== false })),
    };

    setCurrentOrder(updatedOrder);

    const tryPrintLabels = async () => {
      showNotification(`Đang gửi lệnh in tem cho đơn #${updatedOrder.code}...`, 'info');
      try {
        const res = await executePrintLabels(
          updatedOrder,
          state.labelTemplate,
          state.printerSettings,
          undefined,
          state.categoryConfigs
        );
        if (res.success) {
          showNotification('Đã gửi lệnh in tem thành công', 'success');
        } else {
          showNotification(
            res.message || ERROR_BRIDGE_NOT_RUNNING,
            'error',
            () => tryPrintLabels(),
            'Thử lại'
          );
        }
      } catch (err) {
        const errMsg = (err as Error).message || ERROR_BRIDGE_NOT_RUNNING;
        showNotification(errMsg, 'error', () => tryPrintLabels(), 'Thử lại');
      }
    };

    await tryPrintLabels();
  };

  // Checkout (Thanh toán F1): Tự động gửi lệnh in bill và in tem, tự động bỏ qua tem nếu đơn chỉ có phụ kiện
  const handleCheckout = async () => {
    if (currentOrder.items.length === 0) return;

    const hasPrintableLabels = currentOrder.items.some(i => i.printLabel !== false);

    // Ensure finalOrder code is unique and follows sequential numbering
    let finalCode = currentOrder.code;
    if (state.orders.some(o => o.code === finalCode)) {
      finalCode = generateNextOrderCode(state.orders);
    }

    const finalOrder: Order = {
      ...currentOrder,
      code: finalCode,
      orderNumber: finalCode,
      status: 'completed',
      createdAt: new Date().toISOString(),
      billPrintedCount: currentOrder.billPrintedCount + 1,
      labelsPrintedCount: hasPrintableLabels ? currentOrder.labelsPrintedCount + 1 : currentOrder.labelsPrintedCount,
      items: currentOrder.items.map(i => ({ ...i, labelsPrinted: i.printLabel !== false })),
    };

    // Save to global orders list
    const updatedOrders = [finalOrder, ...state.orders];

    // Update shift totals
    let updatedShift = state.currentShift;
    if (updatedShift) {
      updatedShift = {
        ...updatedShift,
        totalSales: updatedShift.totalSales + finalOrder.total,
        orderCount: updatedShift.orderCount + 1,
      };
    }

    onUpdateState({
      ...state,
      orders: updatedOrders,
      currentShift: updatedShift,
    });

    // Broadcast order completion to Customer Facing Display
    broadcastToCustomerDisplay({
      order: finalOrder,
      status: 'completed',
      lastUpdated: Date.now(),
      completedAt: Date.now(),
      cashierName: currentUser.name,
      vietQr: state.billTemplate?.vietQr,
      storeName: state.homepage?.shopName,
      storeAddress: state.homepage?.address,
      storeHotline: state.homepage?.hotline,
      wifiSsid: state.homepage?.wifiSsid,
      wifiPass: state.homepage?.wifiPass,
      lastAction: 'order_completed',
    });

    // Reset draft order immediately for the next customer with next sequence
    handleClearOrder(updatedOrders);

    // Show initial notification
    showNotification(
      `Đã thanh toán đơn #${finalOrder.code}! Đang gửi lệnh in bill ${hasPrintableLabels ? '& tem...' : '...'}`,
      'info'
    );

    // Tự động gửi in: Bắt sự kiện phản hồi & lưu hàng đợi nếu mất kết nối
    const executeCheckoutPrints = async () => {
      try {
        if (hasPrintableLabels) {
          const [billRes, labelRes] = await Promise.allSettled([
            executePrintBill(finalOrder, state.billTemplate, state.printerSettings),
            executePrintLabels(finalOrder, state.labelTemplate, state.printerSettings, undefined, state.categoryConfigs),
          ]);

          const billSuccess = billRes.status === 'fulfilled' && billRes.value.success;
          const labelSuccess = labelRes.status === 'fulfilled' && labelRes.value.success;

          if (billSuccess && labelSuccess) {
            showNotification('Đã gửi lệnh in tem và bill thành công!', 'success');
          } else if (billSuccess && !labelSuccess) {
            const labelMsg = labelRes.status === 'fulfilled' ? labelRes.value.message : ERROR_BRIDGE_NOT_RUNNING;
            showNotification(
              `Đã in bill. In tem thất bại: ${labelMsg}`,
              'error',
              () => executeCheckoutPrints(),
              'Thử lại in tem'
            );
          } else if (!billSuccess && labelSuccess) {
            const billMsg = billRes.status === 'fulfilled' ? billRes.value.message : ERROR_BRIDGE_NOT_RUNNING;
            showNotification(
              `Đã in tem. In bill thất bại: ${billMsg}`,
              'error',
              () => executeCheckoutPrints(),
              'Thử lại in bill'
            );
          } else {
            const errMsg = (billRes.status === 'fulfilled' && billRes.value.message) || ERROR_BRIDGE_NOT_RUNNING;
            showNotification(
              errMsg,
              'error',
              () => executeCheckoutPrints(),
              'Thử lại'
            );
          }
        } else {
          // Chỉ in bill
          const billRes = await executePrintBill(finalOrder, state.billTemplate, state.printerSettings);
          if (billRes.success) {
            showNotification(`Đã in hóa đơn đơn #${finalOrder.code} thành công!`, 'success');
          } else {
            showNotification(
              billRes.message || ERROR_BRIDGE_NOT_RUNNING,
              'error',
              () => executeCheckoutPrints(),
              'Thử lại'
            );
          }
        }
      } catch (printErr) {
        showNotification(
          (printErr as Error).message || ERROR_BRIDGE_NOT_RUNNING,
          'error',
          () => executeCheckoutPrints(),
          'Thử lại'
        );
      }
    };

    await executeCheckoutPrints();
  };

  // Save Order as pending
  const handleSaveOrder = () => {
    if (currentOrder.items.length === 0) return;
    const pendingOrder: Order = {
      ...currentOrder,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    onUpdateState({
      ...state,
      orders: [pendingOrder, ...state.orders],
    });
    showNotification(`Đã lưu đơn tạm #${pendingOrder.code}!`);
    handleClearOrder();
  };

  // Clear Order
  const handleClearOrder = (updatedOrdersList?: Order[]) => {
    const ordersList = updatedOrdersList || state.orders;
    const nextCode = generateNextOrderCode(ordersList);

    const emptyOrder: Order = {
      id: 'draft_' + Date.now(),
      code: nextCode,
      orderNumber: nextCode,
      items: [],
      subtotal: 0,
      discount: 0,
      total: 0,
      type: 'takeaway',
      tableNumber: 'B01',
      customerCount: 1,
      status: 'pending',
      staffId: currentUser.id,
      staffName: currentUser.name,
      shiftId: state.currentShift?.id || 'shift_default',
      createdAt: new Date().toISOString(),
      paymentMethod: 'cash',
      labelsPrintedCount: 0,
      billPrintedCount: 0,
    };
    setCurrentOrder(emptyOrder);
    setSelectedItemIndex(null);
    broadcastToCustomerDisplay({
      order: null,
      status: 'idle',
      lastUpdated: Date.now(),
      cashierName: currentUser.name,
      vietQr: state.billTemplate?.vietQr,
      storeName: state.homepage?.shopName,
      storeAddress: state.homepage?.address,
      storeHotline: state.homepage?.hotline,
      wifiSsid: state.homepage?.wifiSsid,
      wifiPass: state.homepage?.wifiPass,
      lastAction: 'order_cleared',
    });
  };

  // Keyboard shortcuts (F1 for Checkout, ESC for closing modals)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        handleCheckout();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (printModalData) {
          setPrintModalData(null);
        } else if (editingNoteItemIndex !== null) {
          setEditingNoteItemIndex(null);
        } else {
          handleClearOrder();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-neutral-100 font-sans select-none">
      {/* Top POS Header Bar */}
      <PosHeader
        currentUser={currentUser}
        currentShift={state.currentShift}
        printerSettings={state.printerSettings}
        onOpenSettings={onOpenSettings}
        onLogout={onLogout}
        onBackToHome={onBackToHome}
        onOpenCustomerDisplay={() => setShowCustomerDisplayModal(true)}
      />

      {/* Floating Notification Toast */}
      {notification && (
        <div className={`fixed top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl shadow-2xl text-xs font-bold border flex items-center gap-3 animate-in fade-in slide-in-from-top-2 backdrop-blur-md ${
          notification.type === 'success'
            ? 'bg-emerald-600/95 text-white border-emerald-400'
            : notification.type === 'error'
            ? 'bg-red-600/95 text-white border-red-400 ring-2 ring-red-500/20'
            : 'bg-blue-600/95 text-white border-blue-400'
        }`}>
          {notification.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />}
          {notification.type === 'error' && <AlertCircle className="w-4 h-4 text-red-200 shrink-0" />}
          
          <span>{notification.text}</span>

          {notification.onRetry && (
            <button
              onClick={() => {
                const retryFn = notification.onRetry;
                setNotification(null);
                if (retryFn) retryFn();
              }}
              className="ml-2 px-3 py-1 rounded-lg bg-white text-red-700 hover:bg-neutral-100 font-extrabold text-[11px] shadow-sm flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{notification.retryLabel || 'Thử lại'}</span>
            </button>
          )}
        </div>
      )}

      {/* MOBILE CATEGORY SCROLLER: Displayed on mobile (< lg) so cashier sees all items without screen being squeezed */}
      <div className="lg:hidden bg-neutral-900 border-b border-neutral-800 px-3 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 select-none">
        <button
          onClick={() => setActiveCategory('ALL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 flex items-center gap-1 transition-all ${
            activeCategory === 'ALL'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>TẤT CẢ</span>
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 uppercase transition-all ${
              activeCategory === cat
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Main POS Content Row */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Desktop Category Selector on Left (hidden on mobile) */}
        <div className="hidden lg:flex shrink-0">
          <CategorySidebar
            categories={categories}
            activeCategory={activeCategory}
            onSelectCategory={setActiveCategory}
          />
        </div>

        {/* Product Grid in Center - Takes 100% width on mobile */}
        <ProductGrid
          items={filteredItems}
          onSelectItem={handleSelectItem}
          selectedItemIds={currentOrder.items.map(i => i.itemId)}
          categoryConfigs={state.categoryConfigs}
        />

        {/* Desktop Cart Panel on Right (hidden on mobile, visible lg:flex) */}
        <div className="hidden lg:flex shrink-0">
          <CartPanel
            order={currentOrder}
            selectedItemIndex={selectedItemIndex}
            onSelectItemIndex={setSelectedItemIndex}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            onOpenNoteModal={(idx) => setEditingNoteItemIndex(idx)}
            onOpenDiscount={() => {}}
            onToggleOrderType={(type) => setCurrentOrder({ ...currentOrder, type })}
            onChangeTableNumber={(tableNumber) => setCurrentOrder({ ...currentOrder, tableNumber })}
            onChangePaymentMethod={(paymentMethod) => setCurrentOrder({ ...currentOrder, paymentMethod })}
            onPrintLabels={handlePrintLabels}
            onCheckout={handleCheckout}
            onSaveOrder={handleSaveOrder}
            onClearOrder={handleClearOrder}
          />
        </div>

        {/* MOBILE CART OVERLAY / SLIDE-IN DRAWER */}
        {showMobileCart && (
          <div className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-xs flex flex-col justify-end animate-in fade-in">
            <div className="w-full h-[90vh] bg-white rounded-t-2xl overflow-hidden shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-200">
              <CartPanel
                order={currentOrder}
                selectedItemIndex={selectedItemIndex}
                onSelectItemIndex={setSelectedItemIndex}
                onUpdateQuantity={handleUpdateQuantity}
                onRemoveItem={handleRemoveItem}
                onOpenNoteModal={(idx) => setEditingNoteItemIndex(idx)}
                onOpenDiscount={() => {}}
                onToggleOrderType={(type) => setCurrentOrder({ ...currentOrder, type })}
                onChangeTableNumber={(tableNumber) => setCurrentOrder({ ...currentOrder, tableNumber })}
                onChangePaymentMethod={(paymentMethod) => setCurrentOrder({ ...currentOrder, paymentMethod })}
                onPrintLabels={handlePrintLabels}
                onCheckout={async () => {
                  await handleCheckout();
                  setShowMobileCart(false);
                }}
                onSaveOrder={() => {
                  handleSaveOrder();
                  setShowMobileCart(false);
                }}
                onClearOrder={() => {
                  handleClearOrder();
                  setShowMobileCart(false);
                }}
                onCloseMobile={() => setShowMobileCart(false)}
              />
            </div>
          </div>
        )}
      </div>

      {/* MOBILE STICKY FLOATING CART BAR: Visible only on mobile (< lg) */}
      <div className="lg:hidden p-3 bg-neutral-900 border-t border-neutral-800 flex items-center justify-between gap-3 text-white z-20">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
              <ShoppingCart className="w-5 h-5" />
            </div>
            {currentOrder.items.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-emerald-500 text-white font-bold text-[11px] flex items-center justify-center border-2 border-neutral-900">
                {currentOrder.items.reduce((sum, i) => sum + i.quantity, 0)}
              </span>
            )}
          </div>
          <div>
            <div className="font-bold text-sm text-white font-mono">
              {formatVND(currentOrder.total)}đ
            </div>
            <div className="text-[11px] text-neutral-400">
              {currentOrder.items.length === 0 ? 'Chưa chọn món' : `${currentOrder.items.length} món • ${currentOrder.paymentMethod === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'}`}
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowMobileCart(true)}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
        >
          <span>Xem đơn ({currentOrder.items.reduce((sum, i) => sum + i.quantity, 0)})</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom Search & Meta Bar (Desktop & Tablet) */}
      <div className="hidden lg:block">
        <PosBottomBar
          currentUser={currentUser}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onNumpadPress={(num) => {
            if (selectedItemIndex !== null && currentOrder.items[selectedItemIndex]) {
              const qty = parseInt(num) || 1;
              const newItems = currentOrder.items.map((it, idx) => (idx === selectedItemIndex ? { ...it, quantity: qty } : it));
              setCurrentOrder(recalculateOrder(newItems));
            }
          }}
        />
      </div>

      {/* Note / Modifier Modal */}
      {editingNoteItemIndex !== null && currentOrder.items[editingNoteItemIndex] && (
        <NoteModal
          item={currentOrder.items[editingNoteItemIndex]}
          onSaveNote={handleSaveItemNote}
          onClose={() => setEditingNoteItemIndex(null)}
        />
      )}

      {/* Print / Preview Modal */}
      {printModalData && (
        <PrintReceiptModal
          order={printModalData.order}
          billTemplate={state.billTemplate}
          labelTemplate={state.labelTemplate}
          printerSettings={state.printerSettings}
          categoryConfigs={state.categoryConfigs}
          mode={printModalData.mode}
          onClose={() => setPrintModalData(null)}
        />
      )}

      {/* Customer Facing Display Settings / QR Modal */}
      {showCustomerDisplayModal && (
        <CustomerDisplayModal
          currentOrder={currentOrder}
          vietQr={state.billTemplate?.vietQr}
          onClose={() => setShowCustomerDisplayModal(false)}
        />
      )}
    </div>
  );
};
