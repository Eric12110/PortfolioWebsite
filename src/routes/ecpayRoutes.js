const { Router } = require('express');
const { createOrder } = require('../controllers/ecpayController');

const router = Router();

router.post('/create-order', createOrder);

module.exports = router;
