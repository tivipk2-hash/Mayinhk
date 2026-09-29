import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Order, BillTemplate, LabelTemplate, PrinterSettings, CategoryConfig } from '../../types';
import {
  renderReceiptToCanvas,
  renderLabelToCanvas,
  executePrintBill,
  executePrintLabels,
  printBridgeInstance,
  BridgeConnectionStatus,
  DEFAULT_BRIDGE_WS_URL,
  ERROR_BRIDGE_NOT_RUNNING
} from '../../services/printBridgeService';
import { isItemPrintable } from '../../services/categoryService';
import { Printer, Tag, X, CheckCircle, AlertTriangle, RefreshCw, Info, Ban } from 'lucide-react';

interface PrintReceiptModalProps {
  order: Order;
  billTemplate: BillTemplate;
  labelTemplate: LabelTemplate;
  printerSettings: PrinterSettings;
  categoryConfigs?: CategoryConfig[];
  mode: 'bill' | 'label' | 'both';
  onClose: () => void;
  onPrintedBill?: () => void;
  onPrintedLabels?: () => void;
}

export const PrintReceiptModal: React.FC<PrintReceiptModalProps> = ({
  order,
  billTemplate,
  labelTemplate,
  printerSettings,
  categoryConfigs,
  mode: initialMode,
  onClose,
  onPrintedBill,
  onPrintedLabels,
}) => {
  const [activeTab, setActiveTab] = useState<'bill' | 'labels'>(initialMode === 'label' ? 'labels' : 'bill');
  const [bridgeStatus, setBridgeStatus] = useState<BridgeConnectionStatus>(printBridgeInstance.getStatus());
  const [actionFeedback, setActionFeedback] = useState<{ success?: boolean; text: string } | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isCheckingBridge, setIsCheckingBridge] = useState(false);

  const billCanvasRef = useRef<HTMLDivElement>(null);
  const labelCanvasesRef = useRef<HTMLDivElement>(null);

  // Compute printable items vs skipped items (accessories, napkins, etc.)
  const { printableItems, skippedItems, printableCupsCount } = useMemo(() => {
    const printable = order.items.filter(item => isItemPrintable(item, categoryConfigs));
    const skipped = order.items.filter(item => !isItemPrintable(item, categoryConfigs));
    const cupsCount = printable.reduce((sum, item) => sum + item.quantity, 0);
    return {
      printableItems: printable,
      skippedItems: skipped,
      printableCupsCount: cupsCount,
    };
  }, [order.items, categoryConfigs]);

  // Keep track of Local Print Bridge connection
  useEffect(() => {
    const unsub = printBridgeInstance.onStatusChange((status) => {
      setBridgeStatus(status);
    });
    return unsub;
  }, []);

  // Render previews into DOM
  useEffect(() => {
    // Bill canvas preview
    if (billCanvasRef.current) {
      billCanvasRef.current.innerHTML = '';
      const canvas = renderReceiptToCanvas(order, billTemplate, printerSettings.billPaperWidthMm || 85);
      canvas.className = 'max-w-full h-auto shadow-md border border-neutral-300 rounded bg-white';
      billCanvasRef.current.appendChild(canvas);
    }

    // Label canvases preview
    if (labelCanvasesRef.current) {
      labelCanvasesRef.current.innerHTML = '';
      let cupCounter = 1;

      printableItems.forEach(item => {
        for (let q = 0; q < item.quantity; q++) {
          const canvas = renderLabelToCanvas(order, item, cupCounter, printableCupsCount, labelTemplate);
          canvas.className = 'w-full h-auto shadow-md border border-neutral-300 rounded bg-white mb-3';
          labelCanvasesRef.current?.appendChild(canvas);
          cupCounter++;
        }
      });
    }
  }, [order, billTemplate, labelTemplate, printerSettings, activeTab, printableItems, printableCupsCount]);

  const handlePrintBill = async () => {
    setIsPrinting(true);
    setActionFeedback(null);
    try {
      const res = await executePrintBill(
        order,
        billTemplate,
        printerSettings,
        () => {
          window.print();
        }
      );
      setActionFeedback({ success: res.success, text: res.message });
      if (onPrintedBill) onPrintedBill();
    } catch (e) {
      setActionFeedback({ success: false, text: (e as Error).message });
    } finally {
      setIsPrinting(false);
    }
  };

  const handlePrintLabels = async () => {
    setIsPrinting(true);
    setActionFeedback(null);
    try {
      const res = await executePrintLabels(
        order,
        labelTemplate,
        printerSettings,
        () => {
          window.print();
        },
        categoryConfigs
      );
      setActionFeedback({ success: res.success, text: res.message });
      if (onPrintedLabels) onPrintedLabels();
    } catch (e) {
      setActionFeedback({ success: false, text: (e as Error).message });
    } finally {
      setIsPrinting(false);
    }
  };

  const handleBrowserPrint = () => {
    window.print();
  };

  const handleRetryBridge = async () => {
    setIsCheckingBridge(true);
    const wsUrl = printerSettings.bridgeWsUrl || DEFAULT_BRIDGE_WS_URL;
    await printBridgeInstance.checkConnection(wsUrl);
    setIsCheckingBridge(false);
  };

  const billIp = printerSettings.billPrinterIp || '192.168.1.79';
  const labelIp = printerSettings.labelPrinterIp || '192.168.1.52';
  const wsUrl = printerSettings.bridgeWsUrl || DEFAULT_BRIDGE_WS_URL;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="max-w-3xl w-full max-h-[92vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden text-neutral-900 border border-neutral-300 animate-in fade-in">
        {/* Header */}
        <div className="bg-neutral-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-600 flex items-center justify-center text-white font-bold text-sm">
              In
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Trung Tâm In Ấn & Xem Trước Đơn #{order.code}
              </h3>
              <p className="text-xs text-neutral-400">
                Máy in bill LAN: <span className="text-cyan-400 font-mono font-bold">{billIp}</span> • Máy in tem LAN: <span className="text-amber-400 font-mono font-bold">{labelIp}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-neutral-300 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Local Print Bridge connection bar */}
        <div className="px-5 py-2.5 bg-neutral-100 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-neutral-600">Print Bridge ({wsUrl}):</span>
            {bridgeStatus === 'connected' ? (
              <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full font-semibold">
                <CheckCircle className="w-3.5 h-3.5" /> Đã kết nối Print Bridge
              </span>
            ) : bridgeStatus === 'connecting' || isCheckingBridge ? (
              <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full font-semibold">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Đang kiểm tra kết nối...
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-red-700 bg-red-100 px-2.5 py-0.5 rounded-full font-semibold">
                <AlertTriangle className="w-3.5 h-3.5 text-red-600" /> Chưa kết nối (Bật print-bridge.exe)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {bridgeStatus !== 'connected' && (
              <button
                onClick={handleRetryBridge}
                disabled={isCheckingBridge}
                className="px-2.5 py-1 rounded bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-300 text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors"
              >
                <RefreshCw className={`w-3 h-3 ${isCheckingBridge ? 'animate-spin' : ''}`} /> Thử kết nối lại
              </button>
            )}
            <span className="text-[11px] text-neutral-500 font-mono">
              WebSocket Direct Port: 13579
            </span>
          </div>
        </div>

        {/* Print Bridge Offline Notice */}
        {bridgeStatus === 'error' && (
          <div className="px-5 py-2 bg-red-50 border-b border-red-200 text-xs font-semibold text-red-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{ERROR_BRIDGE_NOT_RUNNING}</span>
          </div>
        )}

        {/* Feedback Alert */}
        {actionFeedback && (
          <div className={`px-5 py-2.5 text-xs font-medium flex items-center gap-2 ${
            actionFeedback.success
              ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-200'
              : 'bg-amber-50 text-amber-800 border-b border-amber-200'
          }`}>
            {actionFeedback.success ? <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />}
            <span>{actionFeedback.text}</span>
          </div>
        )}

        {/* Tab selection */}
        <div className="flex border-b border-neutral-200 bg-neutral-50 px-5 pt-2">
          <button
            onClick={() => setActiveTab('bill')}
            className={`pb-2.5 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'bill'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>Mẫu Hóa Đơn Bill ({printerSettings.billPaperWidthMm || 85}mm)</span>
          </button>
          <button
            onClick={() => setActiveTab('labels')}
            className={`pb-2.5 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'labels'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>Mẫu Tem Dán Ly (50x30mm)</span>
            <span className="ml-1 px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded-full text-[10px]">
              {printableCupsCount} tem
            </span>
          </button>
        </div>

        {/* Preview Container */}
        <div className="flex-1 overflow-y-auto p-6 bg-neutral-200 flex justify-center items-start">
          {activeTab === 'bill' ? (
            <div className="w-full max-w-sm flex flex-col items-center">
              <div className="text-center mb-2 text-xs text-neutral-500 font-mono">
                Bản xem trước Hóa Đơn Khổ {printerSettings.billPaperWidthMm || 85}mm (Gửi tới LAN {billIp}:9100)
              </div>
              <div ref={billCanvasRef} className="flex justify-center" />
            </div>
          ) : (
            <div className="w-full max-w-md flex flex-col items-center space-y-3">
              {/* Informative notice about skipped items */}
              {skippedItems.length > 0 && (
                <div className="w-full p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center gap-2 shadow-xs">
                  <Info className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Đã tự động bỏ qua <strong>{skippedItems.length} món</strong> phụ kiện/đồ dùng không in tem (
                    {skippedItems.map(i => i.name).join(', ')}) để tránh lãng phí tem dán.
                  </span>
                </div>
              )}

              {printableCupsCount === 0 ? (
                <div className="w-full p-8 text-center bg-white rounded-2xl border border-neutral-300 shadow-sm space-y-2">
                  <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mx-auto text-neutral-400">
                    <Ban className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-neutral-800">Không có món nào cần in tem</h4>
                  <p className="text-xs text-neutral-500 max-w-xs mx-auto">
                    Tất cả các món trong đơn hàng này thuộc danh mục phụ kiện / đồ dùng đã được cấu hình không in tem.
                  </p>
                </div>
              ) : (
                <>
                  <div className="text-center text-xs text-neutral-500 font-mono">
                    Bản xem trước {printableCupsCount} Tem Dán Ly Khổ 50mm x 30mm (Gửi tới LAN {labelIp}:9100)
                  </div>
                  <div ref={labelCanvasesRef} className="w-full" />
                </>
              )}
            </div>
          )}
        </div>

        {/* Action Bottom Bar */}
        <div className="p-4 bg-white border-t border-neutral-200 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-600 hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            Đóng
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleBrowserPrint}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-300 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              In Trình Duyệt (Ctrl+P)
            </button>

            {activeTab === 'labels' ? (
              <button
                onClick={handlePrintLabels}
                disabled={isPrinting || printableCupsCount === 0}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-black shadow-md flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <Tag className="w-4 h-4" />
                <span>
                  {isPrinting ? 'Đang gửi Print Bridge...' : `In ${printableCupsCount} Tem Ly (50x30)`}
                </span>
              </button>
            ) : (
              <button
                onClick={handlePrintBill}
                disabled={isPrinting}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-black shadow-md flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>{isPrinting ? 'Đang gửi Print Bridge...' : 'In Hóa Đơn Bill'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
