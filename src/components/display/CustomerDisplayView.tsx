import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AppState, Order, OrderItem } from '../../types';
import { subscribeToCustomerDisplay, CustomerDisplayState } from '../../services/customerDisplayService';
import { getVietQRImageUrl } from '../../services/vietqr';
import { formatVND } from '../../services/qzService';
import { ChineseLantern } from './ChineseLantern';
import {
  Sparkles,
  ShoppingBag,
  Clock,
  Wifi,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Heart,
  QrCode,
  Store,
  Coffee,
  Check,
} from 'lucide-react';

interface CustomerDisplayViewProps {
  state: AppState;
}

export const CustomerDisplayView: React.FC<CustomerDisplayViewProps> = ({ state }) => {
  const [displayData, setDisplayData] = useState<CustomerDisplayState>({
    order: null,
    status: 'idle',
    lastUpdated: Date.now(),
    storeName: state.homepage?.shopName || 'HongKong Cổ Trấn Quán',
    wifiSsid: state.homepage?.wifiSsid || 'HongKong_CoTran',
    wifiPass: state.homepage?.wifiPass || '88888888',
    vietQr: state.billTemplate?.vietQr,
  });

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [lastItemAdded, setLastItemAdded] = useState<string | null>(null);

  // Play pleasant crystal POS bell chime via Web Audio API
  const playChime = (type: 'add' | 'remove' | 'checkout') => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (type === 'checkout') {
        // Celebratory harmonic chord
        const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
          gain.gain.setValueAtTime(0.15, ctx.currentTime + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.08 + 0.8);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.08);
          osc.stop(ctx.currentTime + idx * 0.08 + 0.85);
        });
      } else if (type === 'add') {
        // High ping chime
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
      } else {
        // Soft drop chime
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch {
      // AudioContext could be blocked by browser autoplay policy before user gesture
    }
  };

  // Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setDateStr(now.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Listen to Customer Display Broadcasts & Cloud updates
  useEffect(() => {
    const unsub = subscribeToCustomerDisplay((newState) => {
      setDisplayData((prev) => {
        // Play audio on action
        if (newState.lastAction === 'item_added') {
          playChime('add');
          if (newState.lastActionItemName) {
            setLastItemAdded(newState.lastActionItemName);
            setTimeout(() => setLastItemAdded(null), 2500);
          }
        } else if (newState.lastAction === 'item_removed') {
          playChime('remove');
        } else if (newState.status === 'completed' && prev.status !== 'completed') {
          playChime('checkout');
          if (newState.order) {
            setCompletedOrder(newState.order);
            setShowCelebration(true);
            setTimeout(() => {
              setShowCelebration(false);
            }, 6500);
          }
        }

        return {
          ...prev,
          ...newState,
        };
      });
    });

    return () => unsub();
  }, [soundEnabled]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
      }
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const order = displayData.order;
  const hasItems = order && order.items && order.items.length > 0;
  const isOrdering = hasItems && displayData.status !== 'completed' && !showCelebration;

  // VietQR URL if enabled
  const vietQrUrl = useMemo(() => {
    const qrConfig = displayData.vietQr || state.billTemplate?.vietQr;
    if (qrConfig && qrConfig.enabled && qrConfig.bankId && qrConfig.accountNo && order && order.total > 0) {
      return getVietQRImageUrl(qrConfig, order.total, order.code);
    }
    return null;
  }, [displayData.vietQr, state.billTemplate?.vietQr, order]);

  // Featured menu items for Idle Screen
  const featuredMenu = useMemo(() => {
    return state.menu.filter((m) => m.isAvailable).slice(0, 8);
  }, [state.menu]);

  // Total quantity of items in order
  const totalItemCount = useMemo(() => {
    if (!order || !order.items) return 0;
    return order.items.reduce((sum, it) => sum + it.quantity, 0);
  }, [order]);

  return (
    <div className="min-h-screen w-screen bg-gradient-to-b from-[#240909] via-[#1a0606] to-[#0f0404] text-neutral-100 flex flex-col font-sans select-none overflow-hidden relative">
      {/* Background Hong Kong Tea House Ambient Lighting & Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-45 z-0">
        <div className="absolute -top-32 -left-32 w-[450px] h-[450px] rounded-full bg-red-600/25 blur-3xl animate-pulse" />
        <div className="absolute -bottom-32 -right-32 w-[450px] h-[450px] rounded-full bg-amber-500/25 blur-3xl animate-pulse" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full bg-amber-700/15 blur-[130px]" />
      </div>

      {/* DECORATIVE TOP EAVE ROOF BAR WITH TRADITIONAL CHINESE RED LANTERNS */}
      <div className="relative z-20 w-full pointer-events-none flex justify-between items-start px-4 sm:px-8 -mb-4">
        {/* Left Lantern Cluster */}
        <div className="flex items-start gap-2 sm:gap-4 drop-shadow-2xl">
          <ChineseLantern
            size="md"
            cordLength={22}
            swayDuration={4.2}
            swayDelay={0}
            character="福"
          />
          <ChineseLantern
            size="sm"
            cordLength={34}
            swayDuration={3.6}
            swayDelay={0.8}
            character="吉"
            className="hidden sm:inline-block"
          />
        </div>

        {/* Center decorative garland cord with subtle mini lantern */}
        <div className="hidden lg:flex items-center gap-6 mt-1 opacity-85">
          <div className="h-[2px] w-24 bg-gradient-to-r from-transparent via-amber-400 to-amber-500" />
          <ChineseLantern
            size="sm"
            cordLength={16}
            swayDuration={4.5}
            swayDelay={1.5}
            character="茶"
          />
          <div className="h-[2px] w-24 bg-gradient-to-l from-transparent via-amber-400 to-amber-500" />
        </div>

        {/* Right Lantern Cluster */}
        <div className="flex items-start gap-2 sm:gap-4 drop-shadow-2xl justify-end">
          <ChineseLantern
            size="sm"
            cordLength={34}
            swayDuration={3.8}
            swayDelay={1.2}
            character="喜"
            className="hidden sm:inline-block"
          />
          <ChineseLantern
            size="md"
            cordLength={22}
            swayDuration={4.4}
            swayDelay={0.4}
            character="春"
          />
        </div>
      </div>

      {/* TOP HEADER BAR */}
      <header className="relative z-10 bg-[#190606]/95 backdrop-blur-md border-b-2 border-amber-600/50 px-4 sm:px-6 py-3 flex items-center justify-between shadow-2xl">
        {/* Brand identity */}
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-red-600 flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-red-950/80 border border-amber-300">
            港
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-wide text-amber-300 font-serif drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                {state.homepage?.shopName || 'HongKong Cổ Trấn Quán'}
              </h1>
              <span className="text-[11px] uppercase font-mono px-2.5 py-0.5 rounded-full bg-red-900/90 text-amber-300 border border-amber-500/60 font-black tracking-wider shadow-inner">
                MÀN HÌNH KHÁCH
              </span>
            </div>
            <p className="text-xs text-amber-200/80 font-serif italic">
              {state.homepage?.tagline || 'Trà Sữa & Cà Phê Hồng Kông Thập Niên 80s'}
            </p>
          </div>
        </div>

        {/* Center: Live Order Status Indicator */}
        <div className="hidden md:flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[#2a0e0e]/90 border border-amber-500/40 text-xs font-semibold shadow-md">
          <span
            className={`w-3 h-3 rounded-full animate-pulse ${
              isOrdering ? 'bg-amber-400 shadow-[0_0_12px_#f59e0b]' : 'bg-emerald-400 shadow-[0_0_12px_#10b981]'
            }`}
          />
          <span className="text-amber-100">
            {isOrdering ? 'Đang chọn món tại quầy...' : 'Sẵn sàng phục vụ'}
          </span>
        </div>

        {/* Right: Time, Wi-Fi info & Kiosk controls */}
        <div className="flex items-center gap-3 sm:gap-4 text-xs">
          {/* Wi-Fi Pill for customers */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#2a0e0e]/80 border border-amber-600/40 text-neutral-300 shadow-sm">
            <Wifi className="w-4 h-4 text-amber-400" />
            <span className="text-amber-200/80">Wi-Fi:</span>
            <span className="font-bold text-amber-100">{state.homepage?.wifiSsid || 'HongKong_CoTran'}</span>
            <span className="text-amber-500">•</span>
            <span className="font-mono font-bold text-amber-300">{state.homepage?.wifiPass || '88888888'}</span>
          </div>

          {/* Clock */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2a0e0e]/80 border border-amber-600/40 text-neutral-300 shadow-sm">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-mono font-black text-amber-300 text-sm tracking-wide">{timeStr}</span>
          </div>

          {/* Sound Mute Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2.5 rounded-xl bg-[#2a0e0e] hover:bg-[#3d1414] text-neutral-300 hover:text-amber-300 border border-amber-700/50 transition-colors shadow-sm"
            title={soundEnabled ? 'Tắt âm thanh hiệu ứng' : 'Bật âm thanh hiệu ứng'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-[#2a0e0e] hover:bg-[#3d1414] text-neutral-300 hover:text-amber-300 border border-amber-700/50 transition-colors shadow-sm"
            title={isFullscreen ? 'Thu nhỏ cửa sổ' : 'Toàn màn hình (F11)'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4 text-amber-400" />}
          </button>
        </div>
      </header>

      {/* Decorative Gold Trim Line below Header */}
      <div className="w-full h-[2px] bg-gradient-to-r from-red-800 via-amber-400 to-red-800 shadow-md relative z-10" />

      {/* RECENT ITEM TOAST (Pops up when cashier clicks an item) */}
      {lastItemAdded && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 text-black font-black text-base shadow-[0_10px_30px_rgba(245,158,11,0.5)] flex items-center gap-2.5 border-2 border-amber-200 animate-in fade-in slide-in-from-top-4 duration-200">
          <Sparkles className="w-5 h-5 fill-black" />
          <span>Đã thêm: {lastItemAdded}</span>
        </div>
      )}

      {/* MAIN VIEW CONTENT */}
      <main className="relative z-10 flex-1 flex flex-col overflow-hidden">
        {/* CELEBRATION / THANK YOU SCREEN ON CHECKOUT */}
        {showCelebration && completedOrder ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-8 text-center animate-in zoom-in-95 duration-300">
            {/* Hanging Lanterns framing celebration */}
            <div className="flex items-center gap-8 mb-4">
              <ChineseLantern size="md" cordLength={20} character="喜" />
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500/30 to-emerald-700/30 border-2 border-emerald-400 flex items-center justify-center shadow-[0_0_50px_rgba(16,185,129,0.5)] animate-bounce">
                <Check className="w-12 h-12 text-emerald-300 stroke-[3.5]" />
              </div>
              <ChineseLantern size="md" cordLength={20} character="福" />
            </div>

            <div className="inline-block px-5 py-1.5 rounded-full bg-emerald-950/90 border border-emerald-500/70 text-emerald-300 text-sm font-black uppercase tracking-widest mb-3 shadow-lg">
              Thanh Toán Thành Công
            </div>

            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-amber-300 font-serif mb-2 tracking-wide drop-shadow-[0_4px_16px_rgba(245,158,11,0.4)]">
              CẢM ƠN QUÝ KHÁCH!
            </h2>

            <p className="text-2xl md:text-3xl text-amber-100 font-serif italic mb-6 drop-shadow">
              "Thanks for your order"
            </p>

            <div className="bg-[#240e0e]/90 border-2 border-amber-500/50 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-3.5 mb-6 backdrop-blur-md">
              <div className="flex justify-between items-center text-sm border-b border-amber-900/60 pb-3">
                <span className="text-amber-200/80 font-medium">Mã đơn hàng:</span>
                <span className="font-mono font-black text-amber-300 text-lg">#{completedOrder.code}</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-amber-900/60 pb-3">
                <span className="text-amber-200/80 font-medium">Số lượng món:</span>
                <span className="font-bold text-neutral-100 text-base">
                  {completedOrder.items.reduce((s, i) => s + i.quantity, 0)} món
                </span>
              </div>
              <div className="flex justify-between items-center text-base pt-1">
                <span className="font-bold text-amber-200">Tổng thanh toán:</span>
                <span className="font-mono font-black text-emerald-400 text-3xl drop-shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                  {formatVND(completedOrder.total)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 text-base text-amber-200/90 font-serif">
              <Coffee className="w-5 h-5 text-amber-400" />
              <span>Đơn hàng đang được chuẩn bị. Kính chúc quý khách ngon miệng!</span>
            </div>
          </div>
        ) : isOrdering ? (
          /* ACTIVE ORDER SCREEN: Cashier is currently ringing up drinks */
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden p-3 md:p-5 gap-4 md:gap-6">
            {/* LEFT COLUMN: ORDER ITEMS LIST */}
            <div className="flex-1 flex flex-col bg-[#1c0808]/90 backdrop-blur-md rounded-3xl border-2 border-amber-600/40 shadow-2xl overflow-hidden">
              {/* Card Header */}
              <div className="px-5 py-3.5 bg-gradient-to-r from-[#2c0e0e] via-[#220909] to-[#2c0e0e] border-b border-amber-600/40 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="font-bold text-lg text-amber-100 font-serif">
                        Danh Sách Món Đã Chọn
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full bg-red-900/80 text-amber-300 text-xs font-black border border-amber-500/40">
                        {totalItemCount} món
                      </span>
                    </div>
                    <p className="text-xs text-amber-200/70">
                      Đơn #{order.code} • Thu ngân: <span className="text-amber-100 font-semibold">{order.staffName || 'Thu Ngân'}</span>
                    </p>
                  </div>
                </div>

                <div className="text-xs font-mono font-bold text-amber-300 bg-[#351212] px-3.5 py-1.5 rounded-xl border border-amber-600/40 shadow-inner">
                  {order.type === 'takeaway' ? '🥤 Mang Về' : '🪑 Dùng Tại Quán'}
                </div>
              </div>

              {/* Items Table / Scroller */}
              <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3">
                {order.items.map((item, idx) => (
                  <div
                    key={`${item.itemId}_${idx}_${item.size || ''}_${item.note || ''}`}
                    className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-300 ${
                      lastItemAdded === item.name
                        ? 'bg-gradient-to-r from-[#421717] to-[#2f1010] border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.35)] scale-[1.01]'
                        : 'bg-[#270e0e]/85 hover:bg-[#321313]/90 border-amber-800/40 hover:border-amber-500/50 shadow-md'
                    }`}
                  >
                    {/* Item info */}
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                      {/* Item index badge */}
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-red-600 text-white font-black font-mono flex items-center justify-center text-sm shrink-0 mt-0.5 shadow-md border border-amber-300/40">
                        {idx + 1}
                      </div>

                      <div className="min-w-0 flex-1 pr-3">
                        {/* ITEM NAME (LARGER FONT) & NOTE (IN PARENTHESES IMMEDIATELY AFTER NAME) */}
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="font-black text-xl sm:text-2xl md:text-3xl text-amber-50 font-serif tracking-wide leading-tight drop-shadow-sm">
                            {item.name}
                          </span>

                          {/* Note in parentheses right after the item name */}
                          {item.note && (
                            <span className="font-bold text-base sm:text-xl text-amber-400 italic">
                              ({item.note})
                            </span>
                          )}

                          {/* Size Badge */}
                          {item.size && (
                            <span className="text-xs sm:text-sm font-mono font-bold px-2 py-0.5 rounded-lg bg-red-950/80 text-amber-200 border border-amber-500/40">
                              Size {item.size}
                            </span>
                          )}
                        </div>

                        {/* Unit price */}
                        <div className="text-xs sm:text-sm text-amber-200/70 mt-1 font-mono font-medium">
                          {formatVND(item.price)} / phần
                        </div>
                      </div>
                    </div>

                    {/* Quantity & Subtotal */}
                    <div className="flex items-center gap-3 sm:gap-5 shrink-0 text-right">
                      <div className="px-3 py-1 rounded-xl bg-gradient-to-r from-amber-500/20 to-red-500/20 border border-amber-500/50 font-mono font-black text-base sm:text-xl text-amber-300 shadow-inner">
                        x{item.quantity}
                      </div>
                      <div className="w-28 sm:w-36 font-mono font-black text-xl sm:text-2xl md:text-3xl text-amber-300 drop-shadow-sm">
                        {formatVND(item.price * item.quantity)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom Quote inside order card */}
              <div className="px-6 py-3 bg-[#170505]/95 border-t border-amber-600/40 flex items-center justify-between text-xs text-amber-200/80">
                <div className="flex items-center gap-2 text-amber-400 font-serif italic text-sm font-bold">
                  <Heart className="w-4 h-4 fill-amber-500/40 text-amber-400" />
                  <span>"Thanks for your order"</span>
                </div>
                <span className="hidden sm:inline text-amber-300/60 font-medium">
                  Món sẽ đồng bộ tức thì theo thao tác của nhân viên thu ngân
                </span>
              </div>
            </div>

            {/* RIGHT COLUMN: TOTALS & VIETQR PAYMENT */}
            <div className="w-full lg:w-96 flex flex-col gap-4 shrink-0">
              {/* Total Card */}
              <div className="bg-gradient-to-br from-[#2f0e0e] via-[#220909] to-[#190606] rounded-3xl border-2 border-amber-500/50 p-5 sm:p-6 shadow-2xl flex flex-col justify-between relative overflow-hidden">
                {/* Subtle corner badge accent */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm text-amber-200/80">
                    <span className="font-medium">Tạm tính ({totalItemCount} món):</span>
                    <span className="font-mono font-bold text-neutral-100 text-base">
                      {formatVND(order.subtotal || 0)}
                    </span>
                  </div>

                  {order.discount > 0 && (
                    <div className="flex justify-between items-center text-sm text-emerald-400 font-bold">
                      <span>Ưu đãi / Giảm giá:</span>
                      <span className="font-mono text-base">
                        -{formatVND(order.discount)}
                      </span>
                    </div>
                  )}

                  <div className="h-[2px] bg-gradient-to-r from-transparent via-amber-500/50 to-transparent my-2" />

                  {/* HUGE TOTAL DISPLAY */}
                  <div>
                    <span className="block text-xs uppercase font-black text-amber-400 tracking-widest">
                      TỔNG TIỀN THANH TOÁN
                    </span>
                    <div className="text-4xl sm:text-5xl lg:text-6xl font-mono font-black text-amber-300 drop-shadow-[0_2px_18px_rgba(245,158,11,0.5)] mt-1 tracking-tight">
                      {formatVND(order.total || 0)}
                    </div>
                  </div>
                </div>

                {/* Payment Method Badge */}
                <div className="mt-4 pt-3 border-t border-amber-700/40 flex items-center justify-between text-xs">
                  <span className="text-amber-200/80 font-medium">Hình thức:</span>
                  <span className="font-bold px-3 py-1 rounded-lg bg-red-950/80 text-amber-300 border border-amber-500/40">
                    {order.paymentMethod === 'transfer' ? 'Chuyển Khoản' : 'Tiền Mặt Tại Quầy'}
                  </span>
                </div>
              </div>

              {/* VietQR Dynamic Payment Card (If Configured) */}
              {vietQrUrl ? (
                <div className="flex-1 bg-[#220a0a]/90 rounded-3xl border-2 border-amber-500/40 p-4 shadow-xl flex flex-col items-center justify-center text-center">
                  <div className="flex items-center gap-2 text-xs font-black text-amber-300 mb-2 uppercase tracking-wide">
                    <QrCode className="w-4 h-4 text-amber-400" />
                    <span>QUÉT MÃ VIETQR ĐỂ THANH TOÁN</span>
                  </div>

                  <div className="p-2.5 bg-white rounded-2xl shadow-xl border-2 border-amber-400 inline-block mb-2">
                    <img
                      src={vietQrUrl}
                      alt="VietQR Transfer"
                      className="w-44 h-44 object-contain"
                    />
                  </div>

                  <div className="text-[11px] text-amber-100 space-y-0.5 font-mono">
                    <p className="font-bold text-amber-200">
                      {displayData.vietQr?.bankName || 'Ngân hàng'}
                    </p>
                    <p className="text-amber-300 font-black tracking-wider text-xs">
                      STK: {displayData.vietQr?.accountNo}
                    </p>
                    <p className="text-amber-200/70 uppercase text-[10px] font-semibold">
                      {displayData.vietQr?.accountName}
                    </p>
                  </div>
                </div>
              ) : (
                /* Cashier ready banner */
                <div className="flex-1 bg-[#220a0a]/70 rounded-3xl border border-amber-700/40 p-5 flex flex-col items-center justify-center text-center">
                  <Store className="w-10 h-10 text-amber-400 mb-2" />
                  <p className="font-bold text-amber-100 text-sm font-serif">
                    {state.homepage?.shopName || 'HongKong Cổ Trấn Quán'}
                  </p>
                  <p className="text-xs text-amber-200/70 mt-1">
                    Quý khách vui lòng kiểm tra lại các món trước khi nhân viên xuất hóa đơn.
                  </p>
                </div>
              )}

              {/* THANKS FOR YOUR ORDER CARD */}
              <div className="bg-gradient-to-r from-red-950 via-[#3a1313] to-amber-950 rounded-2xl border-2 border-amber-500/50 p-4 text-center shadow-xl">
                <p className="text-lg font-black text-amber-300 font-serif tracking-wide drop-shadow-sm">
                  Thanks for your order!
                </p>
                <p className="text-xs text-amber-100/90 font-serif italic mt-0.5">
                  Cảm ơn quý khách đã ủng hộ quán!
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* IDLE / WELCOME SCREEN: Waiting for cashier to ring up next customer */
          <div className="flex-1 flex flex-col justify-between p-4 sm:p-6 md:p-8 overflow-y-auto">
            {/* Hero Welcome Message with Lanterns Accent */}
            <div className="text-center py-4 md:py-6 max-w-4xl mx-auto space-y-3 relative">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 via-red-500/20 to-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black uppercase tracking-widest shadow-md">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>CHÀO MỪNG QUÝ KHÁCH</span>
              </div>

              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-100 font-serif tracking-wide drop-shadow-md">
                {state.homepage?.shopName || 'HongKong Cổ Trấn Quán'}
              </h2>

              <p className="text-lg md:text-2xl text-amber-100/90 font-serif italic">
                {state.homepage?.tagline || 'Trà Sữa & Cà Phê Hồng Kông Thập Niên 80s'}
              </p>

              {/* PROMINENT THANKS FOR YOUR ORDER LINE */}
              <div className="pt-2">
                <span className="text-amber-300 font-serif text-2xl md:text-3xl font-black tracking-wider inline-block border-b-2 border-amber-500/50 pb-1 drop-shadow">
                  "Thanks for your order"
                </span>
                <p className="text-xs sm:text-sm text-amber-200/70 mt-1 font-serif">
                  Xin mời quý khách chọn món tại quầy thu ngân
                </p>
              </div>
            </div>

            {/* Featured Drink Showcase Cards */}
            <div className="my-2 sm:my-4">
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-300 flex items-center gap-2">
                  <Coffee className="w-4 h-4 text-amber-400" />
                  <span>Món Nổi Bật Được Yêu Thích</span>
                </h3>
                <span className="text-xs text-amber-300/60 font-medium">
                  Món sẽ hiển thị trực tiếp khi nhân viên chọn
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-4">
                {featuredMenu.map((item) => (
                  <div
                    key={item.id}
                    className="bg-[#240e0e]/85 rounded-2xl border border-amber-700/40 overflow-hidden shadow-lg hover:border-amber-400 transition-all flex flex-col group"
                  >
                    <div className="h-28 sm:h-32 bg-[#120404] overflow-hidden relative">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          // Fallback placeholder image
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1556881286-fc6915169721?w=500&auto=format&fit=crop&q=60';
                        }}
                      />
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/75 backdrop-blur-md text-[10px] font-black text-amber-300 border border-amber-500/40">
                        {item.category}
                      </div>
                    </div>
                    <div className="p-3 flex-1 flex flex-col justify-between">
                      <h4 className="font-bold text-sm sm:text-base text-amber-50 font-serif line-clamp-1">
                        {item.name}
                      </h4>
                      <p className="font-mono font-black text-amber-300 text-sm sm:text-base mt-1">
                        {formatVND(item.price)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Footer Info */}
            <div className="mt-4 pt-3 border-t border-amber-800/40 flex flex-col sm:flex-row items-center justify-between text-xs text-amber-200/70 gap-2">
              <div className="flex items-center gap-2">
                <span>{state.homepage?.address || 'HongKong Cổ Trấn Quán'}</span>
                <span>•</span>
                <span>Hotline: {state.homepage?.hotline || '0988.888.888'}</span>
              </div>
              <div className="text-amber-400 font-serif italic font-bold">
                Cảm ơn quý khách đã ghé thăm • Thanks for your order!
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
