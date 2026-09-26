/**
 * app/_lib/forms.js
 * ------------------------------------------------------------------
 * FormData -> typed input helpers for Server Actions.
 * Numbers are converted here so Zod reports precise validation errors
 * (e.g. NaN becomes "Expected a whole number").
 */
import { headers } from 'next/headers';

export function textField(formData, key) {
  const value = formData.get(key);
  if (value == null) return undefined;
  const str = String(value);
  return str === '' ? undefined : str;
}

/** Untouched value (passwords keep their exact characters). */
export function rawField(formData, key) {
  const value = formData.get(key);
  return value == null ? undefined : String(value);
}

export function numberField(formData, key) {
  const value = formData.get(key);
  if (value == null || String(value).trim() === '') return undefined;
  const num = Number(String(value));
  return Number.isFinite(num) ? num : NaN;
}

function toNumber(value) {
  if (value == null || String(value).trim() === '') return undefined;
  const num = Number(String(value));
  return Number.isFinite(num) ? num : NaN;
}

/**
 * Reads repeated form fields (dynamic line editors) into an array:
 *   linesFrom(formData, 'quantity')   -> [{ productId, quantity }]
 *   linesFrom(formData, 'countedQty') -> [{ productId, countedQty }]
 * Blank rows (added but never filled) are skipped.
 */
export function linesFrom(formData, quantityKey = 'quantity') {
  const productIds = formData.getAll('productId');
  const quantities = formData.getAll(quantityKey);
  const total = Math.max(productIds.length, quantities.length);
  const lines = [];

  for (let i = 0; i < total; i += 1) {
    const rawProduct = productIds[i];
    const rawQuantity = quantities[i];
    const blankProduct = rawProduct == null || String(rawProduct).trim() === '';
    const blankQuantity = rawQuantity == null || String(rawQuantity).trim() === '';
    if (blankProduct && blankQuantity) continue;

    lines.push({
      productId: toNumber(rawProduct),
      [quantityKey]: toNumber(rawQuantity),
    });
  }
  return lines;
}

/** Best-effort client IP for the in-memory rate limiters. */
export async function clientIp() {
  const h = await headers();
  const forwarded = h.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return h.get('x-real-ip') || 'local';
}
