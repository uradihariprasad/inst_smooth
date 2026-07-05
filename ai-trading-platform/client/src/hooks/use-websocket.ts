/**
 * WebSocket Hook
 * Manages real-time connection to the backend
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useAppStore } from '../store/app-store';
import type {
  ScanProgress,
  MarketScanResult,
} from '../../../shared/types/analysis';

interface WebSocketMessage {
  type: string;
  data: unknown;
  timestamp: number;
}

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const {
    setScanning,
    setScanProgress,
    setLastResults,
    isAuthenticated,
  } = useAppStore();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);

      // Request current status
      ws.send(JSON.stringify({
        type: 'get_status',
        timestamp: Date.now(),
      }));
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        handleMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      wsRef.current = null;

      // Auto-reconnect after 3 seconds
      if (isAuthenticated) {
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }, [isAuthenticated, setScanning, setScanProgress, setLastResults]);

  const handleMessage = useCallback(
    (message: WebSocketMessage) => {
      switch (message.type) {
        case 'connected':
          // Initial state from server
          break;

        case 'scan_started':
          setScanning(true);
          break;

        case 'scan_stopped':
          setScanning(false);
          break;

        case 'scan_progress':
          setScanProgress(message.data as ScanProgress);
          break;

        case 'scan_complete':
          setLastResults(message.data as MarketScanResult);
          setScanning(false);
          break;

        case 'heartbeat':
          // Respond to heartbeat
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
              type: 'heartbeat_ack',
              timestamp: Date.now(),
            }));
          }
          break;

        case 'error':
          console.error('Server error:', (message.data as { message: string }).message);
          break;

        default:
          break;
      }
    },
    [setScanning, setScanProgress, setLastResults]
  );

  const sendMessage = useCallback((type: string, data?: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type,
        data,
        timestamp: Date.now(),
      }));
    }
  }, []);

  const startScan = useCallback(() => {
    sendMessage('start_scan');
  }, [sendMessage]);

  const stopScan = useCallback(() => {
    sendMessage('stop_scan');
  }, [sendMessage]);

  useEffect(() => {
    if (isAuthenticated) {
      connect();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [isAuthenticated, connect]);

  return {
    isConnected,
    sendMessage,
    startScan,
    stopScan,
  };
}