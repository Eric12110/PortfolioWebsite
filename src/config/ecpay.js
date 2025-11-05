const REQUIRED_ENV = ['ECPAY_MERCHANT_ID', 'ECPAY_HASH_KEY', 'ECPAY_HASH_IV', 'ECPAY_RETURN_URL'];

function getMissingConfigKeys() {
  return REQUIRED_ENV.filter((key) => !process.env[key]);
}

function getOperationMode() {
  return (process.env.ECPAY_OPERATION_MODE || 'Test').toLowerCase();
}

function getApiUrl() {
  return getOperationMode() === 'production'
    ? 'https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5'
    : 'https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5';
}

function getMerchantConfig() {
  return {
    merchantId: process.env.ECPAY_MERCHANT_ID,
    hashKey: process.env.ECPAY_HASH_KEY,
    hashIV: process.env.ECPAY_HASH_IV,
    returnURL: process.env.ECPAY_RETURN_URL,
    orderResultURL: process.env.ECPAY_ORDER_RESULT_URL || process.env.ECPAY_RETURN_URL,
    clientBackURL:
      process.env.ECPAY_CLIENT_BACK_URL ||
      process.env.ECPAY_ORDER_RESULT_URL ||
      process.env.ECPAY_RETURN_URL,
  };
}

module.exports = {
  getApiUrl,
  getMerchantConfig,
  getMissingConfigKeys,
  REQUIRED_ENV,
};
