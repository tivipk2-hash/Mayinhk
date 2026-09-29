import React, { useState } from 'react';
import { OrderItem } from '../../types';
import { X, Check, Tag } from 'lucide-react';

interface NoteModalProps {
  item: OrderItem;
  onSaveNote: (updatedItem: OrderItem) => void;
  onClose: () => void;
}

const QUICK_TAGS = [
  'Ít đá',
  'Không đá',
  'Nhiều đá',
  'Đá riêng',
  '30% đường',
  '50% đường',
  '70% đường',
  'Không đường',
  'Ít ngọt',
  'Nhiều sữa',
  'Ít sữa',
  'Kem cheese riêng',
  'Trân châu riêng',
  'Uống nóng',
  'Mang đi',
  'Giao nhanh',
];

export const NoteModal: React.FC<NoteModalProps> = ({
  item,
  onSaveNote,
  onClose,
}) => {
  const [note, setNote] = useState(item.note || '');
  const [size, setSize] = useState(item.size || 'M');

  const handleToggleTag = (tag: string) => {
    if (!note) {
      setNote(tag);
      return;
    }

    const tags = note.split(', ').filter(Boolean);
    if (tags.includes(tag)) {
      setNote(tags.filter(t => t !== tag).join(', '));
    } else {
      setNote([...tags, tag].join(', '));
    }
  };

  const handleSave = () => {
    onSaveNote({
      ...item,
      note: note.trim(),
      size,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-2xl overflow-hidden border border-neutral-200 text-neutral-800 animate-in fade-in zoom-in-95">
        {/* Modal Header */}
        <div className="bg-neutral-900 text-white px-5 py-3.5 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-amber-400 font-mono font-medium uppercase tracking-wider">
              Chỉnh Sửa Món & Ghi Chú
            </span>
            <h3 className="text-base font-bold text-neutral-100">{item.name}</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-neutral-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Size Choice */}
          <div>
            <label className="block text-xs font-bold text-neutral-600 mb-1.5 uppercase">
              Kích cỡ (Size)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['S', 'M', 'L'].map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSize(s)}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                    size === s
                      ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                      : 'bg-neutral-50 text-neutral-700 hover:bg-neutral-100 border-neutral-200'
                  }`}
                >
                  Size {s}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Modifier Tags */}
          <div>
            <label className="block text-xs font-bold text-neutral-600 mb-1.5 uppercase flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-blue-600" />
              Ghi chú nhanh (Chọn một hoặc nhiều)
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-1 bg-neutral-50 rounded-xl border border-neutral-200">
              {QUICK_TAGS.map(tag => {
                const isSelected = note.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleToggleTag(tag)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      isSelected
                        ? 'bg-amber-500 text-black border-amber-600 font-bold shadow-xs'
                        : 'bg-white text-neutral-700 hover:bg-neutral-100 border-neutral-300'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Note Input */}
          <div>
            <label className="block text-xs font-bold text-neutral-600 mb-1 uppercase">
              Ghi chú riêng của khách
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Mang đi, ít đá, 50% đường..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 bg-white text-sm text-neutral-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 bg-neutral-50 border-t border-neutral-200 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-600 hover:bg-neutral-200 transition-colors"
          >
            Đóng
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md flex items-center gap-1.5 transition-all"
          >
            <Check className="w-4 h-4" />
            LƯU GHI CHÚ
          </button>
        </div>
      </div>
    </div>
  );
};
