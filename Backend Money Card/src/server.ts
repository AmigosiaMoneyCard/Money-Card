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
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Idempotency-Key',
      'Cache-Control',
      'Pragma',
    ],
  }),
);

app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Normalize duplicate slashes in request paths (enables fixed-length patched URLs)
app.use((req, _res, next) => {
  req.url = req.url.replace(/\/{2,}/g, '/');
  next();
});

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

// Prevent 304 stale caching on API responses
app.use((req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/v1')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

// Mount API routes with versatile prefixes for compatibility
app.use('/api/v1', apiRouter);
app.use('/api', apiRouter);
app.use('/v1', apiRouter);

// Fallback for nested /v1/v1
app.use('/api/v1/v1', apiRouter);

// ── Direct Mobile APK Download & Setup Portal ────────────────
app.get('/download-apk', (_req, res) => {
  const apkPath = path.resolve(__dirname, '../../apks/Money card-Locahost.apk');
  const fallbackPath = path.resolve(__dirname, '../../apks/app-release-stage.apk');
  const finalPath = fs.existsSync(apkPath) ? apkPath : fallbackPath;
  if (fs.existsSync(finalPath)) {
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Content-Disposition', 'attachment; filename="Money card-Locahost.apk"');
    return res.sendFile(finalPath);
  }
  return res.status(404).json({ success: false, message: 'Staging APK file not found on server' });
});

app.get(['/install', '/download', '/apk'], (_req, res) => {
  const lanIp = '192.168.105.132';
  const serverUrl = `http://${lanIp}:3000/api/v1`;
  const downloadUrl = `http://${lanIp}:3000/download-apk`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(downloadUrl)}`;
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Money card-Locahost — Install App</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
    .card { background: #1e293b; border-radius: 20px; padding: 32px 24px; max-width: 440px; width: 100%; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); border: 1px solid #334155; text-align: center; }
    .icon { font-size: 44px; margin-bottom: 8px; }
    h1 { font-size: 22px; font-weight: 700; color: #fff; margin-bottom: 4px; }
    .sub { font-size: 13px; color: #94a3b8; margin-bottom: 18px; }
    .badge { display: inline-block; background: #064e3b; color: #34d399; font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 999px; margin-bottom: 12px; }
    .qr-wrap { background: #ffffff; padding: 12px; border-radius: 16px; display: inline-block; margin-bottom: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.2); }
    .qr-wrap img { display: block; width: 180px; height: 180px; }
    .btn { display: block; width: 100%; background: #059669; color: white; text-align: center; padding: 14px; border-radius: 12px; font-weight: 600; font-size: 15px; text-decoration: none; box-shadow: 0 4px 6px -1px rgba(5,150,105,0.4); margin-bottom: 20px; }
    .instructions { text-align: left; background: #0f172a; border-radius: 12px; padding: 16px; border: 1px solid #334155; }
    .instructions h3 { font-size: 13px; font-weight: 600; color: #e2e8f0; margin-bottom: 10px; }
    .instructions ol { padding-left: 18px; font-size: 12.5px; color: #94a3b8; line-height: 1.6; }
    .code-box { background: #1e293b; padding: 8px 12px; border-radius: 8px; font-family: monospace; color: #10b981; font-size: 13px; margin: 8px 0; word-break: break-all; border: 1px solid #334155; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">💳</div>
    <span class="badge">Local Development Staging</span>
    <h1>Money card-Locahost</h1>
    <p class="sub">Scan or download directly to your Android device</p>
    
    <div class="qr-wrap">
      <img src="${qrUrl}" alt="Scan to Download APK" />
    </div>

    <a href="/download-apk" class="btn">⬇️ Download Money card-Locahost.apk (82 MB)</a>

    <div class="instructions">
      <h3>📱 2-Step Localhost Connection</h3>
      <ol>
        <li>Install the APK and open <b>Money card-Locahost</b>.</li>
        <li>Tap the <b>⚙️ Settings icon</b> (top right of Login screen).</li>
        <li>Ensure Server URL is set to:</li>
      </ol>
      <div class="code-box">${serverUrl}</div>
      <ol start="4">
        <li>Tap <b>Test Connection</b> &rarr; <b>Save & Apply</b>.</li>
        <li>Every local backend change you make will now appear live in the app on your phone!</li>
      </ol>
    </div>
  </div>
</body>
</html>`);
});

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
