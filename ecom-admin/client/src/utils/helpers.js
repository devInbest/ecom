export const formatCurrency = (amountInPaise = 0) => {
  const amount = Number(amountInPaise) / 100;
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);
  return `₹${formatted}`;
};

export const formatDate = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const roleLabel = (role) => {
  if (role === 'SUPERADMIN') return 'Super Admin';
  if (role === 'ADMIN') return 'Admin';
  if (role === 'STAFF') return 'Staff';
  return role || '';
};

export const ORDER_STATUS_LABELS = {
  PENDING_PAYMENT: 'Pending payment',
  PAID: 'Paid',
  PROCESSING: 'Processing',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
};

export const ORDER_STATUS_OPTIONS = Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export const ORDER_STATUS_COLORS = {
  PENDING_PAYMENT: 'badge-pending',
  PAID: 'badge-approved',
  PROCESSING: 'badge-pending',
  SHIPPED: 'badge-completed',
  DELIVERED: 'badge-completed',
  CANCELLED: 'badge-rejected',
  REFUNDED: 'badge-draft',
};

export const sumVariantStock = (variants = []) =>
  variants.reduce((total, variant) => total + (Number(variant.stock) || 0), 0);
