import { Order } from '../types';

/**
 * Extracts sequential number from an order code.
 * Ignores old random test codes like "T12345", "T45326", "TEST-BILL" so they don't inflate
 * the new incremental sequence.
 */
export function extractOrderSequenceNumber(code?: string): number {
  if (!code) return 0;
  // If it's the old 5-digit random format "T12345" where number >= 10000 and starts with T
  if (/^T\d{5}$/i.test(code)) return 0;
  // If test placeholder
  if (/^TEST/i.test(code)) return 0;

  // Extract all digit groups
  const digits = code.replace(/\D/g, '');
  if (!digits) return 0;

  const num = parseInt(digits, 10);
  if (isNaN(num) || num <= 0 || num >= 10000000) return 0;
  return num;
}

/**
 * Calculates the next sequential order number based on existing orders.
 * Returns 1 if no sequential orders exist or if all existing orders were deleted.
 */
export function getNextOrderSequence(orders: Order[] = []): number {
  let maxSeq = 0;
  if (Array.isArray(orders)) {
    for (const o of orders) {
      if (!o) continue;
      const num = extractOrderSequenceNumber(o.code);
      if (num > maxSeq) {
        maxSeq = num;
      }
    }
  }
  return maxSeq + 1;
}

/**
 * Formats a sequence number into standard 4-digit padded order code (e.g. 0001, 0002, ..., 0100, 10000).
 */
export function formatOrderSequence(seq: number): string {
  const safeSeq = Math.max(1, Math.floor(seq || 1));
  return safeSeq.toString().padStart(4, '0');
}

/**
 * Generates the next sequential order code for a given orders list.
 */
export function generateNextOrderCode(orders: Order[] = []): string {
  const nextSeq = getNextOrderSequence(orders);
  return formatOrderSequence(nextSeq);
}
