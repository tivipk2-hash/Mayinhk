import { Order, OrderItem, BillTemplate, LabelTemplate, PrinterSettings, CategoryConfig } from '../types';
import { drawVietQRToContext } from './vietqr';
import { isItemPrintable } from './categoryService';

export const DEFAULT_BRIDGE_WS_URL = 'ws://localhost:13579';

export const ERROR_BRIDGE_NOT_RUNNING =
  'Không thể kết nối tới Print Bridge. Vui lòng kiểm tra file print-bridge.exe đã được bật dưới máy trạm hay chưa.';

export type BridgeConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface PrintBridgePayload {
  action: 'print_lan';
  printerIp: string;
  printerPort: number;
  bytes: number[];
}

export interface PrintBridgeResponse {
  status?: string;
  success?: boolean;
  message?: string;
  error?: string;
}

/**
 * Manages background connection status to Local Print Bridge (ws://localhost:13579)
 */
class PrintBridgeService {
  private status: BridgeConnectionStatus = 'disconnected';
  private statusListeners: ((status: BridgeConnectionStatus, message?: string) => void)[] = [];
  private lastMessage: string = '';
  private currentWsUrl: string = DEFAULT_BRIDGE_WS_URL;
  private isChecking: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      setTimeout(() => this.checkConnection(), 600);
      // Auto-poll connection every 15s
      setInterval(() => {
        if (typeof document !== 'undefined' && !document.hidden) {
          this.checkConnection(this.currentWsUrl, true);
        }
      }, 15000);
    }
  }

  public getStatus(): BridgeConnectionStatus {
    return this.status;
  }

  public getLastError(): string {
    return this.lastMessage;
  }

  public onStatusChange(listener: (status: BridgeConnectionStatus, message?: string) => void): () => void {
    this.statusListeners.push(listener);
    listener(this.status, this.lastMessage);
    return () => {
      this.statusListeners = this.statusListeners.filter(l => l !== listener);
    };
  }

  private notify(status: BridgeConnectionStatus, message?: string) {
    this.status = status;
    if (message !== undefined) this.lastMessage = message;
    this.statusListeners.forEach(l => l(status, message));
  }

  /**
   * Performs a lightweight WebSocket ping to check if print-bridge.exe is active on ws://localhost:13579
   */
  public async checkConnection(wsUrl: string = DEFAULT_BRIDGE_WS_URL, silent: boolean = false): Promise<boolean> {
    this.currentWsUrl = wsUrl || DEFAULT_BRIDGE_WS_URL;
    if (this.isChecking) return this.status === 'connected';
    this.isChecking = true;

    if (!silent) {
      this.notify('connecting', 'Đang kiểm tra kết nối Print Bridge...');
    }

    return new Promise<boolean>((resolve) => {
      let socket: WebSocket | null = null;
      let timer: any = null;
      let isDone = false;

      const finish = (ok: boolean, msg: string) => {
        if (isDone) return;
        isDone = true;
        this.isChecking = false;
        if (timer) clearTimeout(timer);
        if (socket) {
          try {
            socket.onopen = null;
            socket.onerror = null;
            socket.onclose = null;
            socket.close();
          } catch (_) {}
        }
        this.notify(ok ? 'connected' : 'error', msg);
        resolve(ok);
      };

      timer = setTimeout(() => {
        finish(false, ERROR_BRIDGE_NOT_RUNNING);
      }, 2500);

      try {
        socket = new WebSocket(this.currentWsUrl);
      } catch (e) {
        finish(false, ERROR_BRIDGE_NOT_RUNNING);
        return;
      }

      socket.onopen = () => {
        finish(true, `Đã kết nối thành công tới Print Bridge (${this.currentWsUrl})`);
      };

      socket.onerror = () => {
        finish(false, ERROR_BRIDGE_NOT_RUNNING);
      };

      socket.onclose = () => {
        if (!isDone) {
          finish(false, ERROR_BRIDGE_NOT_RUNNING);
        }
      };
    });
  }

  /**
   * For backwards compatibility with old QZ references
   */
  public async connect(host = 'localhost', port?: number): Promise<boolean> {
    const url = port ? `ws://${host}:${port}` : DEFAULT_BRIDGE_WS_URL;
    return this.checkConnection(url);
  }

  public async getPrinters(): Promise<string[]> {
    return [
      'Máy in Bill LAN (192.168.1.79:9100)',
      'Máy in Tem LAN (192.168.1.52:9100)',
    ];
  }
}

export const printBridgeInstance = new PrintBridgeService();
// Backwards compatibility alias
export const qzInstance = printBridgeInstance;
export type QzConnectionStatus = BridgeConnectionStatus;

/**
 * Sends a raw ESC/POS or TSPL byte payload to Local Print Bridge via WebSocket
 * adhering strictly to the requested JSON payload format:
 * {
 *   "action": "print_lan",
 *   "printerIp": "<IP_MAY_IN_LAN>",
 *   "printerPort": 9100,
 *   "bytes": [<Mang_chuoi_byte_ESC_POS>]
 * }
 */
export function sendToPrintBridge(
  payload: PrintBridgePayload,
  wsUrl: string = DEFAULT_BRIDGE_WS_URL,
  timeoutMs: number = 8000
): Promise<{ success: boolean; message: string }> {
  return new Promise((resolve) => {
    let socket: WebSocket | null = null;
    let timer: any = null;
    let isFinished = false;

    const finish = (success: boolean, message: string) => {
      if (isFinished) return;
      isFinished = true;
      if (timer) clearTimeout(timer);
      if (socket) {
        try {
          socket.onopen = null;
          socket.onmessage = null;
          socket.onerror = null;
          socket.onclose = null;
          socket.close();
        } catch (_) {}
      }
      resolve({ success, message });
    };

    // Timeout: if no connection or response within timeoutMs
    timer = setTimeout(() => {
      finish(false, ERROR_BRIDGE_NOT_RUNNING);
    }, timeoutMs);

    try {
      socket = new WebSocket(wsUrl);
    } catch (e) {
      finish(false, ERROR_BRIDGE_NOT_RUNNING);
      return;
    }

    socket.onopen = () => {
      try {
        const jsonPayload = JSON.stringify(payload);
        socket?.send(jsonPayload);
      } catch (err) {
        finish(false, `Lỗi gửi dữ liệu tới Print Bridge: ${(err as Error).message}`);
      }
    };

    socket.onmessage = (event: MessageEvent) => {
      try {
        const raw = event.data;
        let data: PrintBridgeResponse = {};
        if (typeof raw === 'string') {
          data = JSON.parse(raw);
        } else if (typeof raw === 'object' && raw !== null) {
          data = raw as PrintBridgeResponse;
        }

        // Check if response.status === 'success' as requested
        if (data.status === 'success' || data.success === true) {
          finish(true, data.message || 'Lệnh in đã được gửi tới máy in thành công!');
        } else {
          finish(
            false,
            data.message || data.error || 'Máy in báo lỗi khi thực hiện lệnh in từ Print Bridge'
          );
        }
      } catch (err) {
        // Fallback if response is plain text containing "success"
        if (typeof event.data === 'string' && event.data.toLowerCase().includes('success')) {
          finish(true, event.data);
        } else {
          finish(false, `Phản hồi không mong đợi từ Print Bridge: ${String(event.data)}`);
        }
      }
    };

    socket.onerror = () => {
      finish(false, ERROR_BRIDGE_NOT_RUNNING);
    };

    socket.onclose = () => {
      if (!isFinished) {
        finish(false, ERROR_BRIDGE_NOT_RUNNING);
      }
    };
  });
}

// ==========================================
// CANVASES RASTERIZERS (ESC/POS & TSPL)
// ==========================================

export function removeVietnameseAccents(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount);
}

export function formatDateTime(isoString: string): { time: string; date: string; full: string } {
  const d = new Date(isoString);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return {
    time: `${hours}:${minutes}`,
    date: `${day}/${month}/${year}`,
    full: `${hours}:${minutes} ${day}/${month}/${year}`,
  };
}

/**
 * 100% ACCURATE VIETNAMESE BILL RASTERIZER:
 * Renders the bill directly onto an HTML5 Canvas at 203 DPI (576px wide for 80/85mm),
 * matching the exact real receipt layout.
 */
export function renderReceiptToCanvas(
  order: Order,
  template: BillTemplate,
  paperWidthMm: number = 85
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const width = paperWidthMm <= 60 ? 384 : 576;
  canvas.width = width;

  let estimatedHeight = 580;
  estimatedHeight += order.items.length * 68;
  order.items.forEach((i) => {
    if (i.note) estimatedHeight += 32;
    if (i.size) estimatedHeight += 24;
  });

  const shouldRenderQr = order.paymentMethod === 'transfer' && template.vietQr?.enabled !== false && !!template.vietQr?.accountNo;
  if (shouldRenderQr) {
    estimatedHeight += 340;
  }

  canvas.height = estimatedHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#000000';
  ctx.textBaseline = 'top';

  const fontStack = "'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif";

  const drawDashedDivider = (currY: number) => {
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(16, currY);
    ctx.lineTo(width - 16, currY);
    ctx.stroke();
    ctx.setLineDash([]);
    return currY + 14;
  };

  let y = 18;

  // 1. Header: Shop Name
  ctx.font = `bold 28px ${fontStack}`;
  ctx.textAlign = 'center';
  ctx.fillText((template.shopName || 'HONGKONG CỔ TRẤN').toUpperCase(), width / 2, y);
  y += 36;

  // Address
  ctx.font = `bold 17px ${fontStack}`;
  ctx.fillText(template.address || 'Lâm Đồng, Việt Nam', width / 2, y);
  y += 24;

  // Phone
  ctx.fillText(template.phone || '0336730797', width / 2, y);
  y += 28;

  // Divider
  y = drawDashedDivider(y);

  // 2. Title: HOÁ ĐƠN THANH TOÁN
  ctx.font = `bold 26px ${fontStack}`;
  ctx.fillText(template.billTitle || 'HOÁ ĐƠN THANH TOÁN', width / 2, y);
  y += 32;

  // Bill Number
  ctx.font = `bold 18px ${fontStack}`;
  ctx.fillText(`Số: ${order.orderNumber || order.code || '0001'}`, width / 2, y);
  y += 26;

  // Divider
  y = drawDashedDivider(y);

  // 3. Metadata
  ctx.textAlign = 'left';
  ctx.font = `bold 17px ${fontStack}`;
  const dt = formatDateTime(order.createdAt);

  if (template.printDateTime !== false) {
    ctx.fillText(`Giờ vào: ${dt.time} ${dt.date}`, 18, y);
    y += 24;
  }

  if (template.printCashier !== false) {
    ctx.fillText(`Thu ngân: ${order.staffName || 'Thanh Hằng'}`, 18, y);
    y += 24;
  }

  const customerType = order.type === 'takeaway' ? 'Khách lẻ (Mang đi)' : (order.tableNumber ? `Bàn ${order.tableNumber}` : 'Khách tại bàn');
  ctx.fillText(`Khách hàng: ${customerType}`, 18, y);
  y += 28;

  // 4. Columns Header: Tên món | SL | Đơn giá | T.Tiền
  ctx.font = `bold 18px ${fontStack}`;
  ctx.textAlign = 'left';
  ctx.fillText('Tên món', 18, y);

  ctx.textAlign = 'center';
  ctx.fillText('SL', width - 215, y);

  ctx.textAlign = 'right';
  ctx.fillText('Đơn giá', width - 110, y);
  ctx.fillText('T.Tiền', width - 18, y);
  y += 24;

  // Divider
  y = drawDashedDivider(y);

  // 5. Items list
  order.items.forEach((item) => {
    ctx.font = `bold 20px ${fontStack}`;
    ctx.textAlign = 'left';

    ctx.fillText(item.name, 18, y);

    ctx.textAlign = 'center';
    ctx.fillText(String(item.quantity), width - 215, y);

    ctx.textAlign = 'right';
    ctx.fillText(formatVND(item.price), width - 110, y);
    ctx.fillText(formatVND(item.price * item.quantity), width - 18, y);
    y += 26;

    if (item.size) {
      ctx.textAlign = 'left';
      ctx.font = `bold 17px ${fontStack}`;
      ctx.fillText(`(${item.size})`, 22, y);
      y += 22;
    }

    if (item.note) {
      ctx.textAlign = 'left';
      ctx.font = `italic bold 17px ${fontStack}`;
      ctx.fillText(`- ${item.note}`, 24, y);
      y += 24;
    }
  });

  // Divider
  y = drawDashedDivider(y);

  // 6. Summary Block
  ctx.font = `bold 18px ${fontStack}`;
  ctx.textAlign = 'left';
  ctx.fillText('Tổng tiền:', 18, y);
  ctx.textAlign = 'right';
  ctx.fillText(formatVND(order.subtotal || order.total), width - 18, y);
  y += 26;

  ctx.textAlign = 'left';
  ctx.fillText('Giảm giá:', 18, y);
  ctx.textAlign = 'right';
  ctx.fillText(formatVND(order.discount || 0), width - 18, y);
  y += 26;

  // Divider
  y = drawDashedDivider(y);

  // 7. Payment Block
  ctx.font = `bold 26px ${fontStack}`;
  ctx.textAlign = 'left';
  ctx.fillText('Thanh toán:', 18, y);
  ctx.textAlign = 'right';
  ctx.fillText(`${formatVND(order.total)} đ`, width - 18, y);
  y += 34;

  ctx.font = `bold 18px ${fontStack}`;
  ctx.textAlign = 'left';
  ctx.fillText('Phương thức:', 18, y);
  ctx.textAlign = 'right';
  ctx.fillText(order.paymentMethod === 'transfer' ? 'Chuyển khoản (VietQR)' : 'Tiền mặt', width - 18, y);
  y += 24;

  if (order.paymentMethod !== 'transfer') {
    ctx.textAlign = 'left';
    ctx.fillText('Tiền khách đưa:', 18, y);
    ctx.textAlign = 'right';
    ctx.fillText(formatVND(order.total), width - 18, y);
    y += 24;

    ctx.textAlign = 'left';
    ctx.fillText('Tiền thừa:', 18, y);
    ctx.textAlign = 'right';
    ctx.fillText('0', width - 18, y);
    y += 28;
  }

  // 7.1 DYNAMIC VIETQR PAYMENT BLOCK
  if (shouldRenderQr && template.vietQr) {
    y = drawDashedDivider(y);

    ctx.textAlign = 'center';
    ctx.font = `bold 20px ${fontStack}`;
    ctx.fillText('MÃ QR THANH TOÁN (VIETQR)', width / 2, y);
    y += 24;

    ctx.font = `bold 18px ${fontStack}`;
    ctx.fillText(`Số tiền chính xác: ${formatVND(order.total)} đ`, width / 2, y);
    y += 24;

    const qrResult = drawVietQRToContext(
      ctx,
      template.vietQr,
      order.total,
      order.code,
      width / 2,
      y,
      190
    );
    y += (qrResult.renderedHeight || 190) + 12;

    ctx.font = `bold 16px ${fontStack}`;
    const bankDisplay = template.vietQr.bankName || template.vietQr.bankId;
    ctx.fillText(bankDisplay, width / 2, y);
    y += 22;

    const accName = template.vietQr.accountName ? ` - ${template.vietQr.accountName}` : '';
    ctx.fillText(`STK: ${template.vietQr.accountNo}${accName}`, width / 2, y);
    y += 22;

    const memoTemplate = template.vietQr.transferSyntax || 'DH {code}';
    const memo = memoTemplate.replace(/\{code\}/gi, order.code).replace(/\{orderCode\}/gi, order.code);
    ctx.fillText(`Nội dung: ${memo}`, width / 2, y);
    y += 22;

    ctx.font = `italic 14px ${fontStack}`;
    ctx.fillText('(Quét bằng App Ngân hàng bất kỳ - Tiền tự động điền sẵn)', width / 2, y);
    y += 26;
  }

  // Divider
  y = drawDashedDivider(y);

  // 8. Footer
  ctx.textAlign = 'center';
  if (template.tableNotice) {
    ctx.font = `bold 17px ${fontStack}`;
    ctx.fillText(template.tableNotice.toUpperCase(), width / 2, y);
    y += 24;
  }

  const wifiText = `Wifi: ${template.wifiSsid || 'HongKong94'}  -  Pass: ${template.wifiPass || '99999999'}`;
  ctx.font = `bold 16px ${fontStack}`;
  ctx.fillText(wifiText, width / 2, y);
  y += 24;

  const footerMsg = template.footerMessage || 'Xin cảm ơn Quý khách & Hẹn gặp lại!';
  ctx.font = `italic bold 16px ${fontStack}`;
  ctx.fillText(footerMsg, width / 2, y);
  y += 28;

  return canvas;
}

/**
 * 100% ACCURATE VIETNAMESE CUP LABEL RASTERIZER (Khổ chuẩn 50mm x 30mm)
 * - Khổ canvas: 400 x 216 px (tương đương 50mm x 27mm ở 203 DPI, chừa biên an toàn)
 */
export function renderLabelToCanvas(
  order: Order,
  item: OrderItem,
  cupIndex: number,
  totalCupsInOrder: number,
  labelTemplate: LabelTemplate
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 216;

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#000000';
  ctx.strokeStyle = '#000000';
  ctx.textBaseline = 'top';

  const fontStack = "'Arial', 'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif";

  const leftX = 22;
  const rightX = 378;
  const centerX = 200;

  // 1. Top row: Cup index & Order code
  ctx.font = `bold 16px ${fontStack}`;
  ctx.textAlign = 'left';
  const prefix = labelTemplate.headerPrefix || 'Ly';
  const cupNumberText = `[${prefix} ${cupIndex}/${totalCupsInOrder}]`;
  ctx.fillText(cupNumberText, leftX, 8);

  ctx.textAlign = 'right';
  const orderType = order.type === 'takeaway' ? 'Mang đi' : (order.tableNumber ? `Bàn ${order.tableNumber}` : 'Tại quán');
  const orderCodeText = `#${order.code} • ${orderType}`;
  ctx.fillText(orderCodeText, rightX, 8);

  // Top divider
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(leftX, 28);
  ctx.lineTo(rightX, 28);
  ctx.stroke();

  const drawSolidText = (text: string, x: number, y: number, strokeWidth: number = 0.9) => {
    ctx.lineWidth = strokeWidth;
    ctx.fillText(text, x, y);
    ctx.strokeText(text, x, y);
  };

  // 2. Middle: Item Name
  const displayName = `${item.name}${item.size ? ` (${item.size})` : ''}`;
  ctx.textAlign = 'center';
  const hasNote = Boolean(item.note && item.note.trim());

  if (displayName.length <= 16) {
    ctx.font = `900 36px ${fontStack}`;
    const nameY = hasNote ? 40 : 58;
    drawSolidText(displayName, centerX, nameY, 1.2);
  } else if (displayName.length <= 22) {
    ctx.font = `900 30px ${fontStack}`;
    const nameY = hasNote ? 42 : 60;
    drawSolidText(displayName, centerX, nameY, 1.0);
  } else {
    ctx.font = `900 25px ${fontStack}`;
    const words = displayName.split(' ');
    let line1 = '';
    let line2 = '';
    for (const w of words) {
      if ((line1 + ' ' + w).trim().length <= 16 && !line2) {
        line1 = (line1 + ' ' + w).trim();
      } else {
        line2 = (line2 + ' ' + w).trim();
      }
    }
    if (!line2) {
      line1 = displayName;
      drawSolidText(line1, centerX, hasNote ? 42 : 60, 1.0);
    } else {
      drawSolidText(line1, centerX, hasNote ? 34 : 46, 0.9);
      drawSolidText(line2, centerX, hasNote ? 62 : 76, 0.9);
    }
  }

  // 3. Item Note
  if (item.note && item.note.trim()) {
    ctx.font = `bold 22px ${fontStack}`;
    const cleanNote = item.note.trim();
    const noteText = cleanNote.startsWith('*') ? cleanNote : `* ${cleanNote}`;
    drawSolidText(noteText, centerX, 106, 0.9);
  }

  // 4. Bottom divider
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(leftX, 156);
  ctx.lineTo(rightX, 156);
  ctx.stroke();

  // 5. Footer: Shop name & Date
  ctx.font = `bold 14px ${fontStack}`;
  ctx.textAlign = 'left';
  const footerNote = labelTemplate.footerNote || 'HongKong Cổ Trấn';
  ctx.fillText(footerNote, leftX, 166);

  const dt = formatDateTime(order.createdAt);
  ctx.font = `bold 13px ${fontStack}`;
  ctx.textAlign = 'right';
  ctx.fillText(`${dt.time} ${dt.date}`, rightX, 166);

  return canvas;
}

/**
 * Converts an HTML5 Canvas into monochrome 1-bit ESC/POS GS v 0 raster command.
 * Output: Uint8Array containing ESC/POS commands ready for thermal bill printer.
 */
export function convertCanvasToEscPosRaster(canvas: HTMLCanvasElement): Uint8Array {
  const ctx = canvas.getContext('2d');
  if (!ctx) return new Uint8Array();

  const width = canvas.width;
  const height = canvas.height;
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // Width in bytes (must be multiple of 8)
  const widthBytes = Math.ceil(width / 8);
  const xL = widthBytes % 256;
  const xH = Math.floor(widthBytes / 256);
  const yL = height % 256;
  const yH = Math.floor(height / 256);

  // Initialize printer: ESC @ (0x1B, 0x40)
  // GS v 0 m xL xH yL yH
  const header = [0x1b, 0x40, 0x1d, 0x76, 0x30, 0x00, xL, xH, yL, yH];
  // 7 bytes cut & feed suffix: ESC d 3 + GS V 66 0
  const suffix = [0x1b, 0x64, 0x03, 0x1d, 0x56, 0x42, 0x00];

  const rasterBytes = new Uint8Array(header.length + (widthBytes * height) + suffix.length);
  rasterBytes.set(header, 0);

  let byteIndex = header.length;

  for (let y = 0; y < height; y++) {
    for (let xByte = 0; xByte < widthBytes; xByte++) {
      let byteVal = 0;
      for (let bit = 0; bit < 8; bit++) {
        const x = (xByte * 8) + bit;
        if (x < width) {
          const pixelOffset = (y * width + x) * 4;
          const r = data[pixelOffset];
          const g = data[pixelOffset + 1];
          const b = data[pixelOffset + 2];
          const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
          if (luminance < 180) {
            byteVal |= (1 << (7 - bit));
          }
        }
      }
      rasterBytes[byteIndex++] = byteVal;
    }
  }

  rasterBytes.set(suffix, byteIndex);
  return rasterBytes;
}

/**
 * Converts an HTML5 Canvas into standard TSPL commands with BITMAP data
 * for thermal cup label printers (50mm x 30mm with gap sensor).
 */
export function convertCanvasToTsplBytes(canvas: HTMLCanvasElement): Uint8Array {
  const ctx = canvas.getContext('2d');
  if (!ctx) return new Uint8Array();

  const width = canvas.width; // 400
  const height = canvas.height; // 216
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  const widthBytes = Math.ceil(width / 8); // 50 bytes

  const prefix = `SIZE 50 mm,30 mm\r\nGAP 2 mm,0 mm\r\nDIRECTION 1\r\nCLS\r\nBITMAP 0,0,${widthBytes},${height},0,`;
  const suffix = `\r\nPRINT 1,1\r\n`;

  const encoder = new TextEncoder();
  const prefixBytes = encoder.encode(prefix);
  const suffixBytes = encoder.encode(suffix);

  const bitmapBytes = new Uint8Array(widthBytes * height);
  bitmapBytes.fill(0xff); // In TSPL mode 0: 1 = white, 0 = black dot

  let byteIdx = 0;
  for (let y = 0; y < height; y++) {
    for (let xByte = 0; xByte < widthBytes; xByte++) {
      let b = 0xff;
      for (let bit = 0; bit < 8; bit++) {
        const x = xByte * 8 + bit;
        if (x < width) {
          const offset = (y * width + x) * 4;
          const r = data[offset];
          const g = data[offset + 1];
          const bVal = data[offset + 2];
          const lum = 0.299 * r + 0.587 * g + 0.114 * bVal;
          if (lum < 180) {
            // Black dot -> 0 bit
            b &= ~(1 << (7 - bit));
          }
        }
      }
      bitmapBytes[byteIdx++] = b;
    }
  }

  const total = new Uint8Array(prefixBytes.length + bitmapBytes.length + suffixBytes.length);
  total.set(prefixBytes, 0);
  total.set(bitmapBytes, prefixBytes.length);
  total.set(suffixBytes, prefixBytes.length + bitmapBytes.length);
  return total;
}

/**
 * Pre-flight connection check to Local Print Bridge WebSocket service
 */
export async function checkPrinterConnection(
  settings: PrinterSettings,
  type: 'bill' | 'label'
): Promise<{ ok: boolean; message: string; target?: any; displayName?: string }> {
  if (settings.printMode === 'browser') {
    return { ok: true, message: 'Chế độ in trình duyệt sẵn sàng.' };
  }

  const wsUrl = settings.bridgeWsUrl || DEFAULT_BRIDGE_WS_URL;
  const isConnected = await printBridgeInstance.checkConnection(wsUrl);

  const targetIp = type === 'bill' ? (settings.billPrinterIp || '192.168.1.79') : (settings.labelPrinterIp || '192.168.1.52');
  const targetPort = type === 'bill' ? (settings.billPrinterPort || 9100) : (settings.labelPrinterPort || 9100);
  const displayName = type === 'bill' ? `Máy in Bill [${targetIp}:${targetPort}]` : `Máy in Tem [${targetIp}:${targetPort}]`;

  if (!isConnected) {
    return {
      ok: false,
      message: ERROR_BRIDGE_NOT_RUNNING,
    };
  }

  return {
    ok: true,
    message: `Print Bridge sẵn sàng in tới ${displayName}.`,
    displayName,
  };
}

/**
 * Prints bill receipt directly to WebSocket Local Service at ws://localhost:13579
 * Default Bill Printer IP: 192.168.1.79:9100
 */
export async function executePrintBill(
  order: Order,
  template: BillTemplate,
  settings: PrinterSettings,
  onFallbackBrowser?: (canvas: HTMLCanvasElement) => void
): Promise<{ success: boolean; message: string; canRetry?: boolean }> {
  try {
    const canvas = renderReceiptToCanvas(order, template, settings.billPaperWidthMm || 85);

    if (settings.printMode === 'browser') {
      if (onFallbackBrowser) onFallbackBrowser(canvas);
      return {
        success: true,
        message: 'Đang mở hộp thoại in trình duyệt...',
      };
    }

    const printerIp = (settings.billPrinterIp || '192.168.1.79').trim();
    const printerPort = Number(settings.billPrinterPort) || 9100;
    const wsUrl = (settings.bridgeWsUrl || DEFAULT_BRIDGE_WS_URL).trim();

    // Generate ESC/POS raster byte stream
    const rasterBytes = convertCanvasToEscPosRaster(canvas);
    const bytesArray = Array.from(rasterBytes);

    const payload: PrintBridgePayload = {
      action: 'print_lan',
      printerIp,
      printerPort,
      bytes: bytesArray,
    };

    const copies = Math.max(1, settings.billCopies || 1);
    for (let c = 0; c < copies; c++) {
      const res = await sendToPrintBridge(payload, wsUrl, 8000);
      if (!res.success) {
        if (onFallbackBrowser) onFallbackBrowser(canvas);
        return {
          success: false,
          message: res.message || ERROR_BRIDGE_NOT_RUNNING,
          canRetry: true,
        };
      }
      if (c < copies - 1) {
        await new Promise((r) => setTimeout(r, 400));
      }
    }

    return {
      success: true,
      message: `Đã in hóa đơn đơn #${order.code} thành công qua Print Bridge (Máy in ${printerIp}:${printerPort})!`,
    };
  } catch (error) {
    console.error('Error printing bill via Print Bridge:', error);
    return {
      success: false,
      message: ERROR_BRIDGE_NOT_RUNNING,
      canRetry: true,
    };
  }
}

/**
 * Prints cup labels directly to WebSocket Local Service at ws://localhost:13579
 * Default Label Printer IP: 192.168.1.52:9100
 */
export async function executePrintLabels(
  order: Order,
  template: LabelTemplate,
  settings: PrinterSettings,
  onFallbackBrowser?: (canvases: HTMLCanvasElement[]) => void,
  categoryConfigs?: CategoryConfig[]
): Promise<{ success: boolean; count: number; message: string; canRetry?: boolean }> {
  try {
    const canvases: HTMLCanvasElement[] = [];
    const printableItems = order.items.filter(item => isItemPrintable(item, categoryConfigs));
    let totalCups = 0;
    printableItems.forEach(i => totalCups += i.quantity);

    let cupCounter = 1;
    printableItems.forEach(item => {
      for (let q = 0; q < item.quantity; q++) {
        const c = renderLabelToCanvas(order, item, cupCounter, totalCups, template);
        canvases.push(c);
        cupCounter++;
      }
    });

    if (canvases.length === 0) {
      return {
        success: true,
        count: 0,
        message: 'Đơn hàng không có món nào cần in tem (Đã tự động bỏ qua các món phụ kiện/đồ dùng).',
      };
    }

    if (settings.printMode === 'browser') {
      if (onFallbackBrowser) onFallbackBrowser(canvases);
      return {
        success: true,
        count: canvases.length,
        message: `Đang mở xem trước in ${canvases.length} tem qua trình duyệt...`,
      };
    }

    const printerIp = (settings.labelPrinterIp || '192.168.1.52').trim();
    const printerPort = Number(settings.labelPrinterPort) || 9100;
    const wsUrl = (settings.bridgeWsUrl || DEFAULT_BRIDGE_WS_URL).trim();

    for (let i = 0; i < canvases.length; i++) {
      const canvas = canvases[i];
      // Generate TSPL bytes or ESC/POS bytes based on configuration
      const labelBytes = settings.labelCommandType === 'escpos'
        ? convertCanvasToEscPosRaster(canvas)
        : convertCanvasToTsplBytes(canvas);

      const payload: PrintBridgePayload = {
        action: 'print_lan',
        printerIp,
        printerPort,
        bytes: Array.from(labelBytes),
      };

      const res = await sendToPrintBridge(payload, wsUrl, 8000);
      if (!res.success) {
        if (onFallbackBrowser) onFallbackBrowser(canvases);
        return {
          success: false,
          count: i,
          message: res.message || ERROR_BRIDGE_NOT_RUNNING,
          canRetry: true,
        };
      }

      if (i < canvases.length - 1) {
        await new Promise((r) => setTimeout(r, 250));
      }
    }

    return {
      success: true,
      count: canvases.length,
      message: `Đã in ${canvases.length} tem ly thành công qua Print Bridge (Máy in ${printerIp}:${printerPort})!`,
    };
  } catch (error) {
    console.error('Error printing labels via Print Bridge:', error);
    return {
      success: false,
      count: 0,
      message: ERROR_BRIDGE_NOT_RUNNING,
      canRetry: true,
    };
  }
}
