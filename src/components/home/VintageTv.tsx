import React, { useState } from 'react';
import { TvChannel } from '../../types';
import { Play, Volume2, Power, Radio, Sliders, Sparkles } from 'lucide-react';

interface VintageTvProps {
  channels: TvChannel[];
  onOpenPos: () => void;
}

export const VintageTv: React.FC<VintageTvProps> = ({ channels }) => {
  const [currentChannelIndex, setCurrentChannelIndex] = useState(0);
  const [isPowerOn, setIsPowerOn] = useState(true);
  const [hasScanlines, setHasScanlines] = useState(true);
  const [staticNoise, setStaticNoise] = useState(false);

  const currentChannel = channels[currentChannelIndex] || channels[0];

  const handleChannelChange = (newIndex: number) => {
    if (newIndex === currentChannelIndex) return;
    setStaticNoise(true);
    setCurrentChannelIndex(newIndex);
    setTimeout(() => {
      setStaticNoise(false);
    }, 450);
  };

  return (
    <div className="relative max-w-5xl mx-auto px-4 py-8">
      {/* Decorative overhead strings / lanterns hint */}
      <div className="flex justify-center items-center gap-6 mb-3 text-xs tracking-widest text-amber-500/80 uppercase font-serif">
        <span className="inline-block w-12 h-px bg-amber-600/40"></span>
        <span className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" /> KHUNG GIAN HOÀI CỔ HONG KONG ĐỘC BẢN</span>
        <span className="inline-block w-12 h-px bg-amber-600/40"></span>
      </div>

      <div className="text-center mb-6">
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600 font-serif drop-shadow-[0_2px_12px_rgba(217,119,6,0.3)]">
          HONGKONG CỔ TRẤN
        </h1>
        <p className="mt-2 text-base sm:text-lg text-amber-100/70 font-light italic font-serif">
          &ldquo;Một thoáng Hong Kong thập niên 90 giữa lòng Cao Nguyên&rdquo;
        </p>
        <p className="max-w-2xl mx-auto mt-2 text-xs sm:text-sm text-neutral-400 leading-relaxed">
          HongKong Cổ Trấn đưa bạn lạc bước vào không gian điện ảnh TVB thập niên 80-90. Nơi những bảng hiệu gỗ thư pháp, lồng đèn đỏ thắm, tivi bóng hình cổ và tiếng nhạc đĩa than hòa quyện cùng hương vị cà phê Lâm Đồng thơm nồng.
        </p>

        {/* Traditional red badges */}
        <div className="flex flex-wrap justify-center gap-2 mt-4 text-[11px] font-medium text-red-200">
          <span className="px-2.5 py-1 rounded bg-red-950/80 border border-red-700/60 shadow-inner">尖沙嘴 • Select 18</span>
          <span className="px-2.5 py-1 rounded bg-red-950/80 border border-red-700/60 shadow-inner">中西區 • 德</span>
          <span className="px-2.5 py-1 rounded bg-red-950/80 border border-red-700/60 shadow-inner">紅樓夢 • 桃花</span>
          <span className="px-2.5 py-1 rounded bg-red-950/80 border border-red-700/60 shadow-inner">廚房 • 食神</span>
          <span className="px-2.5 py-1 rounded bg-red-950/80 border border-red-700/60 shadow-inner">四海皆兄弟 • 一代宗師</span>
        </div>
      </div>

      {/* Retro Wood CRT Television Frame */}
      <div className="relative rounded-3xl p-4 sm:p-7 md:p-8 bg-gradient-to-b from-[#3d2417] via-[#24130c] to-[#170b07] border-4 border-[#5a3622] shadow-[0_20px_60px_rgba(0,0,0,0.85),inset_0_2px_8px_rgba(255,255,255,0.15)]">
        {/* Wood grain brass screws */}
        <div className="absolute top-3 left-3 w-3 h-3 rounded-full bg-amber-700/80 border border-amber-400/50 shadow-sm flex items-center justify-center text-[8px] text-amber-200">✕</div>
        <div className="absolute top-3 right-3 w-3 h-3 rounded-full bg-amber-700/80 border border-amber-400/50 shadow-sm flex items-center justify-center text-[8px] text-amber-200">✕</div>
        <div className="absolute bottom-3 left-3 w-3 h-3 rounded-full bg-amber-700/80 border border-amber-400/50 shadow-sm flex items-center justify-center text-[8px] text-amber-200">✕</div>
        <div className="absolute bottom-3 right-3 w-3 h-3 rounded-full bg-amber-700/80 border border-amber-400/50 shadow-sm flex items-center justify-center text-[8px] text-amber-200">✕</div>

        {/* Top TV Branding Label */}
        <div className="flex items-center justify-between px-2 mb-3 pb-2 border-b border-amber-900/40 text-[10px] sm:text-xs text-amber-500/70 font-mono tracking-widest uppercase">
          <div className="flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-amber-500" />
            <span>HONGKONG TUBE VISION • 1988 DELUXE</span>
          </div>
          <div className="flex items-center gap-3">
            <span>VHF CH.1-5</span>
            <span className="hidden sm:inline">COLOR HI-FI</span>
          </div>
        </div>

        {/* Main TV Body: Left Screen (CRT) + Right Control Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* CRT Screen Tube Area (Col 9) */}
          <div className="lg:col-span-9 relative bg-[#090807] rounded-2xl p-2 sm:p-3.5 border-4 border-[#1c130e] shadow-[inset_0_0_40px_rgba(0,0,0,0.95)] overflow-hidden">
            {/* Screen inner bevel */}
            <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black flex items-center justify-center shadow-[inset_0_0_50px_rgba(0,0,0,0.8)]">
              {isPowerOn ? (
                <>
                  {/* YouTube Embed */}
                  <iframe
                    key={currentChannel.youtubeId}
                    src={`https://www.youtube-nocookie.com/embed/${currentChannel.youtubeId}?autoplay=1&mute=0&controls=1&rel=0&loop=1`}
                    title={currentChannel.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full object-cover border-0"
                  />

                  {/* Optional Scanlines Effect */}
                  {hasScanlines && (
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.35)_50%)] bg-[length:100%_4px] opacity-40 mix-blend-overlay z-10" />
                  )}

                  {/* CRT Screen Glow Vignette */}
                  <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_60px_rgba(0,0,0,0.85)] z-20" />

                  {/* Static noise overlay when switching channels */}
                  {staticNoise && (
                    <div className="absolute inset-0 bg-neutral-900 flex items-center justify-center z-30 animate-pulse">
                      <div className="text-center font-mono text-amber-400 text-sm">
                        <div className="animate-spin inline-block mb-2">⚡</div>
                        <p>ĐANG BẮT TÍN HIỆU KÊNH {currentChannelIndex + 1}...</p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* TV Turned OFF state */
                <div className="w-full h-full flex flex-col items-center justify-center text-neutral-600 bg-neutral-950 font-mono text-xs">
                  <div className="w-3 h-3 rounded-full bg-red-950 border border-red-800 mb-2"></div>
                  <span>TV ĐÃ TẮT NGUỒN</span>
                  <button
                    onClick={() => setIsPowerOn(true)}
                    className="mt-3 px-3 py-1 bg-amber-800/60 hover:bg-amber-700 text-amber-200 rounded text-[11px] font-sans flex items-center gap-1.5 transition-colors"
                  >
                    <Power className="w-3.5 h-3.5" /> Bật Tivi
                  </button>
                </div>
              )}
            </div>

            {/* Bottom Screen Bar */}
            <div className="mt-2 flex items-center justify-between text-[11px] text-amber-400/80 px-1 font-mono">
              <div className="flex items-center gap-2 truncate">
                <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                <span className="font-semibold text-amber-300 truncate">{currentChannel.channelName}:</span>
                <span className="text-neutral-300 truncate">{currentChannel.title}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setHasScanlines(!hasScanlines)}
                  className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${
                    hasScanlines ? 'bg-amber-600 text-black font-bold border-amber-500' : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                  }`}
                  title="Bật/Tắt hiệu ứng sọc ngang quét hình CRT"
                >
                  Scanlines {hasScanlines ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>
          </div>

          {/* Right Control Panel (Col 3) - Vintage VHF Knobs & Dials */}
          <div className="lg:col-span-3 flex flex-col justify-between bg-gradient-to-b from-[#1e130c] via-[#140b07] to-[#1b1009] p-4 rounded-2xl border border-amber-950/60 shadow-inner">
            {/* VHF Channel Selector Knob */}
            <div>
              <div className="text-center mb-3">
                <span className="text-[10px] font-mono tracking-widest text-amber-400 uppercase">CHUYỂN KÊNH (VHF)</span>
                <p className="text-[11px] text-neutral-400 mt-0.5">5 Kênh Truyền Hình Cổ</p>
              </div>

              {/* Rotary Knob Representation */}
              <div className="flex justify-center mb-4">
                <div className="relative w-24 h-24 rounded-full bg-gradient-to-tr from-[#120a06] via-[#331c11] to-[#452516] border-4 border-amber-700/60 shadow-lg flex items-center justify-center p-2">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-b from-[#110905] to-[#2b170e] border border-amber-500/40 flex items-center justify-center shadow-inner">
                    <span className="text-2xl font-black text-amber-300 font-mono">{currentChannelIndex + 1}</span>
                  </div>
                  {/* Indicator notch */}
                  <div
                    className="absolute w-2.5 h-2.5 bg-amber-400 rounded-full shadow-[0_0_6px_#f59e0b] transition-all duration-300"
                    style={{
                      transform: `rotate(${currentChannelIndex * 72}deg) translate(0, -36px)`,
                    }}
                  />
                </div>
              </div>

              {/* 5 Channel Buttons List */}
              <div className="space-y-1.5">
                {channels.map((ch, idx) => (
                  <button
                    key={ch.id}
                    onClick={() => handleChannelChange(idx)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-sans transition-all flex items-center justify-between ${
                      currentChannelIndex === idx
                        ? 'bg-amber-600/90 text-white font-semibold shadow-md shadow-amber-900/40 border border-amber-400'
                        : 'bg-neutral-900/70 text-neutral-300 hover:bg-neutral-800 border border-neutral-800'
                    }`}
                  >
                    <span className="truncate flex items-center gap-1.5">
                      <span className="w-4 text-center font-mono font-bold text-amber-300 text-[11px]">{idx + 1}</span>
                      <span className="truncate">{ch.title}</span>
                    </span>
                    {currentChannelIndex === idx && <Play className="w-3 h-3 fill-white shrink-0" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Vintage Adjusters & Speaker Grill */}
            <div className="mt-4 pt-3 border-t border-amber-950/50 space-y-2">
              <div className="flex items-center justify-between text-[10px] text-amber-500/80 font-mono">
                <span>V-HOLD</span>
                <div className="w-16 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                  <div className="w-3/4 h-full bg-amber-600 rounded-full"></div>
                </div>
              </div>
              <div className="flex items-center justify-between text-[10px] text-amber-500/80 font-mono">
                <span>BRIGHT</span>
                <div className="w-16 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                  <div className="w-4/5 h-full bg-amber-600 rounded-full"></div>
                </div>
              </div>

              {/* Vintage horizontal speaker slates */}
              <div className="py-2 flex flex-col gap-1 opacity-70">
                <div className="h-1 bg-[#25150d] rounded-full"></div>
                <div className="h-1 bg-[#25150d] rounded-full"></div>
                <div className="h-1 bg-[#25150d] rounded-full"></div>
                <div className="h-1 bg-[#25150d] rounded-full"></div>
              </div>

              {/* Master Power Button */}
              <button
                onClick={() => setIsPowerOn(!isPowerOn)}
                className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  isPowerOn
                    ? 'bg-red-950/90 text-red-300 hover:bg-red-900 border border-red-800 shadow-sm'
                    : 'bg-emerald-900/90 text-emerald-200 hover:bg-emerald-800 border border-emerald-700'
                }`}
              >
                <Power className="w-3.5 h-3.5" />
                {isPowerOn ? 'TẮT TIVI' : 'BẬT TIVI'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
