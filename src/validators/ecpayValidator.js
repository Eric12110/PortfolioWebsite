function normalizeItems(rawItems) {
  if (Array.isArray(rawItems)) {
    return rawItems;
  }

  if (typeof rawItems === 'string' && rawItems.length) {
    return rawItems.split(/[#,]/).map((item) => item.trim()).filter(Boolean);
  }

  return [];
}

function validateOrderPayload(payload = {}) {
  const numericAmount = Number(payload.amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return { error: '金額格式不正確。' };
  }

  const sanitized = {
    amount: Math.round(numericAmount),
    description: payload.description ? String(payload.description).trim() : '',
    items: normalizeItems(payload.items).map((item) => String(item).trim()).filter(Boolean),
    email: payload.email ? String(payload.email).trim() : '',
    name: payload.name ? String(payload.name).trim() : '',
  };

  return { value: sanitized };
}

module.exports = {
  validateOrderPayload,
};
