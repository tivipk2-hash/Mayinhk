import React from 'react';
import { Camera, Music, Coffee } from 'lucide-react';

export const ServicesSection: React.FC = () => {
  const services = [
    {
      icon: Camera,
      title: 'Cho Thuê Cổ Phục Hỷ Sự',
      desc: 'Trải nghiệm hóa thân thành các nhân vật điện ảnh Hong Kong với bộ sưu tập áo sườn xám, hỷ phục thêu rồng phượng tinh xảo.',
      badge: 'Trang phục & Phụ kiện'
    },
    {
      icon: Music,
      title: 'Âm Nhạc Băng Từ & Dĩa Than',
      desc: 'Lắng nghe những giai điệu bất hủ của Trương Quốc Vinh, Mai Diễm Phương, Đặng Lệ Quân qua máy phát nhạc cổ điển.',
      badge: 'Vinyl & Cassette Hi-Fi'
    },
    {
      icon: Coffee,
      title: 'Cà Phê Rang Mộc Lâm Đồng',
      desc: 'Thưởng thức cà phê phin truyền thống, trà sữa vớ lụa Hong Kong và các thức uống signature đậm đà khó quên.',
      badge: 'Đặc sản Cao Nguyên'
    }
  ];

  return (
    <section className="max-w-6xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {services.map((s, idx) => {
          const Icon = s.icon;
          return (
            <div
              key={idx}
              className="rounded-2xl p-6 bg-gradient-to-b from-[#180f0a] to-[#0f0805] border border-amber-950/80 hover:border-amber-700/50 shadow-lg flex flex-col justify-between transition-all"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-amber-950/60 border border-amber-800/40 flex items-center justify-center text-amber-400 mb-4 shadow-inner">
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-[10px] uppercase font-mono tracking-widest text-amber-600 font-semibold">{s.badge}</span>
                <h3 className="text-lg font-bold font-serif text-amber-200 mt-1 mb-2">{s.title}</h3>
                <p className="text-xs text-neutral-400 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
