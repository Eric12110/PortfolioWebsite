const crypto = require('crypto');

function generateCheckMacValue(params, hashKey, hashIV) {
  const sortedKeys = Object.keys(params)
    .filter((key) => params[key] !== undefined && params[key] !== null && key !== 'CheckMacValue')
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

  const query = sortedKeys
    .map((key) => `${key}=${params[key]}`)
    .join('&');

  const raw = `HashKey=${hashKey}&${query}&HashIV=${hashIV}`;
  const encoded = encodeURIComponent(raw)
    .toLowerCase()
    .replace(/%20/g, '+')
    .replace(/%21/g, '!')
    .replace(/%2a/g, '*')
    .replace(/%28/g, '(')
    .replace(/%29/g, ')')
    .replace(/%2d/g, '-')
    .replace(/%2e/g, '.')
    .replace(/%5f/g, '_');

  return crypto.createHash('sha256').update(encoded).digest('hex').toUpperCase();
}

module.exports = {
  generateCheckMacValue,
};
