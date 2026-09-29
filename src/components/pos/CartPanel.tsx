import React from 'react';
import { Order, OrderItem } from '../../types';
import { formatVND } from '../../services/qzService';
import {
  Trash2,
  Edit3,
  Plus,
  Minus,
  Tag,
  Printer,
  CheckCircle,
  Percent,
  ShoppingBag,
  Users,
  UtensilsCrossed,
  Banknote,
  QrCode,
  ArrowLeft,
  Ban
} from 'lucide-react';

interface CartPanelProps {
  order: Order;
  selectedItemIndex: number | null;
  onSelectItemIndex: (index: number | null) => void;
  onUpdateQuantity: (index: number, delta: number) => void;
  onRemoveItem: (index: number) => void;
  onOpenNoteModal: (index: number) => void;
  onOpenDiscount: () => void;
  onToggleOrderType: (type: 'takeaway' | 'dinein') => void;
  onChangeTableNumber: (table: string) => void;
  onChangePaymentMethod: (method: 'cash' | 'transfer') => void;
  onPrintLabels: () => void;
  onCheckout: () => void;
  onSaveOrder?: () => void;
  onClearOrder?: () => void;
  onCloseMobile?: () => void;
}

export const CartPanel: React.FC<CartPanelProps> = ({
  order,
  selectedItemIndex,
  onSelectItemIndex,
  onUpdateQuantity,
  onRemoveItem,
  onOpenNoteModal,
  onOpenDiscount,
  onToggleOrderType,
  onChangeTableNumber,
  onChangePaymentMethod,
  onPrintLabels,
  onCheckout,
  onSaveOrder,
  onClearOrder,
  onCloseMobile,
}) => {
  const totalItemCount = order.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <aside className="w-full lg:w-80 xl:w-96 bg-white border-l border-neutral-300 flex flex-col shrink-0 shadow-lg text-neutral-800 h-full">
      {/* Top Order Meta Bar */}
      <div className="p-2.5 bg-neutral-100 border-b border-neutral-300 flex flex-wrap items-center justify-between gap-1.5 sm:gap-2">
        {/* Mobile Back to Products Button */}
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="lg:hidden px-2 py-1.5 rounded-lg bg-neutral-200 hover:bg-neutral-300 text-neutral-800 text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Chọn món</span>
          </button>
        )}

        {/* Left group: Order Type Toggle (Mang đi / Tại bàn) + Nút Đơn Mới (ESC) như hình don.png */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Order Type Toggle */}
          <div className="flex bg-neutral-200 p-0.5 rounded-xl">
            <button
              onClick={() => onToggleOrderType('takeaway')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                order.type === 'takeaway'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-neutral-700 hover:text-black'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Mang đi</span>
            </button>
            <button
              onClick={() => onToggleOrderType('dinein')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                order.type === 'dinein'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-neutral-700 hover:text-black'
              }`}
            >
              <UtensilsCrossed className="w-3.5 h-3.5" />
              <span>Tại bàn</span>
            </button>
          </div>

          {/* Nút Đơn Mới (ESC) nằm ngay sau Nút Mang đi và Tại bàn */}
          {onClearOrder && (
            <button
              type="button"
              onClick={onClearOrder}
              className="px-2 py-1.5 rounded-lg text-neutral-700 hover:text-red-600 hover:bg-neutral-200/80 active:bg-neutral-300 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer select-none"
              title="Tạo đơn mới, xóa sạch các món hiện tại (ESC)"
            >
              <span>Đơn Mới (ESC)</span>
            </button>
          )}
        </div>

        {/* Right group: Table input if dinein + Order code */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Dine-in Table number input if applicable */}
          {order.type === 'dinein' && (
            <div className="flex items-center gap-1">
              <span className="text-xs font-semibold text-neutral-600">Bàn:</span>
              <input
                type="text"
                value={order.tableNumber || 'B01'}
                onChange={(e) => onChangeTableNumber(e.target.value)}
                className="w-12 px-1.5 py-1 bg-white border border-neutral-300 rounded-lg text-xs font-bold text-center"
                placeholder="Số bàn"
              />
            </div>
          )}

          {/* Order code */}
          <div className="text-right">
            <span className="block text-[10px] text-neutral-500 font-mono leading-none">MÃ ĐƠN</span>
            <span className="font-mono font-bold text-xs text-blue-700 leading-tight">{order.code}</span>
          </div>
        </div>
      </div>

      {/* Item List Header */}
      <div className="px-3 py-2 bg-neutral-200/70 border-b border-neutral-300 flex items-center justify-between text-[11px] font-bold text-neutral-600 uppercase">
        <span>Mặt hàng ({totalItemCount})</span>
        <div className="flex items-center gap-6">
          <span>SL</span>
          <span>Thành tiền</span>
        </div>
      </div>

      {/* Items Scrollable List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 bg-neutral-50">
        {order.items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-neutral-400 text-center">
            <ShoppingBag className="w-10 h-10 mb-2 opacity-40 text-neutral-500" />
            <p className="text-xs font-medium">Chưa có món nào trong đơn</p>
            <p className="text-[11px] text-neutral-400 mt-0.5">Nhấp vào món ở menu bên trái để thêm</p>
          </div>
        ) : (
          order.items.map((item, idx) => {
            const isSelected = selectedItemIndex === idx;

            return (
              <div
                key={idx}
                onClick={() => onSelectItemIndex(idx)}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50/90 border-blue-500 shadow-sm'
                    : 'bg-white border-neutral-200 hover:border-neutral-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-neutral-500">{idx + 1}.</span>
                      <h4 className="text-xs font-bold text-neutral-900 leading-snug">
                        {item.name} {item.size && <span className="text-blue-600 font-mono">({item.size})</span>}
                      </h4>
                    </div>

                    {/* Modifiers & Notes */}
                    {item.note && (
                      <p className="mt-0.5 ml-4 text-[11px] text-amber-700 font-medium italic">
                        * Ghi chú: {item.note}
                      </p>
                    )}

                    {/* Labels status badge */}
                    {item.printLabel === false ? (
                      <span className="inline-flex items-center gap-1 mt-1 ml-4 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded font-medium">
                        <Ban className="w-2.5 h-2.5 text-amber-600" /> Không in tem
                      </span>
                    ) : item.labelsPrinted ? (
                      <span className="inline-flex items-center gap-1 mt-1 ml-4 text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded font-mono font-medium">
                        <CheckCircle className="w-3 h-3" /> Đã in tem
                      </span>
                    ) : null}
                  </div>

                  {/* Quantity and Price */}
                  <div className="text-right shrink-0">
                    <span className="font-bold text-xs text-neutral-900 font-mono">
                      {formatVND(item.price * item.quantity)}đ
                    </span>
                    <div className="text-[10px] text-neutral-500 font-mono">
                      {formatVND(item.price)}đ × {item.quantity}
                    </div>
                  </div>
                </div>

                {/* Interactive Action Row when selected, or always compact */}
                <div className="mt-2 pt-2 border-t border-neutral-100 flex items-center justify-between">
                  {/* Quantity Stepper */}
                  <div className="flex items-center border border-neutral-300 rounded-lg bg-white overflow-hidden">
                    <button
                      onClick={(e) => { e.stopPropagation(); onUpdateQuantity(idx, -1); }}
                      className="w-7 h-7 flex items-center justify-center bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-colors"
                      title="Giảm số lượng"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-8 text-center text-xs font-bold font-mono text-neutral-800">
                      {item.quantity}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); onUpdateQuantity(idx, 1); }}
                      className="w-7 h-7 flex items-center justify-center bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-colors"
                      title="Tăng số lượng"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Action Buttons: "Sửa" (ghichu.jpeg) and "Xoá" */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); onOpenNoteModal(idx); }}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300/60 flex items-center gap-1 transition-colors"
                      title="Thêm ghi chú/chú thích món"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Sửa</span>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onRemoveItem(idx); }}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Xoá món này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Cart Summary Totals */}
      <div className="p-2.5 bg-neutral-100 border-t border-neutral-300 space-y-1 text-xs">
        <div className="flex justify-between text-neutral-600">
          <span>Tiền hàng ({totalItemCount} món):</span>
          <span className="font-mono font-semibold">{formatVND(order.subtotal)}đ</span>
        </div>

        {order.discount > 0 && (
          <div className="flex justify-between text-emerald-700 font-semibold">
            <span className="flex items-center gap-1">
              <Percent className="w-3.5 h-3.5" /> Giảm giá:
            </span>
            <span className="font-mono">-{formatVND(order.discount)}đ</span>
          </div>
        )}

        <div className="pt-1 border-t border-neutral-300 flex justify-between items-baseline">
          <span className="text-xs font-bold text-neutral-900 uppercase">TỔNG CỘNG:</span>
          <span className="text-base font-black text-blue-700 font-mono">
            {formatVND(order.total)}đ
          </span>
        </div>
      </div>

      {/* Bottom Main Action Buttons (Thiết kế tinh gọn theo mẫu moi.png) */}
      <div className="p-2.5 bg-neutral-900 text-white space-y-2 border-t border-neutral-800">
        {/* PAYMENT METHOD SELECTOR: Tiền mặt vs Chuyển khoản cùng hàng với Badge hiển thị phương thức */}
        <div className="flex items-center gap-2">
          {/* Segmented Radio Toggle Bar */}
          <div className="flex-1 flex items-center p-1 rounded-xl bg-neutral-800/90 border border-neutral-700/80 gap-1 shadow-inner">
            {/* Tùy chọn Tiền mặt */}
            <button
              type="button"
              onClick={() => onChangePaymentMethod('cash')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer select-none ${
                order.paymentMethod === 'cash'
                  ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400/40'
                  : 'text-neutral-300 hover:text-white hover:bg-neutral-700/60'
              }`}
            >
              {/* Radio dot */}
              <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                order.paymentMethod === 'cash'
                  ? 'border-white bg-emerald-700'
                  : 'border-neutral-400 bg-transparent'
              }`}>
                {order.paymentMethod === 'cash' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                )}
              </span>
              <Banknote className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Tiền mặt</span>
            </button>

            {/* Tùy chọn Chuyển khoản */}
            <button
              type="button"
              onClick={() => onChangePaymentMethod('transfer')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer select-none ${
                order.paymentMethod === 'transfer'
                  ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-400/40'
                  : 'text-neutral-300 hover:text-white hover:bg-neutral-700/60'
              }`}
            >
              {/* Radio dot */}
              <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                order.paymentMethod === 'transfer'
                  ? 'border-white bg-blue-700'
                  : 'border-neutral-400 bg-transparent'
              }`}>
                {order.paymentMethod === 'transfer' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                )}
              </span>
              <QrCode className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Chuyển khoản</span>
            </button>
          </div>

          {/* Glowing Status Badge on the right (như mẫu moi.png) */}
          <div
            className={`shrink-0 px-2.5 py-1.5 rounded-xl border flex items-center justify-center transition-all select-none ${
              order.paymentMethod === 'cash'
                ? 'bg-[#021f15] border-emerald-500/70 text-emerald-400 shadow-sm shadow-emerald-950/60'
                : 'bg-[#041936] border-cyan-500/70 text-cyan-300 shadow-sm shadow-cyan-950/60'
            }`}
          >
            <span className="font-mono font-black text-[11px] sm:text-xs tracking-wider">
              {order.paymentMethod === 'cash' ? 'TIỀN MẶT' : 'CHUYỂN KHOẢN'}
            </span>
          </div>
        </div>

        {/* Action Buttons Row: IN TEM & THANH TOÁN (F1) */}
        <div className="grid grid-cols-2 gap-2">
          {/* Button In Tem */}
          <button
            type="button"
            onClick={onPrintLabels}
            disabled={order.items.length === 0}
            className={`py-3 px-2 rounded-xl text-xs sm:text-[13px] font-black flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-40 disabled:pointer-events-none select-none ${
              order.labelsPrintedCount > 0
                ? 'bg-emerald-700 hover:bg-emerald-600 text-white border border-emerald-500/50'
                : 'bg-[#7a3b12] hover:bg-[#8f4616] text-[#1a0f00] border border-[#964a18]'
            }`}
            title="In tem dán ly 50x30mm qua máy in 192.168.1.52"
          >
            <Tag className="w-4 h-4 shrink-0 text-black stroke-[2.5]" />
            <span className="truncate font-extrabold tracking-wide">
              {order.labelsPrintedCount > 0 ? 'IN LẠI TEM' : 'IN TEM (50x30)'}
            </span>
          </button>

          {/* Button Thanh toán (F1) */}
          <button
            type="button"
            onClick={onCheckout}
            disabled={order.items.length === 0}
            className="py-3 px-2 rounded-xl text-xs sm:text-[13px] font-black bg-[#1d4ed8] hover:bg-[#2563eb] text-white flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer select-none border border-blue-500/50"
            title="Thanh toán & in hóa đơn bill 85mm (F1)"
          >
            <Printer className="w-4 h-4 shrink-0 stroke-[2.5]" />
            <span className="truncate font-extrabold tracking-wide">THANH TOÁN (F1)</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
