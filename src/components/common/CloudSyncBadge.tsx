import React, { useState, useEffect } from 'react';
import { onSyncStatusChange, getSyncStatus, getLastSyncError, SyncStatus, validateFirestoreConnection } from '../../services/firebase';
import { Cloud, CloudOff, RefreshCw, CheckCircle2, AlertTriangle, Smartphone, Monitor, Globe } from 'lucide-react';

interface CloudSyncBadgeProps {
  className?: string;
  compact?: boolean;
}

export const CloudSyncBadge: React.FC<CloudSyncBadgeProps> = ({ className = '', compact = false }) => {
  const [status, setStatus] = useState<SyncStatus>(getSyncStatus());
  const [errorMsg, setErrorMsg] = useState(getLastSyncError());
  const [showPopover, setShowPopover] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    return onSyncStatusChange((newStatus, error) => {
      setStatus(newStatus);
      if (error) setErrorMsg(error);
    });
  }, []);

  const handleManualSync = async () => {
    setIsRetrying(true);
    await validateFirestoreConnection();
    setTimeout(() => setIsRetrying(false), 800);
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        onClick={() => setShowPopover(!showPopover)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
          status === 'synced'
            ? 'bg-emerald-950/80 border-emerald-600/50 text-emerald-300 hover:bg-emerald-900'
            : status === 'syncing' || status === 'connecting'
            ? 'bg-blue-950/80 border-blue-600/50 text-blue-300 hover:bg-blue-900'
            : 'bg-amber-950/80 border-amber-600/50 text-amber-300 hover:bg-amber-900'
        }`}
        title="Nhấp để xem chi tiết đồng bộ dữ liệu đa thiết bị"
      >
        {status === 'synced' ? (
          <>
            <Cloud className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            {!compact && <span>Đồng bộ Cloud</span>}
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          </>
        ) : status === 'syncing' || status === 'connecting' ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin" />
            {!compact && <span>Đang đồng bộ...</span>}
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
          </>
        ) : (
          <>
            <CloudOff className="w-3.5 h-3.5 text-amber-400" />
            {!compact && <span>Offline / Cục bộ</span>}
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          </>
        )}
      </button>

      {/* Popover Card */}
      {showPopover && (
        <div className="absolute top-full mt-2 right-0 z-50 w-72 sm:w-80 p-4 rounded-2xl bg-neutral-900 border border-neutral-700 shadow-2xl text-neutral-200 text-xs space-y-3 animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-white text-xs">Đồng Bộ Đa Thiết Bị & Khác Mạng</span>
            </div>
            <button
              onClick={() => setShowPopover(false)}
              className="text-neutral-400 hover:text-white text-xs font-bold"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2 text-[11px] leading-relaxed">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Dữ liệu được lưu trữ trên Firebase Firestore Cloud:</strong>
                <p className="text-neutral-400 mt-0.5">
                  Tất cả máy tính bàn, laptop, máy tính bảng iPad, điện thoại ở mạng Wifi khác hoặc 4G/5G đều tự động nhận dữ liệu giống nhau theo thời gian thực (Real-time).
                </p>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-neutral-800/80 border border-neutral-700/60 flex items-center justify-between">
              <span className="text-neutral-400">Trạng thái:</span>
              <span className="font-bold font-mono text-emerald-400 flex items-center gap-1">
                {status === 'synced' ? '● Trực Tuyến 100%' : status === 'syncing' ? 'Đang cập nhật' : 'Ngoại tuyến'}
              </span>
            </div>

            {errorMsg && (
              <div className="p-2 rounded-lg bg-red-950/60 border border-red-800 text-red-300 text-[10px]">
                {errorMsg}
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-neutral-800 flex items-center justify-between">
            <span className="text-[10px] text-neutral-400">Dùng chung cho toàn chuỗi quán</span>
            <button
              onClick={handleManualSync}
              disabled={isRetrying}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} />
              <span>Kiểm tra kết nối</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
