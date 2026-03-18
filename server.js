const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

loadLocalEnv();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const STATIC_DIR = path.join(__dirname, 'public_1');
if (fs.existsSync(STATIC_DIR)) {
  app.use(express.static(STATIC_DIR));
}

const REQUIRED_ENV = ['ECPAY_MERCHANT_ID', 'ECPAY_HASH_KEY', 'ECPAY_HASH_IV', 'ECPAY_RETURN_URL'];
const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missing.length) {
  console.warn(`⚠️  Missing ECPay environment variables: ${missing.join(', ')}`);
  console.warn('    The /api/ecpay/create-order endpoint will return an error until they are provided.');
}

const MODE = (process.env.ECPAY_OPERATION_MODE || 'Test').toLowerCase();
const ECPAY_API_URL = MODE === 'production'
  ? 'https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5'
  : 'https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5';

app.post('/api/ecpay/create-order', (req, res) => {
  const { amount, description, items, email, name } = req.body || {};

  const envMissing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (envMissing.length) {
    return res.status(500).json({
      error: 'Payment configuration is incomplete on the server.',
      missing: envMissing,
    });
  }

  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({ error: '金額格式不正確。' });
  }

  const tradeDescription = (description && String(description).trim()) || '攝影服務訂金';
  const tradeItems = Array.isArray(items) ? items : (items ? [items] : []);
  const itemString = (tradeItems.length ? tradeItems : [tradeDescription])
    .map((item) => String(item).trim())
    .filter(Boolean)
    .join('#');

  const merchantTradeNo = `VC${Date.now()}`;
  const merchantTradeDate = new Date().toISOString().replace('T', ' ').slice(0, 19);

  const baseParams = {
    MerchantID: process.env.ECPAY_MERCHANT_ID,
    MerchantTradeNo: merchantTradeNo,
    MerchantTradeDate: merchantTradeDate,
    PaymentType: 'aio',
    TotalAmount: Math.round(numericAmount).toString(),
    TradeDesc: encodeURIComponent(tradeDescription),
    ItemName: itemString,
    ReturnURL: process.env.ECPAY_RETURN_URL,
    OrderResultURL: process.env.ECPAY_ORDER_RESULT_URL || process.env.ECPAY_RETURN_URL,
    ClientBackURL: process.env.ECPAY_CLIENT_BACK_URL || process.env.ECPAY_ORDER_RESULT_URL || process.env.ECPAY_RETURN_URL,
    NeedExtraPaidInfo: 'Y',
    ChoosePayment: 'ALL',
    EncryptType: 1,
  };

  if (email) {
    baseParams.Email = String(email).trim();
  }
  if (name) {
    baseParams.CustomField1 = String(name).trim();
  }

  baseParams.CheckMacValue = generateCheckMacValue(baseParams, process.env.ECPAY_HASH_KEY, process.env.ECPAY_HASH_IV);

  return res.json({
    action: ECPAY_API_URL,
    method: 'POST',
    formData: baseParams,
  });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use((req, res, next) => {
  if (!STATIC_DIR) {
    return next();
  }
  const requestedPath = req.path.endsWith('/') ? `${req.path}index.html` : req.path;
  const filePath = path.join(STATIC_DIR, requestedPath);
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }
  return next();
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

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

function loadLocalEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) {
    return;
  }

  const content = fs.readFileSync(envPath, 'utf8');
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      return;
    }
    const idx = trimmed.indexOf('=');
    if (idx === -1) {
      return;
    }
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  });
}
