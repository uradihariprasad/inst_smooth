/**
 * AI Institutional Intraday Intelligence Platform - Server Entry Point
 * Production-grade Express server with WebSocket support
 */

import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { MarketScanner } from './services/scanner';
import type { MarketScanResult, ScanProgress } from '../shared/types/analysis';
import type { DecisionWeights } from './services/decision-engine';
import type { RankingCriteria } from './services/ranking-engine';

const PORT = parseInt(process.env.PORT ?? '8000', 10);
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// Initialize scanner
const scanner = new MarketScanner();

// Connected WebSocket clients
const clients = new Set<WebSocket>();

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
}));
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(compression());
app.use(morgan('combined'));
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: Date.now(),
    uptime: process.uptime(),
    authenticated: scanner.isAuthenticated(),
  });
});

// Authentication
app.post('/api/auth/token', (req, res) => {
  const { token } = req.body;

  if (!token || typeof token !== 'string' || token.trim().length === 0) {
    res.status(400).json({ error: 'Valid access token required' });
    return;
  }

  scanner.setAccessToken(token.trim());
  res.json({
    success: true,
    message: 'Access token set successfully',
    timestamp: Date.now(),
  });
});

app.delete('/api/auth/token', (_req, res) => {
  scanner.clearAccessToken();
  scanner.stopScanning();
  res.json({
    success: true,
    message: 'Access token cleared',
    timestamp: Date.now(),
  });
});

app.get('/api/auth/status', (_req, res) => {
  res.json({
    authenticated: scanner.isAuthenticated(),
    timestamp: Date.now(),
  });
});

// Scanner control
app.post('/api/scanner/start', async (_req, res) => {
  if (!scanner.isAuthenticated()) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    await scanner.startScanning(30000);
    res.json({
      success: true,
      message: 'Scanner started',
      timestamp: Date.now(),
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to start scanner',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.post('/api/scanner/stop', (_req, res) => {
  scanner.stopScanning();
  res.json({
    success: true,
    message: 'Scanner stopped',
    timestamp: Date.now(),
  });
});

app.get('/api/scanner/status', (_req, res) => {
  res.json({
    progress: scanner.getScanProgress(),
    isScanning: scanner.getScanProgress().phase !== 'complete',
    lastScan: scanner.getLastResults()?.timestamp ?? null,
    timestamp: Date.now(),
  });
});

app.get('/api/scanner/results', (_req, res) => {
  const results = scanner.getLastResults();
  if (!results) {
    res.status(404).json({ error: 'No scan results available' });
    return;
  }
  res.json(results);
});

app.get('/api/scanner/progress', (_req, res) => {
  res.json(scanner.getScanProgress());
});

// Decision weights
app.get('/api/config/weights', (_req, res) => {
  res.json(scanner.getDecisionWeights());
});

app.put('/api/config/weights', (req, res) => {
  const weights = req.body as Partial<DecisionWeights>;
  scanner.updateDecisionWeights(weights);
  res.json({
    success: true,
    weights: scanner.getDecisionWeights(),
  });
});

// Ranking criteria
app.get('/api/config/criteria', (_req, res) => {
  res.json(scanner.getRankingCriteria());
});

app.put('/api/config/criteria', (req, res) => {
  const criteria = req.body as Partial<RankingCriteria>;
  scanner.updateRankingCriteria(criteria);
  res.json({
    success: true,
    criteria: scanner.getRankingCriteria(),
  });
});

// Market status
app.get('/api/market/status', async (_req, res) => {
  try {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const day = now.getDay();
    const currentTime = hours * 60 + minutes;

    let isOpen = false;
    let session = 'closed';

    if (day >= 1 && day <= 5) {
      if (currentTime >= 555 && currentTime < 570) {
        isOpen = true;
        session = 'opening';
      } else if (currentTime >= 570 && currentTime < 810) {
        isOpen = true;
        session = 'morning';
      } else if (currentTime >= 810 && currentTime < 900) {
        isOpen = true;
        session = 'afternoon';
      } else if (currentTime >= 900 && currentTime < 915) {
        isOpen = true;
        session = 'closing';
      } else if (currentTime < 555) {
        session = 'pre_market';
      } else {
        session = 'post_market';
      }
    }

    res.json({
      isOpen,
      session,
      timestamp: Date.now(),
      serverTime: now.toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get market status' });
  }
});

// WebSocket handling
wss.on('connection', (ws: WebSocket) => {
  clients.add(ws);
  console.log(`WebSocket client connected. Total: ${clients.size}`);

  // Send current state
  ws.send(JSON.stringify({
    type: 'connected',
    data: {
      authenticated: scanner.isAuthenticated(),
      scanProgress: scanner.getScanProgress(),
      lastResults: scanner.getLastResults(),
    },
    timestamp: Date.now(),
  }));

  ws.on('message', (data: Buffer) => {
    try {
      const message = JSON.parse(data.toString());
      handleWebSocketMessage(ws, message);
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        data: { message: 'Invalid message format' },
        timestamp: Date.now(),
      }));
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`WebSocket client disconnected. Total: ${clients.size}`);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clients.delete(ws);
  });

  // Heartbeat
  const heartbeat = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'heartbeat',
        data: { timestamp: Date.now() },
        timestamp: Date.now(),
      }));
    }
  }, 30000);

  ws.on('close', () => {
    clearInterval(heartbeat);
  });
});

function handleWebSocketMessage(ws: WebSocket, message: { type: string; data?: unknown }): void {
  switch (message.type) {
    case 'start_scan':
      if (scanner.isAuthenticated()) {
        scanner.startScanning(30000);
      }
      break;
    case 'stop_scan':
      scanner.stopScanning();
      break;
    case 'get_status':
      ws.send(JSON.stringify({
        type: 'status',
        data: {
          authenticated: scanner.isAuthenticated(),
          progress: scanner.getScanProgress(),
          results: scanner.getLastResults(),
        },
        timestamp: Date.now(),
      }));
      break;
    default:
      ws.send(JSON.stringify({
        type: 'error',
        data: { message: `Unknown message type: ${message.type}` },
        timestamp: Date.now(),
      }));
  }
}

// Broadcast to all connected clients
function broadcast(message: object): void {
  const data = JSON.stringify(message);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}

// Scanner event handlers
scanner.on('progress', (progress: ScanProgress) => {
  broadcast({
    type: 'scan_progress',
    data: progress,
    timestamp: Date.now(),
  });
});

scanner.on('scan_complete', (result: MarketScanResult) => {
  broadcast({
    type: 'scan_complete',
    data: result,
    timestamp: Date.now(),
  });
});

scanner.on('error', (error: string) => {
  broadcast({
    type: 'error',
    data: { message: error },
    timestamp: Date.now(),
  });
});

scanner.on('scan_started', () => {
  broadcast({
    type: 'scan_started',
    data: { timestamp: Date.now() },
    timestamp: Date.now(),
  });
});

scanner.on('scan_stopped', () => {
  broadcast({
    type: 'scan_stopped',
    data: { timestamp: Date.now() },
    timestamp: Date.now(),
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║   AI Institutional Intraday Intelligence Platform         ║
║   Server running on port ${PORT}                            ║
║   WebSocket available at ws://localhost:${PORT}/ws          ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

export { app, server, scanner };