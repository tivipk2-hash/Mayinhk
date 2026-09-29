import React, { useState, useEffect } from 'react';
import { GalleryCorner } from '../../types';
import { ChevronLeft, ChevronRight, Maximize2, Camera, Sparkles, X } from 'lucide-react';

interface PhotoGalleryProps {
  corners: GalleryCorner[];
}

export const PhotoGallery: React.FC<PhotoGalleryProps> = ({ corners }) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [currentSlideIndices, setCurrentSlideIndices] = useState<{ [key: string]: number }>({});
  const [zoomImage, setZoomImage] = useState<{ url: string; title: string; subtitle: string } | null>(null);

  const categories = [
    { id: 'all', label: 'Tất cả góc chụp' },
    { id: 'cophuc', label: 'Cổ phục Hong Kong' },
    { id: 'gacgo', label: 'Gác gỗ & Bảng hiệu' },
    { id: 'doco', label: 'Đồ cổ & Tivi' },
  ];

  const filteredCorners = activeCategory === 'all'
    ? corners
    : corners.filter(c => c.category === activeCategory);

  // Auto advance slide every 5 seconds for each corner
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlideIndices(prev => {
        const next = { ...prev };
        corners.forEach(corner => {
          const current = next[corner.id] || 0;
          const total = corner.images.length || 1;
          next[corner.id] = (current + 1) % total;
        });
        return next;
      });
    }, 4500);

    return () => clearInterval(timer);
  }, [corners]);

  const handleNextSlide = (cornerId: string, total: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentSlideIndices(prev => ({
      ...prev,
      [cornerId]: ((prev[cornerId] || 0) + 1) % total,
    }));
  };

  const handlePrevSlide = (cornerId: string, total: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentSlideIndices(prev => ({
      ...prev,
      [cornerId]: ((prev[cornerId] || 0) - 1 + total) % total,
    }));
  };

  return (
    <section className="max-w-6xl mx-auto px-4 py-12">
      {/* Section Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/60 border border-amber-600/40 text-xs text-amber-400 font-mono mb-2">
          <Camera className="w-3.5 h-3.5" />
          <span>PHÒNG TRƯNG BÀY ẢNH • HONGKONG CỔ TRẤN</span>
        </div>
        <h2 className="text-2xl sm:text-4xl font-bold font-serif text-amber-100 drop-shadow-sm">
          Những Góc Check-in Đậm Chất Thập Niên 90
        </h2>
        <p className="mt-2 text-sm text-neutral-400 max-w-xl mx-auto font-light">
          Không gian gỗ mộc trầm mặc phối hợp cùng phục trang cổ phong, lồng đèn đỏ thắm và ánh đèn hoài cổ.
          Mỗi bức ảnh là một thước phim điện ảnh Hong Kong sống động.
        </p>

        {/* Category Pills */}
        <div className="flex flex-wrap justify-center gap-2 mt-6">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeCategory === cat.id
                  ? 'bg-amber-600 text-black font-semibold shadow-lg shadow-amber-900/50 scale-105'
                  : 'bg-neutral-900/80 text-neutral-400 hover:text-amber-200 hover:bg-neutral-800 border border-neutral-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Corners */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCorners.map((corner) => {
          const totalImages = corner.images && corner.images.length > 0 ? corner.images.length : 1;
          const currentIndex = currentSlideIndices[corner.id] || 0;
          const currentImg = corner.images[currentIndex] || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800';

          return (
            <div
              key={corner.id}
              className="group relative rounded-2xl overflow-hidden bg-gradient-to-b from-[#1c120c] to-[#120a06] border border-amber-900/40 hover:border-amber-500/60 shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              {/* Image Carousel Display */}
              <div
                className="relative aspect-[4/3] w-full overflow-hidden bg-black cursor-pointer"
                onClick={() => setZoomImage({ url: currentImg, title: corner.title, subtitle: corner.subtitle })}
              >
                <img
                  src={currentImg}
                  alt={corner.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                />

                {/* Dark gradient for legibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

                {/* Corner Badge */}
                <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded bg-black/70 backdrop-blur-md border border-amber-500/30 text-[11px] text-amber-300 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
                  <span>{corner.subtitle}</span>
                </div>

                {/* Slide Count Indicator (e.g. 1/5) */}
                <div className="absolute top-3 right-3 px-2 py-0.5 rounded bg-black/70 backdrop-blur-md text-[10px] text-neutral-300 font-mono">
                  {currentIndex + 1} / {totalImages}
                </div>

                {/* Carousel Navigation Arrows */}
                <button
                  onClick={(e) => handlePrevSlide(corner.id, totalImages, e)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-amber-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm border border-white/10"
                  title="Ảnh trước"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => handleNextSlide(corner.id, totalImages, e)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-amber-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm border border-white/10"
                  title="Ảnh sau"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                {/* Slide progress dots */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
                  {corner.images.map((_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 rounded-full transition-all ${
                        currentIndex === i ? 'w-5 bg-amber-400' : 'w-1.5 bg-white/40'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Corner Info Details */}
              <div className="p-4 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold font-serif text-amber-200 group-hover:text-amber-300 transition-colors">
                    {corner.title}
                  </h3>
                  <p className="mt-1 text-xs text-neutral-400 line-clamp-2 leading-relaxed">
                    {corner.description}
                  </p>
                </div>

                <div className="mt-3 pt-3 border-t border-amber-950/60 flex items-center justify-between text-xs text-amber-500/80">
                  <span className="flex items-center gap-1 font-serif italic text-amber-400/90 text-[11px]">
                    <Sparkles className="w-3 h-3 text-amber-500" /> HongKong Cổ Trấn
                  </span>
                  <button
                    onClick={() => setZoomImage({ url: currentImg, title: corner.title, subtitle: corner.subtitle })}
                    className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-200 transition-colors font-medium"
                  >
                    <Maximize2 className="w-3 h-3" /> Xem ảnh lớn
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Lightbox / Zoom Modal */}
      {zoomImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setZoomImage(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-neutral-950 rounded-2xl overflow-hidden border border-amber-600/40 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setZoomImage(null)}
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/70 hover:bg-red-600 text-white flex items-center justify-center transition-colors border border-white/20"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="aspect-[16/10] w-full bg-black flex items-center justify-center">
              <img
                src={zoomImage.url}
                alt={zoomImage.title}
                className="max-h-[75vh] w-auto object-contain"
              />
            </div>
            <div className="p-4 bg-gradient-to-r from-neutral-950 to-neutral-900 border-t border-neutral-800 flex items-center justify-between">
              <div>
                <h4 className="text-base font-bold text-amber-300 font-serif">{zoomImage.title}</h4>
                <p className="text-xs text-neutral-400">{zoomImage.subtitle}</p>
              </div>
              <span className="text-xs text-amber-500 font-mono">HongKong Cổ Trấn • Lâm Đồng</span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
