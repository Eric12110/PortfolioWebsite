const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const createApiRouter = require('./routes');
const { getMissingConfigKeys } = require('./config/ecpay');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const staticDir = path.join(__dirname, '..', 'public_1');
if (fs.existsSync(staticDir)) {
  app.use(express.static(staticDir));
}

const missing = getMissingConfigKeys();
if (missing.length) {
  console.warn(`⚠️  Missing ECPay environment variables: ${missing.join(', ')}`);
  console.warn('    The /api/ecpay/create-order endpoint will return an error until they are provided.');
}

app.use('/api', createApiRouter());

app.use((req, res, next) => {
  if (!staticDir) {
    return next();
  }

  const requestedPath = req.path.endsWith('/') ? `${req.path}index.html` : req.path;
  const filePath = path.join(staticDir, requestedPath);
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }

  return next();
});

module.exports = app;
