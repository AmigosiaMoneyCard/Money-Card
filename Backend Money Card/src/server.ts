import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import dns from 'node:dns';
import { env } from './config/env.js';
import apiRouter from './routes/index.js';
import { notFoundHandler, globalErrorHandler } from './middlewares/error.middleware.js';

// Force IPv4 first in cloud container environments (Render/Docker)
dns.setDefaultResultOrder('ipv4first');

const app = express();
app.set('trust proxy', 1);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  cors({
    origin: true, // Allow dev origins including localhost:5173
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Idempotency-Key'],
  }),
);

app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Mount root healthcheck endpoint for direct network discovery probes
app.get('/health', async (_req, res) => {
  try {
    return res.status(200).json({
      success: true,
      data: {
        status: 'HEALTHY',
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime()),
      },
    });
  } catch {
    return res.status(503).json({
      success: false,
      status: 'DEGRADED',
      timestamp: new Date().toISOString(),
    });
  }
});

// Mount API routes with versatile prefixes for compatibility
app.use('/api/v1', apiRouter);
app.use('/api', apiRouter);
app.use('/v1', apiRouter);

// Fallback for nested /v1/v1
app.use('/api/v1/v1', apiRouter);

// Serve Frontend static assets if available (enables ngrok full web UI sharing)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDistPath = path.resolve(__dirname, '../../Frontend Money Card/dist');

if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/v1') || req.path.startsWith('/health')) {
      return next();
    }
    return res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

app.use(notFoundHandler);
app.use(globalErrorHandler);

const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(env.PORT) || 3000;

const server = app.listen(PORT, HOST, () => {
  console.log(`🚀 Money Card Backend Server running on http://${HOST}:${PORT}`);
  console.log(`💻 Local Loopback: http://localhost:${PORT}/api/v1`);
  console.log(`📱 Network LAN: http://0.0.0.0:${PORT}/api/v1 (Accessible from physical Android phone on Wi-Fi)`);
  console.log(`🏥 Healthcheck: http://localhost:${PORT}/api/v1/health`);
});

const handleShutdown = async () => {
  server.close(() => {
    process.exit(0);
  });
};

process.on('SIGTERM', handleShutdown);
process.on('SIGINT', handleShutdown);
