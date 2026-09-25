# Localhost Environment Staging Parity Implementation Plan

![Local Staging Parity Status](C:/Users/damie/.gemini/antigravity-ide/brain/999581c9-5c30-4195-933d-3667425ed95a/local_staging_parity_status_1790309851711.jpg)

## Architecture and Flow Wireframe

```
+-----------------------------------------------------------------------------+
|                     LOCAL ENVIRONMENT ARCHITECTURE                          |
+-----------------------------------------------------------------------------+
|                                                                             |
|  [Frontend Web Admin]            [Flutter Mobile POS]                       |
|  http://localhost:5173           http://localhost:5000 (Chrome / Device)    |
|         |                                  |                                |
|         | /api requests                    | /api/v1 requests               |
|         v                                  v                                |
|  [Vite Dev Server Proxy]                   |                                |
|  proxy: /api -> port 3000                  |                                |
|         |                                  |                                |
|         +-----------------> [Backend API] <-+                               |
|                             http://localhost:3000/api                       |
|                                    |                                        |
|                                    | Prisma Client                          |
|                                    v                                        |
|                             [PostgreSQL Database]                           |
|                             localhost:5432/money_card                       |
|                             (Synced with Staging Schema)                    |
|                                                                             |
+-----------------------------------------------------------------------------+
```

## Current Parity Audit

- Git Branch: Currently checked out to staging, exactly matching origin/staging (commit 4f506def891e1c962eebdb90c349f0e29229380f).
- Frontend Test Suite: 272 tests passing, TypeScript 0 errors.
- Backend Test Suite: 100 tests passing, TypeScript 0 errors.
- Mobile Test Suite: 168 tests passing, flutter analyze 0 issues.
- Database Schema: Synchronized to Prisma schema with npx prisma db push on local PostgreSQL (port 5432).
- Frontend Development Proxy: Frontend Money Card/vite.config.ts currently lacks an explicit /api proxy to forward requests to localhost:3000 during npm run dev. Adding this proxy enables local changes to be verified instantly without changing environment variables or deploying.

## Worktree Changes

- Target File: [vite.config.ts](file:///D:/Money%20Card%20Project/Frontend%20Money%20Card/vite.config.ts)
- Action: Add proxy configuration to server block:
  ```ts
  server: {
    port: 5173,
    open: false,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  ```

## Verification Steps

- Start full stack via start_all.ps1 or run Frontend and Backend independently.
- Verify that requests from http://localhost:5173/api reach http://localhost:3000/api.
- Execute full test suites across Frontend, Backend, and Mobile to ensure zero regressions.
