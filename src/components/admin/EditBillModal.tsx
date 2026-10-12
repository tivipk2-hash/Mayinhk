import React, { useState, useEffect } from 'react';
import { Order } from '../../types';
import { formatVND } from '../../services/printBridgeService';
import {
  X,
  Edit2,
  Banknote,
  QrCode,
  Check,
  RotateCcw,
  Receipt,
  Utensils
} from 'lucide-react';

interface EditBillModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (orderId: string, updatedTotal: number, updatedPaymentMethod: 'cash' | 'transfer') => void;
}

export const EditBillModal: React.FC<EditBillModalProps> = ({
  order,
  isOpen,
  onClose,
  onSave,
}) => {
  if (!isOpen || !order) return null;

  const [totalInput, setTotalInput] = useState<string>(order.total.toString());
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>(
    order.paymentMethod || 'cash'
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync state whenever order prop changes
  useEffect(() => {
    if (order) {
      setTotalInput(order.total.toString());
      setPaymentMethod(order.paymentMethod || 'cash');
      setErrorMsg(null);
    }
  }, [order]);

  const parsedTotal = Math.max(0, parseInt(totalInput.replace(/\D/g, '') || '0', 10));

  const handlePriceChange = (val: string) => {
    const rawNumber = val.replace(/\D/g, '');
    setTotalInput(rawNumber);
    if (errorMsg) setErrorMsg(null);
  };

  const handleAdjustPrice = (delta: number) => {
    const cur = parsedTotal;
    const nextVal = Math.max(0, cur + delta);
    setTotalInput(nextVal.toString());
    if (errorMsg) setErrorMsg(null);
  };

  const handleResetPrice = () => {
    setTotalInput(order.total.toString());
    if (errorMsg) setErrorMsg(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isNaN(parsedTotal) || parsedTotal < 0) {
      setErrorMsg('Vui lòng nhập giá tiền hợp lệ (lớn hơn hoặc bằng 0đ)');
      return;
    }

    onSave(order.id, parsedTotal, paymentMethod);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl border border-neutral-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-gradient-to-r from-neutral-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
              <Edit2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-neutral-900">Sửa Hóa Đơn</h3>
                <span className="font-mono font-bold text-sm text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                  #{order.code}
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                {order.type === 'takeaway' ? 'Mang đi' : `Bàn ${order.tableNumber || 'B01'}`} • NV: {order.staffName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          {/* 1. GIÁ TIỀN HÓA ĐƠN */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-emerald-600" />
                1. Giá Tiền Của Hóa Đơn (VND)
              </label>
              <span className="text-xs text-neutral-400">
                Giá gốc:{' '}
                <strong className="font-mono text-neutral-600">{formatVND(order.total)}đ</strong>
              </span>
            </div>

            {/* Price Input with large preview */}
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={totalInput ? formatVND(parsedTotal) : ''}
                onChange={(e) => handlePriceChange(e.target.value)}
                placeholder="Nhập giá tiền mới..."
                className="w-full px-4 py-3 rounded-2xl border-2 border-neutral-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 text-xl font-black font-mono text-neutral-900 pr-12 transition-all outline-none"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-neutral-400 font-mono text-sm pointer-events-none">
                VND
              </span>
            </div>

            {/* Quick Adjustment Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleResetPrice}
                className="px-2.5 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                title="Khôi phục giá ban đầu"
              >
                <RotateCcw className="w-3 h-3 text-neutral-500" />
                Giá ban đầu ({formatVND(order.total)}đ)
              </button>
              <button
                type="button"
                onClick={() => handleAdjustPrice(-10000)}
                className="px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-[11px] font-bold font-mono transition-colors cursor-pointer"
              >
                -10.000đ
              </button>
              <button
                type="button"
                onClick={() => handleAdjustPrice(-20000)}
                className="px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-[11px] font-bold font-mono transition-colors cursor-pointer"
              >
                -20.000đ
              </button>
              <button
                type="button"
                onClick={() => handleAdjustPrice(-50000)}
                className="px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-[11px] font-bold font-mono transition-colors cursor-pointer"
              >
                -50.000đ
              </button>
              <button
                type="button"
                onClick={() => handleAdjustPrice(10000)}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold font-mono transition-colors cursor-pointer"
              >
                +10.000đ
              </button>
              <button
                type="button"
                onClick={() => handleAdjustPrice(20000)}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold font-mono transition-colors cursor-pointer"
              >
                +20.000đ
              </button>
            </div>
          </div>

          {/* 2. HÌNH THỨC GIAO DỊCH */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-1.5">
              <Banknote className="w-4 h-4 text-blue-600" />
              2. Hình Thức Giao Dịch
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Option: Chuyển khoản */}
              <button
                type="button"
                onClick={() => setPaymentMethod('transfer')}
                className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                  paymentMethod === 'transfer'
                    ? 'border-blue-600 bg-blue-50/70 shadow-sm ring-2 ring-blue-600/20'
                    : 'border-neutral-200 hover:border-neutral-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      paymentMethod === 'transfer'
                        ? 'bg-blue-600 text-white'
                        : 'bg-neutral-100 text-neutral-600'
                    }`}
                  >
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      paymentMethod === 'transfer'
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-neutral-300'
                    }`}
                  >
                    {paymentMethod === 'transfer' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>
                <div>
                  <div className="font-bold text-sm text-neutral-900">Chuyển khoản</div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">
                    Quét mã VietQR / Ngân hàng
                  </div>
                </div>
              </button>

              {/* Option: Tiền mặt */}
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                  paymentMethod === 'cash'
                    ? 'border-emerald-600 bg-emerald-50/70 shadow-sm ring-2 ring-emerald-600/20'
                    : 'border-neutral-200 hover:border-neutral-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      paymentMethod === 'cash'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-neutral-100 text-neutral-600'
                    }`}
                  >
                    <Banknote className="w-5 h-5" />
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      paymentMethod === 'cash'
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : 'border-neutral-300'
                    }`}
                  >
                    {paymentMethod === 'cash' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>
                <div>
                  <div className="font-bold text-sm text-neutral-900">Tiền mặt</div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">
                    Thanh toán tiền mặt tại quầy
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Order Details Preview */}
          <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-neutral-700">
              <span className="flex items-center gap-1">
                <Utensils className="w-3.5 h-3.5 text-neutral-400" />
                Danh sách món ăn ({order.items.reduce((s, it) => s + it.quantity, 0)} món)
              </span>
              <span className="text-neutral-400 font-mono text-[11px]">
                {new Date(order.createdAt).toLocaleTimeString('vi-VN')} {new Date(order.createdAt).toLocaleDateString('vi-VN')}
              </span>
            </div>
            <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1">
              {order.items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-xs py-1 border-b border-neutral-100 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-neutral-800">x{item.quantity}</span>
                    <span className="text-neutral-700">{item.name}</span>
                    {item.size && (
                      <span className="text-[10px] text-neutral-500 bg-neutral-200/70 px-1 rounded">
                        {item.size}
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-neutral-600">
                    {formatVND(item.price * item.quantity)}đ
                  </span>
                </div>
              ))}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-neutral-300 hover:bg-neutral-100 text-neutral-700 font-bold text-xs transition-colors cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-2"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>Lưu Thay Đổi</span>
          </button>
        </div>
      </div>
    </div>
  );
};
