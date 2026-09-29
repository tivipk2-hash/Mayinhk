export type CategoryType = 'beverage' | 'food' | 'accessory' | 'other';

export interface CategoryConfig {
  id: string;
  name: string;
  type: CategoryType; // 'beverage' | 'food' | 'accessory' | 'other'
  printLabel: boolean; // In tem khi chế biến/gọi món: Có (true) / Không (false)
  description?: string;
}

export interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  image: string;
  isAvailable: boolean;
  description?: string;
  sizes?: { name: string; extraPrice: number }[];
  printLabel?: boolean; // Tùy chọn in tem cấp độ món (true: bắt buộc in, false: không in, undefined: kế thừa từ danh mục)
}

export interface OrderItem {
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  category?: string;
  size?: string;
  note?: string;
  labelsPrinted?: boolean; // Tracks whether cup labels have already been printed
  printLabel?: boolean; // Có in tem hay không (sau khi kế thừa cấu hình danh mục/món)
}

export interface Order {
  id: string;
  code: string; // e.g. T45326 or T60353
  orderNumber: string; // e.g. 700002582
  items: OrderItem[];
  subtotal: number;
  discount: number; // percentage or fixed
  total: number;
  type: 'takeaway' | 'dinein';
  tableNumber?: string;
  customerCount?: number;
  status: 'pending' | 'completed' | 'cancelled';
  staffId: string;
  staffName: string;
  shiftId: string;
  createdAt: string; // ISO string
  paymentMethod: 'cash' | 'transfer';
  labelsPrintedCount: number; // number of times labels were printed
  billPrintedCount: number; // number of times bill was printed
}

export interface Expense {
  id: string;
  title: string;
  category: string; // 'nguyen_lieu' | 'dien_nuoc' | 'nhan_cong' | 'bao_bi' | 'khac'
  amount: number;
  date: string; // YYYY-MM-DD
  staffId: string;
  staffName: string;
  note?: string;
  createdAt: string;
}

export type UserRole = 'admin' | 'staff' | 'viewer';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  passwordHash: string;
  activeShift?: string;
}

export interface Shift {
  id: string;
  staffId: string;
  staffName: string;
  startTime: string;
  endTime?: string;
  date: string; // YYYY-MM-DD
  initialCash: number;
  totalSales: number;
  orderCount: number;
  status: 'open' | 'closed';
}

export interface TvChannel {
  id: number;
  title: string;
  youtubeId: string;
  description: string;
  channelName: string;
}

export interface GalleryCorner {
  id: string;
  title: string;
  subtitle: string;
  category: string; // 'all' | 'cophuc' | 'gacgo' | 'doco'
  description: string;
  images: string[];
}

export interface PrinterSettings {
  // Bill printer (85mm / 80mm)
  billPrinterIp: string; // 192.168.1.79
  billPrinterPort: number; // 9100
  billPaperWidthMm: number; // 85
  billCopies: number; // 1
  billPrinterName: string;

  // Label printer (50x30mm)
  labelPrinterIp: string; // 192.168.1.52
  labelPrinterPort: number; // 9100
  labelWidthMm: number; // 50
  labelHeightMm: number; // 30
  labelPrinterName: string;
  labelCommandType?: 'tspl' | 'escpos'; // default: tspl

  // Print rules
  printBothOnCheckout?: boolean; // In Hóa đơn và Tem ly cùng lúc khi nhấn Thanh toán (F1)

  // Local Print Bridge WebSocket config
  bridgeWsUrl: string; // ws://localhost:13579
  printMode?: 'raw' | 'pixel' | 'raster' | 'escpos' | 'browser' | 'bridge'; // Chuẩn in
  qzHost?: string;
  qzPort?: number;
  qzUseSecure?: boolean;
}

export interface VietQRConfig {
  enabled: boolean; // Bật / Tắt tính năng in mã QR trên hóa đơn
  bankId: string; // Mã ngân hàng (ví dụ: "MB", "VCB", "TCB", "CTG", v.v.)
  bankName: string; // Tên hiển thị ngân hàng
  accountNo: string; // Số tài khoản nhận tiền
  accountName: string; // Tên chủ tài khoản
  template?: 'compact2' | 'compact' | 'qr_only';
  transferSyntax?: string; // Cú pháp nội dung chuyển khoản, vd: "DH {code}"
}

export interface BillTemplate {
  shopName: string;
  address: string;
  phone: string;
  billTitle: string;
  tableNotice: string;
  wifiSsid: string;
  wifiPass: string;
  footerMessage: string;
  printDateTime?: boolean; // In ngày giờ xuất bill
  printCashier?: boolean; // In tên thu ngân phụ trách
  vietQr?: VietQRConfig; // Cấu hình mã QR thanh toán động VietQR
}

export interface LabelTemplate {
  headerPrefix: string; // e.g. "Ly"
  showCupNumber: boolean;
  showOrderCode: boolean;
  showDateTime: boolean;
  footerNote: string; // "HongKong Cổ Trấn - Chúc ngon miệng"
}

export interface HomepageConfig {
  shopName: string;
  tagline: string;
  subTagline: string;
  address: string;
  hotline: string;
  openHours: string;
  wifiSsid: string;
  wifiPass: string;
  introText: string;
  tvChannels: TvChannel[];
  corners: GalleryCorner[];
}

export interface AppState {
  menu: MenuItem[];
  categories?: string[]; // Custom categories created by Admin
  categoryConfigs?: CategoryConfig[]; // Rich category configuration with printLabel flag
  orders: Order[];
  expenses: Expense[];
  deletedOrderIds?: string[]; // Tombstones to prevent deleted orders from resurrecting in multi-device sync
  deletedExpenseIds?: string[]; // Tombstones to prevent deleted expenses from resurrecting in multi-device sync
  users: User[];
  shifts: Shift[];
  currentShift: Shift | null;
  printerSettings: PrinterSettings;
  billTemplate: BillTemplate;
  labelTemplate: LabelTemplate;
  homepage: HomepageConfig;
  masterPassword: string; // default "0112143"
}
