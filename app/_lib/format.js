export function formatWhen(value) {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatQty(value, uom = '') {
  const number = Number(value);
  const formatted = Number.isFinite(number) ? number.toLocaleString() : String(value);
  return uom ? `${formatted} ${uom}` : formatted;
}

export function classForStock(onHand, minAlert) {
  const qty = Number(onHand);
  if (qty <= 0) return { label: 'Out', badge: 'badge badge-out' };
  if (qty <= Number(minAlert)) return { label: 'Low', badge: 'badge badge-low' };
  return { label: 'In stock', badge: 'badge badge-done' };
}
