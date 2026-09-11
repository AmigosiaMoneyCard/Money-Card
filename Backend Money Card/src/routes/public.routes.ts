import { Router } from 'express';
import {
  resolvePublicQrToken,
  getPublicSessionBalance,
  getPublicSessionTransactions,
  getPublicSessionReceipts,
} from '../controllers/public.controller.js';

const router = Router();

router.post('/cards/resolve', resolvePublicQrToken);
router.post('/resolve-qr', resolvePublicQrToken);
router.get('/sessions/:sessionToken', getPublicSessionBalance);
router.get('/sessions/:sessionToken/transactions', getPublicSessionTransactions);
router.get('/sessions/:sessionToken/receipts', getPublicSessionReceipts);

export default router;
