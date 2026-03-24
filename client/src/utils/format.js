import { format, formatDistanceToNow, differenceInDays } from 'date-fns';

export function formatDate(date) {
  if (!date) return '—';
  try { return format(new Date(date), 'dd/MM/yyyy'); } catch { return '—'; }
}

export function formatDateTime(date) {
  if (!date) return '—';
  try { return format(new Date(date), 'dd/MM/yyyy HH:mm'); } catch { return '—'; }
}

export function formatRelative(date) {
  if (!date) return '—';
  try { return formatDistanceToNow(new Date(date), { addSuffix: true }); } catch { return '—'; }
}

export function formatCurrency(cents, currency = 'AUD') {
  if (cents === null || cents === undefined) return '—';
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency }).format(cents / 100);
}

export function formatCurrencyDollars(dollars) {
  if (dollars === null || dollars === undefined) return '—';
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(dollars);
}

export function formatKm(km) {
  if (km === null || km === undefined) return '—';
  return `${km.toLocaleString('en-AU')} km`;
}

export function daysUntil(date) {
  if (!date) return null;
  return differenceInDays(new Date(date), new Date());
}

export function contractStatusColor(expiryDate, contractStatus) {
  if (!expiryDate) return 'gray';
  const days = daysUntil(expiryDate);
  if (days === null) return 'gray';
  if (days < 0 || contractStatus === 'Expired') return 'red';
  if (days <= 30) return 'red';
  if (days <= 90) return 'orange';
  return 'green';
}

export function getContractBadge(expiryDate, contractStatus) {
  if (!expiryDate) return { label: contractStatus || '—', color: 'gray' };
  const days = daysUntil(expiryDate);
  if (days === null) return { label: contractStatus || '—', color: 'gray' };
  if (days < 0) return { label: 'Expired', color: 'red' };
  if (days <= 30) return { label: `Expiring in ${days}d`, color: 'red' };
  if (days <= 90) return { label: `Expiring in ${days}d`, color: 'orange' };
  return { label: 'Active', color: 'green' };
}
