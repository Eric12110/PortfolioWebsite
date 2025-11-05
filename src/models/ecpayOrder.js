const { getMerchantConfig } = require('../config/ecpay');
const { generateCheckMacValue } = require('../utils/checkMacValue');

function createEcpayOrder(payload) {
  const { amount, description, items, email, name } = payload;
  const merchantConfig = getMerchantConfig();
  const tradeDescription = description || '攝影服務訂金';
  const tradeItems = items.length ? items : [tradeDescription];

  const merchantTradeNo = `VC${Date.now()}`;
  const merchantTradeDate = new Date().toISOString().replace('T', ' ').slice(0, 19);

  const baseParams = {
    MerchantID: merchantConfig.merchantId,
    MerchantTradeNo: merchantTradeNo,
    MerchantTradeDate: merchantTradeDate,
    PaymentType: 'aio',
    TotalAmount: amount.toString(),
    TradeDesc: encodeURIComponent(tradeDescription),
    ItemName: tradeItems.join('#'),
    ReturnURL: merchantConfig.returnURL,
    OrderResultURL: merchantConfig.orderResultURL,
    ClientBackURL: merchantConfig.clientBackURL,
    NeedExtraPaidInfo: 'Y',
    ChoosePayment: 'ALL',
    EncryptType: 1,
  };

  if (email) {
    baseParams.Email = email;
  }

  if (name) {
    baseParams.CustomField1 = name;
  }

  baseParams.CheckMacValue = generateCheckMacValue(
    baseParams,
    merchantConfig.hashKey,
    merchantConfig.hashIV,
  );

  return baseParams;
}

module.exports = {
  createEcpayOrder,
};
