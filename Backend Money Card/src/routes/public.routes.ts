import { Router } from 'express';
import {
  resolvePublicQrToken,
  getPublicSessionBalance,
  getPublicSessionTransactions,
  getPublicSessionReceipts,
  streamPublicSessionBalance,
} from '../controllers/public.controller.js';
import { publicQrRateLimiter } from '../middlewares/rateLimiter.middleware.js';

const router = Router();

// Apply strict 60 requests/minute IP rate limiter to protect public QR verification endpoints from brute-force scanning
router.use(publicQrRateLimiter);

// QR Token Resolution Endpoints
router.post('/cards/resolve', resolvePublicQrToken);
router.post('/resolve-qr', resolvePublicQrToken);
router.get('/c/:token', (req, res) => {
  req.body = { qrToken: req.params.token };
  return resolvePublicQrToken(req, res);
});

// Public Customer Session Endpoints
router.get('/sessions/:sessionToken', getPublicSessionBalance);
router.get('/sessions/:sessionToken/transactions', getPublicSessionTransactions);
router.get('/sessions/:sessionToken/receipts', getPublicSessionReceipts);

// Real-Time Server-Sent Events (SSE) Balance Stream
router.get('/sessions/:sessionToken/balance-stream', streamPublicSessionBalance);

export default router;

