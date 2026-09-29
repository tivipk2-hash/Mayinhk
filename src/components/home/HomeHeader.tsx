import React from 'react';
import { HomepageConfig, User } from '../../types';
import { Clock, Wifi, UserCheck, ShieldCheck, Phone, MapPin, Coffee, FileText } from 'lucide-react';
import { CloudSyncBadge } from '../common/CloudSyncBadge';

interface HomeHeaderProps {
  config: HomepageConfig;
  currentUser: User | null;
  onOpenPos: () => void;
  onOpenAdmin: () => void;
}

export const HomeHeader: React.FC<HomeHeaderProps> = ({
  config,
  currentUser,
  onOpenPos,
  onOpenAdmin,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-neutral-950/90 backdrop-blur-md border-b border-amber-950/60 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Left: Brand & Chinese Seal */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-700 via-red-800 to-red-950 border border-red-500 flex items-center justify-center text-amber-300 font-serif font-black text-xl shadow-md shadow-red-950/60">
            港
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif font-bold tracking-wider text-amber-200 text-lg sm:text-xl">
                {config.shopName}
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800/40">
                EST. 1998
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 flex items-center gap-2">
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-amber-500" /> {config.address}</span>
              <span className="hidden sm:inline text-neutral-600">•</span>
              <span className="hidden sm:flex items-center gap-1"><Phone className="w-3 h-3 text-amber-500" /> Hotline: {config.hotline}</span>
            </p>
          </div>
        </div>

        {/* Center / Right meta items */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Working hours & Wifi */}
          <div className="hidden md:flex items-center gap-4 text-xs text-neutral-300 border-r border-neutral-800 pr-4">
            <span className="flex items-center gap-1 text-neutral-400">
              <Clock className="w-3.5 h-3.5 text-amber-500" /> {config.openHours}
            </span>
            <span className="flex items-center gap-1 text-neutral-400">
              <Wifi className="w-3.5 h-3.5 text-amber-500" /> {config.wifiSsid}
            </span>
          </div>

          {/* If already logged in as Admin */}
          {currentUser && currentUser.role === 'admin' && (
            <button
              onClick={onOpenAdmin}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-950/80 text-amber-300 hover:bg-amber-900 border border-amber-700/60 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Quản Trị</span> Cài Đặt
            </button>
          )}

          {/* If logged in as Viewer (Xem sổ sách) */}
          {currentUser && currentUser.role === 'viewer' && (
            <button
              onClick={onOpenAdmin}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-950/90 text-blue-300 hover:bg-blue-900 border border-blue-600/70 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            >
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              <span>Xem Sổ Sách</span>
            </button>
          )}

          {/* Multi-Device Cloud Sync Status */}
          <CloudSyncBadge />

          {/* Button "Nhân Viên" on top right as requested */}
          <button
            onClick={onOpenPos}
            className="px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-gradient-to-r from-amber-700 via-orange-600 to-amber-600 hover:from-amber-600 hover:to-orange-500 text-white shadow-lg shadow-orange-950/50 border border-orange-400/40 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <UserCheck className="w-4 h-4 text-amber-200" />
            <span>Nhân Viên</span>
            <span className="text-amber-200 text-xs">›</span>
          </button>
        </div>
      </div>
    </header>
  );
};
