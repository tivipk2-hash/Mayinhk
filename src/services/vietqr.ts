import QRCode from 'qrcode';
import { VietQRConfig } from '../types';

export interface BankInfo {
  code: string; // e.g. "MB", "VCB"
  name: string; // e.g. "MBBank (Quân Đội)"
  bin: string;  // e.g. "970422"
  shortName: string;
}

export const VIETNAMESE_BANKS: BankInfo[] = [
  { code: 'MB', shortName: 'MBBank', name: 'MBBank - Ngân hàng Quân Đội', bin: '970422' },
  { code: 'VCB', shortName: 'Vietcombank', name: 'Vietcombank - Ngoại Thương Việt Nam', bin: '970436' },
  { code: 'TCB', shortName: 'Techcombank', name: 'Techcombank - Kỹ Thương Việt Nam', bin: '970407' },
  { code: 'BIDV', shortName: 'BIDV', name: 'BIDV - Đầu tư và Phát triển VN', bin: '970418' },
  { code: 'CTG', shortName: 'VietinBank', name: 'VietinBank - Công Thương Việt Nam', bin: '970415' },
  { code: 'ACB', shortName: 'ACB', name: 'ACB - Á Châu', bin: '970416' },
  { code: 'VPB', shortName: 'VPBank', name: 'VPBank - Việt Nam Thịnh Vượng', bin: '970432' },
  { code: 'TPB', shortName: 'TPBank', name: 'TPBank - Tiên Phong', bin: '970423' },
  { code: 'STB', shortName: 'Sacombank', name: 'Sacombank - Sài Gòn Thương Tín', bin: '970403' },
  { code: 'VBA', shortName: 'Agribank', name: 'Agribank - Nông nghiệp và PTNT', bin: '970405' },
  { code: 'HDB', shortName: 'HDBank', name: 'HDBank - Phát triển TP.HCM', bin: '970437' },
  { code: 'VIB', shortName: 'VIB', name: 'VIB - Quốc Tế Việt Nam', bin: '970441' },
  { code: 'SHB', shortName: 'SHB', name: 'SHB - Sài Gòn - Hà Nội', bin: '970443' },
  { code: 'MSB', shortName: 'MSB', name: 'MSB - Hàng Hải', bin: '970426' },
  { code: 'OCB', shortName: 'OCB', name: 'OCB - Phương Đông', bin: '970448' },
  { code: 'SEAB', shortName: 'SeABank', name: 'SeABank - Đông Nam Á', bin: '970440' },
  { code: 'LPB', shortName: 'LPBank', name: 'LPBank - Lộc Phát Việt Nam', bin: '970449' },
  { code: 'TIMO', shortName: 'Timo', name: 'Timo by BVBank', bin: '963388' },
  { code: 'CAKE', shortName: 'Cake', name: 'Cake by VPBank', bin: '546034' },
];

/**
 * Standard CRC-16/CCITT-FALSE calculation according to ISO/IEC 13239 and EMVCo
 */
function crc16Ccitt(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return (crc & 0xffff).toString(16).toUpperCase().padStart(4, '0');
}

function emvField(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

/**
 * Generates official EMVCo / NAPAS VietQR string for banking apps
 */
export function generateVietQREmvPayload(
  bankCodeOrBin: string,
  accountNo: string,
  amount: number,
  transferMemo: string
): string {
  // Find bank BIN
  const matched = VIETNAMESE_BANKS.find(
    (b) => b.code.toUpperCase() === bankCodeOrBin.toUpperCase() || b.bin === bankCodeOrBin
  );
  const bin = matched ? matched.bin : bankCodeOrBin || '970422';

  // Format Tag 38 (Consumer Account Info)
  const guid = emvField('00', 'A000000727'); // VietQR AID
  const subBank = emvField('00', bin) + emvField('01', accountNo.trim());
  const org = emvField('01', subBank);
  const service = emvField('02', 'QRIBFTTA'); // Fast 24/7 bank transfer to account
  const tag38 = emvField('38', guid + org + service);

  // Currency: VND (704)
  const tag53 = emvField('53', '704');

  // Amount (strictly formatted integer string)
  const tag54 = amount > 0 ? emvField('54', Math.round(amount).toString()) : '';

  // Country Code: VN
  const tag58 = emvField('58', 'VN');

  // Additional data (Tag 62 -> Subtag 08: Purpose of transaction)
  // Strip non-alphanumeric characters for standard banking compatibility
  const cleanMemo = transferMemo.replace(/[^a-zA-Z0-9 ]/g, '').trim().slice(0, 25);
  const tag62 = cleanMemo ? emvField('62', emvField('08', cleanMemo)) : '';

  // Initiation method: '12' for dynamic QR with preset amount, '11' for static
  const pointOfInitiation = amount > 0 ? '12' : '11';
  const tag00 = emvField('00', '01');
  const tag01 = emvField('01', pointOfInitiation);

  const rawData = `${tag00}${tag01}${tag38}${tag53}${tag54}${tag58}${tag62}6304`;
  const crc = crc16Ccitt(rawData);
  return `${rawData}${crc}`;
}

/**
 * Synchronously renders a VietQR code directly onto a Canvas 2D context.
 * 100% offline, zero network requests, perfectly 1-bit monochrome thermal printer ready!
 */
export function drawVietQRToContext(
  ctx: CanvasRenderingContext2D,
  config: VietQRConfig,
  amount: number,
  orderCode: string,
  centerX: number,
  topY: number,
  desiredSize: number = 190
): { renderedHeight: number } {
  const memoTemplate = config.transferSyntax || 'DH {code}';
  const memo = memoTemplate.replace(/\{code\}/gi, orderCode).replace(/\{orderCode\}/gi, orderCode);

  const payload = generateVietQREmvPayload(
    config.bankId,
    config.accountNo,
    amount,
    memo
  );

  try {
    const qr = QRCode.create(payload, {
      errorCorrectionLevel: 'M',
    });

    const numModules = qr.modules.size;
    const cellSize = Math.max(2, Math.floor(desiredSize / numModules));
    const actualQrSize = cellSize * numModules;
    const startX = Math.round(centerX - actualQrSize / 2);

    // Pure white quiet zone
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(startX - 6, topY - 6, actualQrSize + 12, actualQrSize + 12);

    // Black data cells
    ctx.fillStyle = '#000000';
    for (let r = 0; r < numModules; r++) {
      for (let c = 0; c < numModules; c++) {
        if (qr.modules.get(r, c)) {
          ctx.fillRect(startX + c * cellSize, topY + r * cellSize, cellSize, cellSize);
        }
      }
    }

    return { renderedHeight: actualQrSize };
  } catch (err) {
    console.error('Failed to draw VietQR on canvas:', err);
    return { renderedHeight: 0 };
  }
}

/**
 * Returns the fallback web URL to the VietQR image service (img.vietqr.io)
 */
export function getVietQRImageUrl(
  config: VietQRConfig,
  amount: number,
  orderCode: string
): string {
  const memoTemplate = config.transferSyntax || 'DH {code}';
  const memo = memoTemplate.replace(/\{code\}/gi, orderCode).replace(/\{orderCode\}/gi, orderCode);
  const template = config.template || 'compact2';

  return `https://img.vietqr.io/image/${config.bankId}-${config.accountNo}-${template}.png?amount=${Math.round(amount)}&addInfo=${encodeURIComponent(memo)}&accountName=${encodeURIComponent(config.accountName)}`;
}
