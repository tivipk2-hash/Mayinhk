import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title?: string;
  type: 'bill' | 'expense' | 'other';
  targetName?: string;
  targetDetails?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  title,
  type,
  targetName,
  targetDetails,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const typeLabel = type === 'bill' ? 'Bill' : type === 'expense' ? 'Phiếu chi' : 'dữ liệu';
  const defaultTitle = type === 'bill' ? 'Xác nhận xóa Bill' : type === 'expense' ? 'Xác nhận xóa Phiếu chi' : 'Xác nhận xóa dữ liệu';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
      >
        {/* Header with warning badge */}
        <div className="p-5 pb-4 flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-red-100 border border-red-200 text-red-600 flex items-center justify-center shrink-0 shadow-xs">
            <AlertTriangle className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div className="flex-1 min-w-0 pr-2">
            <h3 id="confirm-modal-title" className="text-base font-bold text-neutral-900 leading-snug">
              {title || defaultTitle}
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Thao tác này sẽ xóa vĩnh viễn dữ liệu khỏi hệ thống
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer"
            title="Hủy"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body content */}
        <div className="px-5 py-3 bg-neutral-50/70 border-y border-neutral-100">
          <p className="text-sm text-neutral-700 leading-relaxed font-medium">
            Bạn có chắc chắn muốn xóa <span className="font-bold text-red-600">{typeLabel}</span> này không? Hành động này không thể hoàn tác.
          </p>

          {/* Target preview card if provided */}
          {(targetName || targetDetails) && (
            <div className="mt-3 p-3 rounded-xl bg-white border border-neutral-200/80 shadow-xs text-xs">
              {targetName && (
                <div className="font-bold text-neutral-800 truncate flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                  <span>{targetName}</span>
                </div>
              )}
              {targetDetails && (
                <div className="text-neutral-500 font-mono mt-1 text-[11px]">
                  {targetDetails}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-white flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl border border-neutral-300 text-neutral-700 hover:bg-neutral-100 text-sm font-semibold transition-all cursor-pointer active:scale-98"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold shadow-md shadow-red-600/20 flex items-center gap-2 transition-all cursor-pointer active:scale-98"
          >
            <Trash2 className="w-4 h-4" />
            <span>Xác nhận xóa</span>
          </button>
        </div>
      </div>
    </div>
  );
};
