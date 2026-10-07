export function formatInr(paise) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format((paise || 0) / 100);
}

export function formatInrDetail(paise) {
  const amount = (paise || 0) / 100;
  return `Rs. ${amount.toFixed(2)}`;
}
