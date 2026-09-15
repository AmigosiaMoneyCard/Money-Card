import { useState, useEffect, useRef } from 'react';

export interface BalanceStreamEvent {
  balance: number;
  status: string;
  type?: 'RECHARGE' | 'PURCHASE' | 'REFUND' | 'INIT';
  amount?: number;
  timestamp?: string;
  cardDisplayNumber?: string;
  sessionId?: string;
}

interface UseCardBalanceStreamOptions {
  enabled?: boolean;
  onBalanceUpdate?: (event: BalanceStreamEvent) => void;
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

/**
 * Custom React hook for real-time Server-Sent Events (SSE) balance updates on the customer portal.
 * Connects to /v1/public/sessions/:sessionToken/balance-stream and updates state reactively.
 */
export function useCardBalanceStream(
  sessionToken: string | null,
  options: UseCardBalanceStreamOptions = {},
) {
  const { enabled = true, onBalanceUpdate } = options;
  const [isConnected, setIsConnected] = useState(false);
  const [latestEvent, setLatestEvent] = useState<BalanceStreamEvent | null>(null);
  const [lastUpdateAnimation, setLastUpdateAnimation] = useState<'recharge' | 'purchase' | 'refund' | null>(null);
  const onBalanceUpdateRef = useRef(onBalanceUpdate);
  onBalanceUpdateRef.current = onBalanceUpdate;

  useEffect(() => {
    if (!sessionToken || !enabled || typeof window === 'undefined') {
      setIsConnected(false);
      return;
    }

    // Determine normalized stream URL
    const baseUrl = API_BASE_URL.replace(/\/+$/, '');
    const streamUrl = `${baseUrl}/v1/public/sessions/${encodeURIComponent(sessionToken)}/balance-stream`;

    let eventSource: EventSource | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let isSubscribed = true;

    function connect() {
      if (!isSubscribed) return;

      try {
        eventSource = new EventSource(streamUrl, { withCredentials: true });

        eventSource.onopen = () => {
          if (isSubscribed) {
            setIsConnected(true);
          }
        };

        // Listen for balance update events
        eventSource.addEventListener('balance', (e: MessageEvent) => {
          if (!isSubscribed) return;
          try {
            const data: BalanceStreamEvent = JSON.parse(e.data);
            setLatestEvent(data);

            if (data.type === 'RECHARGE') {
              setLastUpdateAnimation('recharge');
            } else if (data.type === 'PURCHASE') {
              setLastUpdateAnimation('purchase');
            } else if (data.type === 'REFUND') {
              setLastUpdateAnimation('refund');
            }

            // Clear highlight animation after 2.5 seconds
            setTimeout(() => {
              if (isSubscribed) setLastUpdateAnimation(null);
            }, 2500);

            if (onBalanceUpdateRef.current) {
              onBalanceUpdateRef.current(data);
            }
          } catch {
            // ignore JSON parse error
          }
        });

        // Listen for connection acknowledgment
        eventSource.addEventListener('connected', () => {
          if (isSubscribed) {
            setIsConnected(true);
          }
        });

        eventSource.onerror = () => {
          if (isSubscribed) {
            setIsConnected(false);
          }
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }

          // Retry connection after 5 seconds if still mounted
          if (isSubscribed && !reconnectTimeout) {
            reconnectTimeout = setTimeout(() => {
              reconnectTimeout = null;
              connect();
            }, 5000);
          }
        };
      } catch {
        setIsConnected(false);
      }
    }

    connect();

    return () => {
      isSubscribed = false;
      setIsConnected(false);
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
    };
  }, [sessionToken, enabled]);

  return {
    isConnected,
    latestEvent,
    lastUpdateAnimation,
  };
}
