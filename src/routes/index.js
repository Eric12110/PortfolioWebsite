const { Router } = require('express');
const ecpayRoutes = require('./ecpayRoutes');
const { healthCheck } = require('../controllers/healthController');

function createApiRouter() {
  const router = Router();
  router.get('/health', healthCheck);
  router.use('/ecpay', ecpayRoutes);
  return router;
}

module.exports = createApiRouter;
