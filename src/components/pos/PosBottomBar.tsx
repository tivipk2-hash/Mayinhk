import React from 'react';
import { User } from '../../types';
import { Search, UserCheck, MapPin, Keyboard } from 'lucide-react';

interface PosBottomBarProps {
  currentUser: User;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onNumpadPress: (key: string) => void;
}

export const PosBottomBar: React.FC<PosBottomBarProps> = ({
  currentUser,
  searchQuery,
  onSearchChange,
  onNumpadPress,
}) => {
  return (
    <footer className="bg-neutral-900 text-white px-4 py-2 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-3 text-xs">
      {/* Search Input Bar (F4) */}
      <div className="flex-1 min-w-[280px] max-w-md relative">
        <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Nhập tên mặt hàng để tìm nhanh (F4)..."
          className="w-full pl-9 pr-8 py-1.5 rounded-lg bg-neutral-800 border border-neutral-700 text-white text-xs placeholder:text-neutral-500 focus:outline-none focus:border-blue-500"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white text-xs"
          >
            ✕
          </button>
        )}
      </div>

      {/* Quick Num keys on touchscreen */}
      <div className="hidden xl:flex items-center gap-1 font-mono">
        <span className="text-[11px] text-neutral-500 mr-1 flex items-center gap-1 font-sans">
          <Keyboard className="w-3.5 h-3.5" /> Phím số:
        </span>
        {['1', '2', '3', '4', '5', '10', '20', '50'].map(num => (
          <button
            key={num}
            onClick={() => onNumpadPress(num)}
            className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs font-bold transition-colors"
          >
            {num}
          </button>
        ))}
      </div>

      {/* Staff and Store Location Tag */}
      <div className="flex items-center gap-3 text-neutral-400">
        <span className="flex items-center gap-1 text-neutral-300">
          <UserCheck className="w-3.5 h-3.5 text-amber-400" />
          <strong className="text-white">{currentUser.name}</strong>
        </span>
        <span>•</span>
        <span className="flex items-center gap-1 text-amber-400/90 font-serif">
          <MapPin className="w-3.5 h-3.5 text-amber-500" />
          HongKong Cổ Trấn
        </span>
      </div>
    </footer>
  );
};
