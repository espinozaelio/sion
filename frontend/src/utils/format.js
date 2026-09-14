export function formatCurrency(value, currency = 'VES') {
  const num = Number(value || 0);
  const symbol = currency === 'USD' ? '$' : 'Bs.';
  return `${symbol} ${num.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('es-VE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function taxTypeLabel(type) {
  const map = {
    general: 'IVA General (16%)',
    reducida: 'IVA Reducido (8%)',
    suntuario: 'IVA Suntuario (31%)',
    exento: 'Exento',
  };
  return map[type] || type;
}
