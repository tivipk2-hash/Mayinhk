import React from 'react';
import { MenuItem, CategoryConfig } from '../../types';
import { formatVND } from '../../services/qzService';
import { isItemPrintable } from '../../services/categoryService';
import { Plus, Check, Ban, Tag } from 'lucide-react';

interface ProductGridProps {
  items: MenuItem[];
  onSelectItem: (item: MenuItem) => void;
  selectedItemIds?: string[];
  categoryConfigs?: CategoryConfig[];
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  items,
  onSelectItem,
  selectedItemIds = [],
  categoryConfigs,
}) => {
  if (items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-neutral-400 bg-neutral-50">
        <p className="text-sm font-medium">Không tìm thấy món phù hợp</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 bg-neutral-50">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
        {items.map((item) => {
          const inCart = selectedItemIds.includes(item.id);
          const printable = isItemPrintable(item, categoryConfigs);

          return (
            <div
              key={item.id}
              onClick={() => onSelectItem(item)}
              className={`group relative rounded-xl overflow-hidden bg-white border-2 cursor-pointer transition-all duration-150 active:scale-95 shadow-sm hover:shadow-md flex flex-col justify-between ${
                inCart
                  ? 'border-blue-500 ring-2 ring-blue-400/30'
                  : 'border-neutral-200 hover:border-blue-400'
              }`}
            >
              {/* Image & Price Ribbon */}
              <div className="relative aspect-square w-full bg-neutral-100 overflow-hidden">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />

                {/* Top Price Bar matching b1.jpg */}
                <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded bg-blue-600/95 text-white text-[11px] font-bold shadow-xs">
                  {formatVND(item.price)}đ
                </div>

                {/* Sticker Label Rule Badge: Không in tem vs In tem */}
                {!printable && (
                  <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-neutral-900/80 backdrop-blur-xs text-amber-300 text-[9px] font-semibold flex items-center gap-0.5 shadow-xs" title="Món này thuộc danh mục phụ kiện/đồ dùng - Không in tem">
                    <Ban className="w-2.5 h-2.5 text-amber-400" />
                    <span>Không in tem</span>
                  </div>
                )}

                {inCart && (
                  <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}
              </div>

              {/* Item Name in bold black text */}
              <div className="p-2.5 bg-white text-center flex flex-col justify-center min-h-[46px]">
                <h4 className="text-xs sm:text-sm font-bold text-neutral-900 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">
                  {item.name}
                </h4>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
