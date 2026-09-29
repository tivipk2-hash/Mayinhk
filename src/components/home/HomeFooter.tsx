import React from 'react';
import { HomepageConfig } from '../../types';
import { UserCheck, MapPin, Phone, Wifi, Key } from 'lucide-react';

interface HomeFooterProps {
  config: HomepageConfig;
  onOpenPos: () => void;
}

export const HomeFooter: React.FC<HomeFooterProps> = ({ config, onOpenPos }) => {
  return (
    <footer className="mt-16 bg-[#080504] border-t border-amber-950/70 py-10 px-4">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-red-800 border border-red-600 flex items-center justify-center text-amber-300 font-serif font-black text-sm">
              港
            </span>
            <span className="text-xl font-bold font-serif text-amber-200">{config.shopName}</span>
          </div>
          <p className="mt-2 text-xs text-neutral-400 flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-amber-500" /> Địa chỉ: {config.address}</span>
            <span>•</span>
            <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-amber-500" /> Hotline: {config.hotline}</span>
          </p>
          <p className="mt-1 text-xs text-neutral-400 flex items-center gap-3">
            <span className="flex items-center gap-1"><Wifi className="w-3.5 h-3.5 text-amber-500" /> Wifi quán: <strong className="text-amber-300">{config.wifiSsid}</strong></span>
            <span>•</span>
            <span className="flex items-center gap-1"><Key className="w-3.5 h-3.5 text-amber-500" /> Mật khẩu: <strong className="text-amber-300">{config.wifiPass}</strong></span>
          </p>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={onOpenPos}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-700 via-orange-600 to-amber-600 hover:from-amber-600 hover:to-orange-500 text-white font-medium text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-orange-950/40 border border-orange-400/40 transition-all hover:scale-105 active:scale-95"
          >
            <UserCheck className="w-4 h-4 text-amber-200" />
            <span>Cổng Đăng Nhập Nhân Viên POS</span>
          </button>
        </div>
      </div>
      <div className="max-w-6xl mx-auto mt-8 pt-4 border-t border-neutral-900 text-center text-[11px] text-neutral-600 font-mono">
        © 2026 {config.shopName}. Thiết kế đậm chất Hồng Kông thập niên 80-90. Hệ thống POS & QZ Tray LAN Printer.
      </div>
    </footer>
  );
};
