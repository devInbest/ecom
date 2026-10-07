export const ORDER_STEPS = [
  { key: 'PENDING_PAYMENT', label: 'Payment', detail: 'Waiting for payment to clear.', done: 'Payment captured.' },
  { key: 'PAID', label: 'Confirmed', detail: 'Your tee is in the packing queue.', done: 'Payment received. In the queue.' },
  { key: 'PROCESSING', label: 'Packed', detail: 'Being packed and labelled at the atelier.', done: 'Packed and labelled at the atelier.' },
  { key: 'SHIPPED', label: 'Shipped', detail: 'Waiting to leave with the courier.', done: 'Handed to the courier — on the way.' },
  { key: 'DELIVERED', label: 'Delivered', detail: 'Out for the last mile.', done: 'Left with you (or a neighbour).' },
];

const BADGE_COLOR = {
  PENDING_PAYMENT: 'gray',
  PAID: 'cyan',
  PROCESSING: 'yellow',
  SHIPPED: 'orange',
  DELIVERED: 'green',
  CANCELLED: 'red',
  REFUNDED: 'red',
};

export function statusIndex(status) {
  if (status === 'CANCELLED' || status === 'REFUNDED') return -1;
  const idx = ORDER_STEPS.findIndex((step) => step.key === status);
  return idx >= 0 ? idx : 0;
}

export function statusLabel(status) {
  if (!status) return 'Unknown';
  return String(status).replaceAll('_', ' ');
}

export function statusColor(status) {
  return BADGE_COLOR[status] || 'gray';
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatOrderDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d);
}

export function estimateDelivery(order) {
  if (!order?.createdAt) return null;
  if (order.status === 'DELIVERED') return 'Delivered';
  if (order.status === 'CANCELLED' || order.status === 'REFUNDED') return null;
  const start = new Date(order.createdAt);
  const min = new Date(start);
  const max = new Date(start);
  min.setDate(min.getDate() + 3);
  max.setDate(max.getDate() + 9);
  const fmt = (d) => `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return `${fmt(min)} – ${fmt(max)}`;
}

export function formatAddress(orderOrAddress) {
  if (!orderOrAddress) return '';
  if (orderOrAddress.line1) {
    return [
      orderOrAddress.fullName,
      orderOrAddress.line1,
      orderOrAddress.line2,
      [orderOrAddress.city, orderOrAddress.state, orderOrAddress.postalCode]
        .filter(Boolean)
        .join(', '),
      orderOrAddress.country === 'IN' ? 'India' : orderOrAddress.country,
    ]
      .filter(Boolean)
      .join('\n');
  }
  return [
    orderOrAddress.shippingFullName,
    orderOrAddress.shippingLine1,
    orderOrAddress.shippingLine2,
    [
      orderOrAddress.shippingCity,
      orderOrAddress.shippingState,
      orderOrAddress.shippingPostal,
    ]
      .filter(Boolean)
      .join(', '),
    orderOrAddress.shippingCountry === 'IN' ? 'India' : orderOrAddress.shippingCountry,
  ]
    .filter(Boolean)
    .join('\n');
}

export function initials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return 'F';
  return parts
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}
