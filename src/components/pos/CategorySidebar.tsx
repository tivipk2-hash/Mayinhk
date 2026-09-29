import React from 'react';
import { Coffee, Citrus, Utensils, Milk, Sparkles, Layers } from 'lucide-react';

interface CategorySidebarProps {
  categories: string[];
  activeCategory: string;
  onSelectCategory: (category: string) => void;
}

export const CategorySidebar: React.FC<CategorySidebarProps> = ({
  categories,
  activeCategory,
  onSelectCategory,
}) => {
  const getIcon = (cat: string) => {
    switch (cat.toUpperCase()) {
      case 'COFFEE':
        return <Coffee className="w-4 h-4" />;
      case 'NƯỚC TRÁI CÂY':
      case 'TRÀ TRÁI CÂY':
        return <Citrus className="w-4 h-4" />;
      case 'ĐỒ ĂN':
        return <Utensils className="w-4 h-4" />;
      case 'TRÀ SỮA':
      case 'SỮA TƯƠI':
      case 'YAOURT':
        return <Milk className="w-4 h-4" />;
      default:
        return <Layers className="w-4 h-4" />;
    }
  };

  return (
    <aside className="w-44 sm:w-48 bg-neutral-100 border-r border-neutral-200 flex flex-col shrink-0 overflow-y-auto select-none">
      <div className="p-2 space-y-1">
        <button
          onClick={() => onSelectCategory('ALL')}
          className={`w-full text-left px-3 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 ${
            activeCategory === 'ALL'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-neutral-800 hover:bg-neutral-200 border border-neutral-200'
          }`}
        >
          <Sparkles className="w-4 h-4 shrink-0" />
          <span>TẤT CẢ MÓN</span>
        </button>

        {categories.map((cat) => {
          const isSelected = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => onSelectCategory(cat)}
              className={`w-full text-left px-3 py-3 rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-2.5 ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-neutral-800 hover:bg-neutral-200 border border-neutral-200'
              }`}
            >
              <span className={`shrink-0 ${isSelected ? 'text-white' : 'text-blue-600'}`}>
                {getIcon(cat)}
              </span>
              <span className="truncate">{cat}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
};
