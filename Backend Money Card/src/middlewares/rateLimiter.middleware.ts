import rateLimit from 'express-rate-limit';
import { sendError } from '../utils/response.js';

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.AUTH_RATE_LIMIT_MAX ? parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) : 500,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    return sendError(
      res,
      429,
      'TOO_MANY_REQUESTS',
      'Too many failed attempts. Please try again in 15 minutes.',
    );
  },
});

export const apiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: process.env.API_RATE_LIMIT_MAX ? parseInt(process.env.API_RATE_LIMIT_MAX, 10) : 50000,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    return sendError(res, 429, 'TOO_MANY_REQUESTS', 'Rate limit exceeded. Please slow down.');
  },
});

/**
 * Strict rate limiter for public QR verification and customer portal endpoints.
 * Capped at 60 requests per minute per IP to prevent automated brute-force scanning of card tokens.
 */
export const publicQrRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: process.env.PUBLIC_QR_RATE_LIMIT_MAX ? parseInt(process.env.PUBLIC_QR_RATE_LIMIT_MAX, 10) : 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    return sendError(
      res,
      429,
      'TOO_MANY_REQUESTS',
      'Too many QR verification attempts. Please wait 1 minute before trying again.',
    );
  },
});

