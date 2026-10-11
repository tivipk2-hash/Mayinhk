import React, { useState, useEffect } from 'react';
import { X, Percent, Check, RotateCcw } from 'lucide-react';
import { formatVND } from '../../services/qzService';

interface DiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  subtotal: number;
  currentDiscount: number;
  onApplyDiscount: (discount: number) => void;
}

export const DiscountModal: React.FC<DiscountModalProps> = ({
  isOpen,
  onClose,
  subtotal,
  currentDiscount,
  onApplyDiscount,
}) => {
  // Input raw amount state
  const [discountAmount, setDiscountAmount] = useState<number>(currentDiscount || 0);
  const [activePercent, setActivePercent] = useState<number | null>(null);

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      setDiscountAmount(currentDiscount || 0);
      if (subtotal > 0 && currentDiscount > 0) {
        const pct = Math.round((currentDiscount / subtotal) * 100);
        if ([10, 20, 50].includes(pct)) {
          setActivePercent(pct);
        } else {
          setActivePercent(null);
        }
      } else {
        setActivePercent(null);
      }
    }
  }, [isOpen, currentDiscount, subtotal]);

  if (!isOpen) return null;

  // Handle Quick Percent Buttons (10%, 20%, 50%)
  const handleSelectPercent = (percent: number) => {
    const calc = Math.min(subtotal, Math.round((subtotal * percent) / 100));
    setDiscountAmount(calc);
    setActivePercent(percent);
  };

  // Handle direct input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '');
    const num = rawVal ? parseInt(rawVal, 10) : 0;
    const bounded = Math.min(subtotal, Math.max(0, num));
    setDiscountAmount(bounded);
    setActivePercent(null);
  };

  // Reset to 0đ (không giảm giá)
  const handleResetZero = () => {
    setDiscountAmount(0);
    setActivePercent(null);
  };

  // Complete and Apply
  const handleConfirm = () => {
    onApplyDiscount(discountAmount);
    onClose();
  };

  const finalTotal = Math.max(0, subtotal - discountAmount);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150">
      <div
        className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden border border-neutral-200 text-neutral-800 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-neutral-900 text-white px-4 py-3 flex items-center justify-between border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-red-600/20 text-red-500 border border-red-500/30 flex items-center justify-center">
              <Percent className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">Chiết Khấu Đơn Hàng</h3>
              <p className="text-[11px] text-neutral-400">
                Tiền hàng: <strong className="text-amber-400 font-mono">{formatVND(subtotal)}đ</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-4">
          {/* Ô nhập số tiền trực tiếp */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-neutral-700">
                Số tiền giảm giá (VNĐ):
              </label>
              {discountAmount > 0 && (
                <button
                  type="button"
                  onClick={handleResetZero}
                  className="text-[11px] text-neutral-500 hover:text-red-600 font-medium flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3 h-3" /> Đặt lại 0đ
                </button>
              )}
            </div>

            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={discountAmount === 0 ? '' : formatVND(discountAmount)}
                onChange={handleInputChange}
                placeholder="0"
                autoFocus
                className="w-full pl-3 pr-10 py-2.5 bg-neutral-50 border-2 border-neutral-300 focus:border-red-500 focus:bg-white rounded-xl text-lg font-black font-mono text-red-600 placeholder:text-neutral-400 outline-none transition-all text-right"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-neutral-500 pointer-events-none">
                đ
              </span>
            </div>
            <p className="text-[11px] text-neutral-500 mt-1">
              * Mặc định là 0đ. Nhập số tiền trực tiếp hoặc bấm nút chọn nhanh bên dưới.
            </p>
          </div>

          {/* Các nút lựa chọn nhanh có sẵn: Giảm 10%, Giảm 20%, Giảm 50% */}
          <div>
            <span className="block text-xs font-bold text-neutral-700 mb-1.5">
              Chọn nhanh mức giảm:
            </span>
            <div className="grid grid-cols-3 gap-2">
              {[10, 20, 50].map((pct) => {
                const isSelected = activePercent === pct;
                const amt = Math.round((subtotal * pct) / 100);

                return (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => handleSelectPercent(pct)}
                    className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 select-none ${
                      isSelected
                        ? 'bg-red-50 text-red-700 border-red-500 shadow-sm ring-1 ring-red-400'
                        : 'bg-neutral-100 hover:bg-neutral-200/80 text-neutral-700 border-neutral-200'
                    }`}
                  >
                    <span className="text-[13px] font-black text-red-600">Giảm {pct}%</span>
                    <span className="text-[10px] font-mono text-neutral-500 font-normal">
                      -{formatVND(amt)}đ
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preview Totals Summary Box */}
          <div className="p-2.5 rounded-xl bg-neutral-100 border border-neutral-200 space-y-1 text-xs">
            <div className="flex justify-between text-neutral-600">
              <span>Tiền hàng:</span>
              <span className="font-mono font-bold">{formatVND(subtotal)}đ</span>
            </div>
            <div className="flex justify-between text-red-600 font-bold">
              <span>Được giảm:</span>
              <span className="font-mono">-{formatVND(discountAmount)}đ</span>
            </div>
            <div className="pt-1 border-t border-neutral-200 flex justify-between items-baseline font-black">
              <span className="text-neutral-900">TỔNG SAU GIẢM:</span>
              <span className="text-sm text-blue-700 font-mono">
                {formatVND(finalTotal)}đ
              </span>
            </div>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="p-3 bg-neutral-50 border-t border-neutral-200 flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-3 rounded-xl border border-neutral-300 text-neutral-700 hover:bg-neutral-100 font-bold text-xs transition-colors cursor-pointer select-none"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-2 py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>Giảm Giá</span>
          </button>
        </div>
      </div>
    </div>
  );
};
