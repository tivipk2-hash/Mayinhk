import React, { useEffect, useState } from 'react';
import { User, Shift, PrinterSettings } from '../../types';
import { printBridgeInstance, BridgeConnectionStatus, DEFAULT_BRIDGE_WS_URL } from '../../services/printBridgeService';
import {
  Settings,
  LogOut,
  Home,
  Clock,
  Printer,
  User as UserIcon,
  ShieldAlert,
  Monitor
} from 'lucide-react';
import { CloudSyncBadge } from '../common/CloudSyncBadge';

interface PosHeaderProps {
  currentUser: User;
  currentShift: Shift | null;
  printerSettings: PrinterSettings;
  onOpenSettings: () => void;
  onLogout: () => void;
  onBackToHome: () => void;
  onOpenCustomerDisplay?: () => void;
}

export const PosHeader: React.FC<PosHeaderProps> = ({
  currentUser,
  currentShift,
  printerSettings,
  onOpenSettings,
  onLogout,
  onBackToHome,
  onOpenCustomerDisplay,
}) => {
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [bridgeStatus, setBridgeStatus] = useState<BridgeConnectionStatus>(printBridgeInstance.getStatus());
  const [adminDeniedToast, setAdminDeniedToast] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setDateStr(now.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    return printBridgeInstance.onStatusChange((status) => setBridgeStatus(status));
  }, []);

  const handleSettingsClick = () => {
    if (currentUser.role !== 'admin') {
      setAdminDeniedToast(true);
      setTimeout(() => setAdminDeniedToast(false), 3500);
      return;
    }
    onOpenSettings();
  };

  const billIp = printerSettings.billPrinterIp || '192.168.1.79';
  const labelIp = printerSettings.labelPrinterIp || '192.168.1.52';

  return (
    <header className="bg-neutral-900 text-white px-4 py-2.5 flex items-center justify-between border-b border-neutral-800 shadow-md">
      {/* Left: Brand & Location */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBackToHome}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold transition-colors cursor-pointer"
          title="Về Trang Chủ Khách Hàng"
        >
          <Home className="w-4 h-4 text-amber-400" />
          <span>Trang Chủ</span>
        </button>

        <div className="h-5 w-px bg-neutral-700 hidden sm:block" />

        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm sm:text-base text-amber-300 font-serif">HongKong Cổ Trấn</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800/40 font-mono">
              POS V2.4
            </span>
          </div>
          <div className="text-[11px] text-neutral-400 flex items-center gap-2">
            <span>Ca: {currentShift?.date || 'Hôm nay'}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-neutral-500" />
              {timeStr} ({dateStr})
            </span>
          </div>
        </div>
      </div>

      {/* Center: LAN Printer Status */}
      <div className="hidden lg:flex items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-800 border border-neutral-700" title="Máy in Hóa đơn">
          <Printer className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-neutral-400">Bill:</span>
          <span className="font-mono text-neutral-200 font-semibold">{billIp}</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-800 border border-neutral-700" title="Máy in Tem dán ly">
          <Printer className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-neutral-400">Tem:</span>
          <span className="font-mono text-neutral-200 font-semibold">{labelIp}</span>
        </div>
        <div className="flex items-center gap-1.5" title="Local Print Bridge (ws://localhost:13579)">
          <span className={`w-2 h-2 rounded-full ${
            bridgeStatus === 'connected'
              ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]'
              : bridgeStatus === 'connecting'
              ? 'bg-amber-500 animate-pulse'
              : 'bg-red-500'
          }`} />
          <span className="text-[11px] text-neutral-400 font-mono">
            {bridgeStatus === 'connected'
              ? 'Print Bridge Online'
              : bridgeStatus === 'connecting'
              ? 'Đang kết nối...'
              : 'Print Bridge Offline'}
          </span>
        </div>
      </div>

      {/* Right: Staff Info & Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Real-time Multi-Device Cloud Sync */}
        <CloudSyncBadge />

        {/* Customer Facing Display Button */}
        {onOpenCustomerDisplay && (
          <button
            onClick={onOpenCustomerDisplay}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-200 text-xs font-semibold shadow-xs transition-all hover:scale-105 active:scale-95 cursor-pointer"
            title="Mở Màn Hình Phụ Cho Khách (Customer Facing Display)"
          >
            <Monitor className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Màn hình phụ</span>
          </button>
        )}

        {/* User badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-800/80 border border-neutral-700/60">
          <UserIcon className="w-3.5 h-3.5 text-amber-400" />
          <div className="text-left">
            <span className="block text-xs font-bold text-neutral-100">{currentUser.name}</span>
            <span className="block text-[10px] text-neutral-400 font-mono uppercase">
              {currentUser.role === 'admin' ? 'Quản Trị Viên' : 'Nhân Viên Bán Hàng'}
            </span>
          </div>
        </div>

        {/* Settings button */}
        <button
          onClick={handleSettingsClick}
          className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
            currentUser.role === 'admin'
              ? 'bg-amber-600 hover:bg-amber-500 text-black shadow-sm font-bold'
              : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-400'
          }`}
          title={currentUser.role === 'admin' ? 'Cài đặt hệ thống' : 'Chỉ Admin mới có quyền truy cập'}
        >
          <Settings className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Cài đặt</span>
        </button>

        {/* Logout button */}
        <button
          onClick={onLogout}
          className="p-2 rounded-lg bg-neutral-800 hover:bg-red-950 hover:text-red-300 text-neutral-400 transition-colors cursor-pointer"
          title="Đăng xuất khỏi hệ thống"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* Toast alert if Staff tries to click Settings */}
      {adminDeniedToast && (
        <div className="absolute top-14 right-4 z-50 bg-red-900 border border-red-500 text-white text-xs px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 animate-bounce">
          <ShieldAlert className="w-4 h-4 text-amber-300 shrink-0" />
          <span>Chỉ tài khoản <strong>Admin</strong> mới có quyền truy cập vào phần Cài Đặt!</span>
        </div>
      )}
    </header>
  );
};
