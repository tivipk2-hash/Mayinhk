import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  Monitor,
  X,
  ExternalLink,
  Copy,
  Check,
  QrCode,
  Smartphone,
  Tv,
  Sparkles,
  Info
} from 'lucide-react';
import { broadcastToCustomerDisplay } from '../../services/customerDisplayService';
import { Order, VietQRConfig } from '../../types';

interface CustomerDisplayModalProps {
  currentOrder: Order;
  vietQr?: VietQRConfig;
  onClose: () => void;
}

export const CustomerDisplayModal: React.FC<CustomerDisplayModalProps> = ({
  currentOrder,
  vietQr,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [pingSuccess, setPingSuccess] = useState(false);

  // Generate full URL
  const displayUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?pos=orderdisplay`
    : 'https://banhang.com?pos=orderdisplay';

  useEffect(() => {
    QRCode.toDataURL(displayUrl, {
      width: 250,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Error generating display QR:', err));
  }, [displayUrl]);

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(displayUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleOpenWindow = () => {
    const width = 1200;
    const height = 800;
    const left = window.screen.width ? (window.screen.width - width) / 2 : 100;
    const top = window.screen.height ? (window.screen.height - height) / 2 : 100;

    window.open(
      displayUrl,
      'CustomerFacingDisplay',
      `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=yes`
    );
  };

  const handleOpenTab = () => {
    window.open(displayUrl, '_blank');
  };

  // Send a test test ping to verify connection
  const handleTestPing = () => {
    broadcastToCustomerDisplay({
      order: currentOrder,
      status: currentOrder.items.length > 0 ? 'ordering' : 'idle',
      lastUpdated: Date.now(),
      vietQr,
      lastAction: 'item_added',
      lastActionItemName: 'Kiểm tra kết nối',
    });
    setPingSuccess(true);
    setTimeout(() => setPingSuccess(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl relative text-neutral-100 flex flex-col gap-5">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 pr-10">
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Monitor className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold font-serif text-neutral-100 flex items-center gap-2">
              <span>Màn Hình Phụ Cho Khách (Customer Display)</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800">
                LIVE SYNC
              </span>
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Hiển thị món ăn, giá tiền, mã VietQR và dòng "Thanks for your order" cho khách hàng đối diện
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={handleOpenWindow}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-black font-bold text-sm shadow-lg shadow-amber-950/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Tv className="w-4 h-4" />
            <span>Mở Cửa Sổ Màn Hình Phụ</span>
          </button>

          <button
            onClick={handleOpenTab}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-100 font-semibold text-sm border border-neutral-700 transition-all"
          >
            <ExternalLink className="w-4 h-4 text-amber-400" />
            <span>Mở Tab Trình Duyệt Mới</span>
          </button>
        </div>

        {/* Link & Copy Box */}
        <div className="bg-neutral-950 rounded-2xl p-4 border border-neutral-800 space-y-2">
          <label className="text-xs font-semibold text-neutral-400 flex items-center gap-1.5">
            <Monitor className="w-3.5 h-3.5 text-amber-400" />
            <span>Đường link chuyên dụng cho màn hình phụ:</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={displayUrl}
              className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs font-mono text-amber-300 select-all outline-hidden"
            />
            <button
              onClick={handleCopyLink}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
            </button>
          </div>
        </div>

        {/* QR Code to open on iPad / Tablet / Phone */}
        <div className="bg-neutral-950/70 rounded-2xl p-4 border border-neutral-800 flex flex-col sm:flex-row items-center gap-4">
          <div className="p-2 bg-white rounded-xl shadow-md shrink-0">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR Display Link" className="w-28 h-28 object-contain" />
            ) : (
              <div className="w-28 h-28 flex items-center justify-center text-xs text-neutral-500">
                Đang tạo QR...
              </div>
            )}
          </div>
          <div className="space-y-1.5 text-center sm:text-left flex-1">
            <div className="flex items-center justify-center sm:justify-start gap-1.5 text-sm font-bold text-neutral-200">
              <Smartphone className="w-4 h-4 text-amber-400" />
              <span>Dùng máy tính bảng hoặc iPad đặt tại quầy</span>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Mở camera trên iPad / Tablet / Điện thoại của quầy và quét mã QR này để hiển thị màn hình phụ. Mọi thao tác chọn món và xóa món sẽ tự động đồng bộ tức thì!
            </p>
          </div>
        </div>

        {/* Test Ping */}
        <div className="flex items-center justify-between pt-2 border-t border-neutral-800/80 text-xs">
          <div className="flex items-center gap-2 text-neutral-400">
            <Info className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Tự động cập nhật 0ms khi nhân viên thêm hoặc xóa món</span>
          </div>

          <button
            onClick={handleTestPing}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              pingSuccess
                ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border-neutral-700'
            }`}
          >
            {pingSuccess ? '✓ Đã gửi tín hiệu kiểm tra!' : '⚡ Thử gửi tín hiệu'}
          </button>
        </div>
      </div>
    </div>
  );
};
