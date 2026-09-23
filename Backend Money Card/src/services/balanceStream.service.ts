import { Response } from 'express';
import EventEmitter from 'node:events';

export interface BalanceUpdatePayload {
  balance: number;
  status: string;
  type?: 'RECHARGE' | 'PURCHASE' | 'REFUND' | 'INIT' | 'RECHARGE_CANCELLED' | 'PURCHASE_CANCELLED';
  amount?: number;
  timestamp?: string;
  cardDisplayNumber?: string;
  sessionId?: string;
}

interface SseClient {
  id: string;
  sessionToken: string;
  res: Response;
  heartbeatTimer: NodeJS.Timeout;
}

class BalanceStreamService extends EventEmitter {
  // Map of sessionToken -> Set of active SSE client connections
  private clientsByToken: Map<string, Set<SseClient>> = new Map();
  // Map of sessionId -> sessionToken for quick lookup when controllers emit by sessionId
  private tokenBySessionId: Map<string, string> = new Map();

  constructor() {
    super();
    this.setMaxListeners(100);
  }

  /**
   * Registers a new SSE client for a given sessionToken
   */
  public addClient(
    sessionToken: string,
    res: Response,
    initialData?: Partial<BalanceUpdatePayload> & { sessionId?: string },
  ): void {
    const clientId = `sse_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    if (initialData?.sessionId) {
      this.tokenBySessionId.set(initialData.sessionId, sessionToken);
    }

    // Set mandatory SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable proxy buffering (Nginx, Caddy, Cloudflare)
    
    // Send immediate 200 OK headers if not already sent
    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }

    // Send initial connection establishment packet
    res.write('event: connected\ndata: {"status":"CONNECTED","clientId":"' + clientId + '"}\n\n');

    // Send initial balance payload if available
    if (initialData) {
      const initPayload: BalanceUpdatePayload = {
        balance: initialData.balance ?? 0,
        status: initialData.status ?? 'ACTIVE',
        type: 'INIT',
        cardDisplayNumber: initialData.cardDisplayNumber,
        sessionId: initialData.sessionId,
        timestamp: new Date().toISOString(),
      };
      res.write(`event: balance\ndata: ${JSON.stringify(initPayload)}\n\n`);
    }

    // 25-second keep-alive comment heartbeat to keep intermediate proxies/routers alive
    const heartbeatTimer = setInterval(() => {
      try {
        res.write(': ping\n\n');
      } catch {
        this.removeClient(sessionToken, clientId);
      }
    }, 25000);

    const client: SseClient = {
      id: clientId,
      sessionToken,
      res,
      heartbeatTimer,
    };

    if (!this.clientsByToken.has(sessionToken)) {
      this.clientsByToken.set(sessionToken, new Set());
    }
    this.clientsByToken.get(sessionToken)!.add(client);

    // Clean up on client disconnect or connection close
    const cleanup = () => {
      this.removeClient(sessionToken, clientId);
    };

    res.on('close', cleanup);
    res.on('finish', cleanup);
    res.on('error', cleanup);
  }

  /**
   * Removes an SSE client and clears its keep-alive timer
   */
  public removeClient(sessionToken: string, clientId: string): void {
    const clients = this.clientsByToken.get(sessionToken);
    if (!clients) return;

    for (const client of clients) {
      if (client.id === clientId) {
        clearInterval(client.heartbeatTimer);
        clients.delete(client);
        break;
      }
    }

    if (clients.size === 0) {
      this.clientsByToken.delete(sessionToken);
    }
  }

  /**
   * Associate a sessionId with a sessionToken
   */
  public mapSessionIdToToken(sessionId: string, sessionToken: string): void {
    this.tokenBySessionId.set(sessionId, sessionToken);
  }

  /**
   * Broadcasts a real-time balance update to all subscribed SSE clients for a session
   */
  public broadcastBalanceUpdate(
    sessionIdOrToken: string,
    payload: BalanceUpdatePayload,
  ): void {
    // Check if target is a sessionToken or sessionId
    let targetToken = sessionIdOrToken;
    if (this.tokenBySessionId.has(sessionIdOrToken)) {
      targetToken = this.tokenBySessionId.get(sessionIdOrToken)!;
    }

    const payloadWithTime: BalanceUpdatePayload = {
      ...payload,
      timestamp: payload.timestamp || new Date().toISOString(),
    };

    const clients = this.clientsByToken.get(targetToken);
    if (clients && clients.size > 0) {
      const sseMessage = `event: balance\ndata: ${JSON.stringify(payloadWithTime)}\n\n`;
      for (const client of clients) {
        try {
          client.res.write(sseMessage);
        } catch {
          this.removeClient(targetToken, client.id);
        }
      }
    }

    // Also emit internal event for other listeners/logging
    this.emit('balanceUpdated', { targetToken, payload: payloadWithTime });
  }

  /**
   * Returns total number of active SSE connections
   */
  public getActiveConnectionCount(): number {
    let count = 0;
    for (const clients of this.clientsByToken.values()) {
      count += clients.size;
    }
    return count;
  }
}

export const balanceStreamService = new BalanceStreamService();
