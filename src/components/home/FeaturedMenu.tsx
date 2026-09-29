import React from 'react';
import { MenuItem } from '../../types';
import { formatVND } from '../../services/qzService';
import { ArrowRight, Coffee } from 'lucide-react';

interface FeaturedMenuProps {
  menu: MenuItem[];
  onOpenPos: () => void;
}

export const FeaturedMenu: React.FC<FeaturedMenuProps> = ({ menu, onOpenPos }) => {
  // Pick featured 6 drinks matching the screenshot
  const featured = menu.slice(0, 6);

  return (
    <section className="max-w-6xl mx-auto px-4 py-12 border-t border-amber-950/40">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
        <div>
          <span className="text-xs font-mono uppercase tracking-widest text-amber-500 flex items-center gap-1.5">
            <Coffee className="w-3.5 h-3.5" /> THỰC ĐƠN ĐẶC SẮC
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold font-serif text-amber-100 mt-1">
            Thức Uống Hương Vị Cổ Trấn
          </h2>
        </div>
        <button
          onClick={onOpenPos}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-amber-400 hover:text-amber-300 transition-colors"
        >
          <span>Xem hệ thống gọi món POS</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {featured.map((item) => (
          <div
            key={item.id}
            onClick={onOpenPos}
            className="group cursor-pointer rounded-xl overflow-hidden bg-gradient-to-b from-[#1c120c] to-[#120a06] border border-amber-900/30 hover:border-amber-500/50 p-2.5 transition-all duration-300 hover:-translate-y-1 shadow-md"
          >
            <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-neutral-900 mb-2">
              <img
                src={item.image}
                alt={item.name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                loading="lazy"
              />
              <div className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[11px] font-bold text-amber-400 font-mono">
                {formatVND(item.price)}đ
              </div>
            </div>

            <div className="text-center">
              <span className="text-[10px] text-amber-600 uppercase font-mono tracking-wider">{item.category}</span>
              <h4 className="text-xs sm:text-sm font-semibold text-neutral-200 group-hover:text-amber-300 transition-colors truncate">
                {item.name}
              </h4>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
