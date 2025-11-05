const { getApiUrl, getMissingConfigKeys } = require('../config/ecpay');
const { createEcpayOrder } = require('../models/ecpayOrder');
const { validateOrderPayload } = require('../validators/ecpayValidator');

function createOrder(req, res) {
  const missing = getMissingConfigKeys();
  if (missing.length) {
    return res.status(500).json({
      error: 'Payment configuration is incomplete on the server.',
      missing,
    });
  }

  const { value, error } = validateOrderPayload(req.body);
  if (error) {
    return res.status(400).json({ error });
  }

  const order = createEcpayOrder(value);

  return res.json({
    action: getApiUrl(),
    method: 'POST',
    formData: order,
  });
}

module.exports = {
  createOrder,
};
