import React, { useState, useMemo } from 'react';
import { Expense } from '../../types';
import { formatVND } from '../../services/printBridgeService';
import {
  PieChart as PieChartIcon,
  Layers,
  Utensils,
  Package,
  Wifi,
  Users,
  ChevronDown,
  ChevronUp,
  Trash2,
  Calendar,
  Sparkles,
  ListFilter,
  DollarSign
} from 'lucide-react';

interface ExpenseChartSectionProps {
  expenses: Expense[];
  filterLabel: string;
  isViewer: boolean;
  onDeleteExpense: (id: string) => void;
}

// Convert numbers like 500000 -> 500k, 800000 -> 800k, 1200000 -> 1.2tr
export const formatExpenseShortK = (amount: number): string => {
  if (amount >= 1_000_000_000) {
    const val = amount / 1_000_000_000;
    return val % 1 === 0 ? `${val}tỷ` : `${val.toFixed(1)}tỷ`;
  }
  if (amount >= 1_000_000) {
    const val = amount / 1_000_000;
    return val % 1 === 0 ? `${val}tr` : `${val.toFixed(1)}tr`;
  }
  if (amount >= 1_000) {
    const val = amount / 1_000;
    return val % 1 === 0 ? `${val}k` : `${val.toFixed(1)}k`;
  }
  return `${amount}đ`;
};

interface CategoryMeta {
  key: string;
  title: string;
  color: string;
  bgLight: string;
  border: string;
  textColor: string;
  icon: React.ComponentType<{ className?: string }>;
}

const CATEGORY_META: Record<string, CategoryMeta> = {
  nguyen_lieu: {
    key: 'nguyen_lieu',
    title: 'Chi nguyên liệu tổng',
    color: '#ea580c', // Orange-600
    bgLight: 'bg-orange-50',
    border: 'border-orange-200',
    textColor: 'text-orange-700',
    icon: Utensils,
  },
  bao_bi: {
    key: 'bao_bi',
    title: 'Chi bao bì & ly tổng',
    color: '#0284c7', // Sky-600
    bgLight: 'bg-sky-50',
    border: 'border-sky-200',
    textColor: 'text-sky-700',
    icon: Package,
  },
  dien_nuoc: {
    key: 'dien_nuoc',
    title: 'Chi điện, nước & wifi tổng',
    color: '#0d9488', // Teal-600
    bgLight: 'bg-teal-50',
    border: 'border-teal-200',
    textColor: 'text-teal-700',
    icon: Wifi,
  },
  nhan_cong: {
    key: 'nhan_cong',
    title: 'Chi nhân công & lương tổng',
    color: '#7c3aed', // Violet-600
    bgLight: 'bg-violet-50',
    border: 'border-violet-200',
    textColor: 'text-violet-700',
    icon: Users,
  },
  khac: {
    key: 'khac',
    title: 'Chi khác',
    color: '#e11d48', // Rose-600
    bgLight: 'bg-rose-50',
    border: 'border-rose-200',
    textColor: 'text-rose-700',
    icon: Layers,
  },
};

const FALLBACK_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

const getMetaForCategory = (cat: string, index: number): CategoryMeta => {
  if (CATEGORY_META[cat]) {
    return CATEGORY_META[cat];
  }
  const color = FALLBACK_COLORS[index % FALLBACK_COLORS.length];
  return {
    key: cat,
    title: `Chi ${cat} tổng`,
    color: color,
    bgLight: 'bg-neutral-50',
    border: 'border-neutral-200',
    textColor: 'text-neutral-700',
    icon: Layers,
  };
};

export interface CategorySummaryItem {
  key: string;
  title: string;
  total: number;
  shortFormatted: string;
  percentage: number;
  items: Expense[];
  meta: CategoryMeta;
}

// Polar coordinate math for SVG arcs
const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
};

const describeDonutArc = (
  x: number,
  y: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number
) => {
  const diff = endAngle - startAngle;
  const actualEndAngle = diff >= 360 ? startAngle + 359.99 : endAngle;
  const startOuter = polarToCartesian(x, y, outerRadius, actualEndAngle);
  const endOuter = polarToCartesian(x, y, outerRadius, startAngle);
  const startInner = polarToCartesian(x, y, innerRadius, startAngle);
  const endInner = polarToCartesian(x, y, innerRadius, actualEndAngle);
  const largeArcFlag = diff <= 180 ? '0' : '1';

  return [
    'M', startOuter.x, startOuter.y,
    'A', outerRadius, outerRadius, 0, largeArcFlag, 0, endOuter.x, endOuter.y,
    'L', startInner.x, startInner.y,
    'A', innerRadius, innerRadius, 0, largeArcFlag, 1, endInner.x, endInner.y,
    'Z'
  ].join(' ');
};

export const ExpenseChartSection: React.FC<ExpenseChartSectionProps> = ({
  expenses,
  filterLabel,
  isViewer,
  onDeleteExpense,
}) => {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'summary' | 'all'>('summary');

  const totalExpenses = useMemo(() => {
    return expenses.reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  // Aggregate expenses by category
  const categorySummaries: CategorySummaryItem[] = useMemo(() => {
    const map: Record<string, { total: number; items: Expense[] }> = {};

    expenses.forEach((e) => {
      const cat = e.category || 'khac';
      if (!map[cat]) {
        map[cat] = { total: 0, items: [] };
      }
      map[cat].total += e.amount;
      map[cat].items.push(e);
    });

    const result = Object.entries(map).map(([key, data], idx) => {
      const meta = getMetaForCategory(key, idx);
      const percentage = totalExpenses > 0 ? (data.total / totalExpenses) * 100 : 0;
      return {
        key,
        title: meta.title,
        total: data.total,
        shortFormatted: formatExpenseShortK(data.total),
        percentage: Math.round(percentage * 10) / 10,
        items: data.items,
        meta,
      };
    });

    // Sort descending by total amount so highest expense category is first
    return result.sort((a, b) => b.total - a.total);
  }, [expenses, totalExpenses]);

  // SVG Arc calculation for each slice
  const donutSlices = useMemo(() => {
    if (totalExpenses <= 0 || categorySummaries.length === 0) return [];

    let currentAngle = 0;
    return categorySummaries.map((item) => {
      const sliceAngle = (item.total / totalExpenses) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + sliceAngle;
      currentAngle += sliceAngle;

      return {
        ...item,
        startAngle,
        endAngle,
      };
    });
  }, [categorySummaries, totalExpenses]);

  const activeCategoryItem = useMemo(() => {
    if (!hoveredCategory) return null;
    return categorySummaries.find((c) => c.key === hoveredCategory) || null;
  }, [hoveredCategory, categorySummaries]);

  const toggleCategoryExpand = (catKey: string) => {
    setExpandedCategory((prev) => (prev === catKey ? null : catKey));
  };

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white border border-neutral-200 shadow-sm flex flex-col space-y-5">
      {/* Section Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-neutral-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-red-100 text-red-700 flex items-center justify-center">
              <PieChartIcon className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
              Quản Lý Chi Phí & Biểu Đồ Cơ Cấu
            </h4>
          </div>
          <p className="text-[11px] text-neutral-400 mt-0.5">
            Phân tích tỷ lệ chi tiêu theo danh mục ({filterLabel})
          </p>
        </div>

        {/* View Switcher: Summary vs All Slips */}
        <div className="flex items-center bg-neutral-100 p-0.5 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setViewMode('summary')}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
              viewMode === 'summary'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            Tổng hợp danh mục
          </button>
          <button
            type="button"
            onClick={() => setViewMode('all')}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'all'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            <span>Tất cả phiếu chi</span>
            <span className="text-[10px] font-mono px-1 py-0.2 bg-neutral-200 rounded text-neutral-700">
              {expenses.length}
            </span>
          </button>
        </div>
      </div>

      {expenses.length === 0 ? (
        <div className="py-12 text-center text-neutral-400 text-xs flex flex-col items-center justify-center gap-2">
          <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-300">
            <Calendar className="w-6 h-6" />
          </div>
          <span className="font-medium">Chưa có khoản chi nào trong thời gian này ({filterLabel.toLowerCase()})</span>
        </div>
      ) : (
        <>
          {/* TOP: BIỂU ĐỒ CHI TIÊU TRỰC QUAN (PIE / DONUT CHART) */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-neutral-50/80 via-white to-neutral-50/40 border border-neutral-200/80">
            <div className="flex flex-col md:flex-row items-center gap-6 justify-center">
              {/* SVG Donut Chart */}
              <div className="relative w-48 h-48 shrink-0 flex items-center justify-center">
                <svg viewBox="0 0 240 240" className="w-full h-full transform -rotate-90">
                  {/* Background track circle */}
                  <circle
                    cx="120"
                    cy="120"
                    r="72"
                    fill="none"
                    stroke="#f3f4f6"
                    strokeWidth="28"
                  />

                  {/* Category Slices */}
                  {donutSlices.map((slice) => {
                    const isHovered = hoveredCategory === slice.key;
                    const pathData = describeDonutArc(
                      120,
                      120,
                      isHovered ? 54 : 58,
                      isHovered ? 92 : 86,
                      slice.startAngle,
                      slice.endAngle
                    );

                    return (
                      <path
                        key={slice.key}
                        d={pathData}
                        fill={slice.meta.color}
                        className="transition-all duration-300 cursor-pointer hover:opacity-90"
                        onMouseEnter={() => setHoveredCategory(slice.key)}
                        onMouseLeave={() => setHoveredCategory(null)}
                        onClick={() => toggleCategoryExpand(slice.key)}
                      >
                        <title>
                          {`${slice.title}: ${formatExpenseShortK(slice.total)} (${slice.percentage}%)`}
                        </title>
                      </path>
                    );
                  })}
                </svg>

                {/* Center Badge in the Donut */}
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-2 select-none"
                  style={{ transform: 'none' }}
                >
                  {activeCategoryItem ? (
                    <div className="animate-in fade-in zoom-in duration-150">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block line-clamp-1 max-w-[100px]">
                        {activeCategoryItem.title.replace('Chi ', '').replace(' tổng', '')}
                      </span>
                      <span className="text-base font-black font-mono text-neutral-900 block mt-0.5">
                        {activeCategoryItem.shortFormatted}
                      </span>
                      <span
                        className="text-[11px] font-bold font-mono px-1.5 py-0.5 rounded-full inline-block mt-0.5"
                        style={{
                          backgroundColor: `${activeCategoryItem.meta.color}18`,
                          color: activeCategoryItem.meta.color,
                        }}
                      >
                        {activeCategoryItem.percentage}%
                      </span>
                    </div>
                  ) : (
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                        TỔNG CHI
                      </span>
                      <span className="text-sm sm:text-base font-black font-mono text-red-600 block mt-0.5">
                        {formatExpenseShortK(totalExpenses)}
                      </span>
                      <span className="text-[10px] text-neutral-400 font-medium block mt-0.5">
                        {expenses.length} phiếu chi
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Legend & Ratio Overview */}
              <div className="flex-1 w-full space-y-2">
                <div className="text-xs font-bold text-neutral-700 uppercase tracking-wider flex items-center justify-between pb-1 border-b border-neutral-100">
                  <span>Tỷ Lệ Từng Nội Dung Chi</span>
                  <span className="font-mono text-neutral-500 font-normal">
                    Tổng: {formatVND(totalExpenses)}đ
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {categorySummaries.map((cat) => {
                    const isHovered = hoveredCategory === cat.key;
                    return (
                      <div
                        key={cat.key}
                        onMouseEnter={() => setHoveredCategory(cat.key)}
                        onMouseLeave={() => setHoveredCategory(null)}
                        onClick={() => toggleCategoryExpand(cat.key)}
                        className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 text-xs ${
                          isHovered
                            ? 'bg-white border-neutral-400 shadow-xs ring-1 ring-neutral-300'
                            : 'bg-white/70 border-neutral-200 hover:border-neutral-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: cat.meta.color }}
                          />
                          <span className="font-semibold text-neutral-800 truncate text-[11px]">
                            {cat.title}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-black font-mono text-neutral-900 block text-xs">
                            {cat.shortFormatted}
                          </span>
                          <span className="text-[10px] text-neutral-400 font-mono block">
                            {cat.percentage}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* VIEW MODE 1: BẢNG TỔNG HỢP CHI TIẾT PHÍA DƯỚI */}
          {viewMode === 'summary' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
                  <ListFilter className="w-3.5 h-3.5 text-neutral-500" />
                  Bảng Tổng Hợp Chi Tiết Theo Từng Nội Dung
                </h5>
                <span className="text-[11px] text-neutral-400">
                  Nhấp vào từng mục để xem chi tiết phiếu
                </span>
              </div>

              {/* Danh sách tổng số tiền đã chi cho từng nội dung cụ thể */}
              <div className="space-y-2">
                {categorySummaries.map((cat) => {
                  const Icon = cat.meta.icon;
                  const isExpanded = expandedCategory === cat.key;
                  const isHovered = hoveredCategory === cat.key;

                  return (
                    <div
                      key={cat.key}
                      className={`rounded-2xl border transition-all overflow-hidden ${
                        isHovered
                          ? 'border-neutral-400 shadow-sm'
                          : 'border-neutral-200 bg-white'
                      }`}
                    >
                      {/* Main Summary Row: Ví dụ "Chi nguyên liệu tổng: 500k", "Chi khác: 800k" */}
                      <div
                        onClick={() => toggleCategoryExpand(cat.key)}
                        onMouseEnter={() => setHoveredCategory(cat.key)}
                        onMouseLeave={() => setHoveredCategory(null)}
                        className="p-3.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-neutral-50/70 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs"
                            style={{
                              backgroundColor: `${cat.meta.color}15`,
                              color: cat.meta.color,
                            }}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-neutral-900 truncate">
                                {cat.title}
                              </span>
                              <span
                                className="px-1.5 py-0.2 rounded-md text-[10px] font-bold font-mono"
                                style={{
                                  backgroundColor: `${cat.meta.color}15`,
                                  color: cat.meta.color,
                                }}
                              >
                                {cat.percentage}%
                              </span>
                            </div>
                            <span className="text-[11px] text-neutral-400 mt-0.5 block">
                              {cat.items.length} khoản chi • Chiếm {cat.percentage}% tổng ngân sách
                            </span>
                          </div>
                        </div>

                        {/* Amount Highlight: 500k (500.000đ) */}
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <div className="flex items-baseline justify-end gap-1.5">
                              <span
                                className="font-black text-sm sm:text-base font-mono"
                                style={{ color: cat.meta.color }}
                              >
                                {cat.shortFormatted}
                              </span>
                              <span className="text-[11px] text-neutral-400 font-mono hidden sm:inline">
                                ({formatVND(cat.total)}đ)
                              </span>
                            </div>
                            <span className="text-[10px] text-neutral-400 font-mono block sm:hidden">
                              {formatVND(cat.total)}đ
                            </span>
                          </div>

                          <div className="text-neutral-400 hover:text-neutral-600 transition-colors">
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Percentage Bar */}
                      <div className="w-full h-1 bg-neutral-100">
                        <div
                          className="h-full transition-all duration-500"
                          style={{
                            width: `${cat.percentage}%`,
                            backgroundColor: cat.meta.color,
                          }}
                        />
                      </div>

                      {/* Expanded View: List of Slips in this Category */}
                      {isExpanded && (
                        <div className="p-3 bg-neutral-50/70 border-t border-neutral-100 space-y-2 animate-in fade-in duration-150">
                          <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider px-1">
                            Chi tiết {cat.items.length} phiếu chi thuộc {cat.title}:
                          </div>
                          <div className="space-y-1.5">
                            {cat.items.map((slip) => (
                              <div
                                key={slip.id}
                                className="p-2.5 rounded-xl bg-white border border-neutral-200 flex items-center justify-between text-xs"
                              >
                                <div className="min-w-0 pr-2">
                                  <div className="font-bold text-neutral-800 truncate">
                                    {slip.title}
                                  </div>
                                  <div className="text-[11px] text-neutral-400 mt-0.5">
                                    {slip.date} • Người chi: {slip.staffName || 'Admin'}
                                    {slip.note && ` • ${slip.note}`}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="font-black font-mono text-red-600">
                                    -{formatVND(slip.amount)}đ
                                  </span>
                                  {!isViewer && (
                                    <button
                                      type="button"
                                      onClick={() => onDeleteExpense(slip.id)}
                                      className="p-1 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                      title="Xóa phiếu chi này"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW MODE 2: TẤT CẢ PHIẾU CHI THEO THỜI GIAN */}
          {viewMode === 'all' && (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {expenses.map((e) => {
                const meta = getMetaForCategory(e.category || 'khac', 0);
                const Icon = meta.icon;
                return (
                  <div
                    key={e.id}
                    className="p-3 rounded-xl border border-neutral-200 bg-neutral-50 flex items-center justify-between text-xs hover:bg-white transition-all"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: `${meta.color}15`,
                          color: meta.color,
                        }}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-neutral-800 truncate">{e.title}</span>
                          <span
                            className="px-1.5 py-0.2 rounded text-[10px] font-medium"
                            style={{
                              backgroundColor: `${meta.color}15`,
                              color: meta.color,
                            }}
                          >
                            {meta.title.replace('Chi ', '').replace(' tổng', '')}
                          </span>
                        </div>
                        <div className="text-[11px] text-neutral-500 mt-0.5">
                          {e.date} • {e.staffName || 'Admin'}
                          {e.note && ` • ${e.note}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="font-black text-red-600 font-mono block">
                          -{formatVND(e.amount)}đ
                        </span>
                        <span className="text-[10px] text-neutral-400 font-mono">
                          {formatExpenseShortK(e.amount)}
                        </span>
                      </div>
                      {!isViewer && (
                        <button
                          type="button"
                          onClick={() => onDeleteExpense(e.id)}
                          className="p-1 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Xoá phiếu chi (Chỉ Admin)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};
