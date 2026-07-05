/**
 * API Service for communicating with the backend
 * Supports:
 *   - Development: Vite proxy (/api → localhost:8000)
 *   - Docker/Single host: same-origin (/api)
 *   - Split deployment: VITE_API_URL points to backend
 */

import type {
  MarketScanResult,
  ScanProgress,
} from '../../../shared/types/analysis';
import type { DecisionWeights } from '../../../server/src/services/decision-engine';
import type { RankingCriteria } from '../../../server/src/services/ranking-engine';

function getApiBase(): string {
  // If VITE_API_URL is set, use it (split deployment)
  if (import.meta.env.VITE_API_URL) {
    return `${import.meta.env.VITE_API_URL}/api`;
  }
  // Otherwise use same-origin (Docker or dev proxy)
  return '/api';
}

function getWsUrl(): string {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/^http/, 'ws') + '/ws';
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
}

const API_BASE = getApiBase();

class ApiService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  getWsUrl(): string {
    return getWsUrl();
  }

  async setToken(token: string): Promise<{ success: boolean; message: string }> {
    return this.request('/auth/token', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  async clearToken(): Promise<{ success: boolean; message: string }> {
    return this.request('/auth/token', { method: 'DELETE' });
  }

  async getAuthStatus(): Promise<{ authenticated: boolean; timestamp: number }> {
    return this.request('/auth/status');
  }

  async startScanner(): Promise<{ success: boolean; message: string }> {
    return this.request('/scanner/start', { method: 'POST' });
  }

  async stopScanner(): Promise<{ success: boolean; message: string }> {
    return this.request('/scanner/stop', { method: 'POST' });
  }

  async getScannerStatus(): Promise<{
    progress: ScanProgress;
    isScanning: boolean;
    lastScan: number | null;
    timestamp: number;
  }> {
    return this.request('/scanner/status');
  }

  async getScannerResults(): Promise<MarketScanResult> {
    return this.request('/scanner/results');
  }

  async getScanProgress(): Promise<ScanProgress> {
    return this.request('/scanner/progress');
  }

  async getWeights(): Promise<DecisionWeights> {
    return this.request('/config/weights');
  }

  async updateWeights(weights: Partial<DecisionWeights>): Promise<{
    success: boolean;
    weights: DecisionWeights;
  }> {
    return this.request('/config/weights', {
      method: 'PUT',
      body: JSON.stringify(weights),
    });
  }

  async getCriteria(): Promise<RankingCriteria> {
    return this.request('/config/criteria');
  }

  async updateCriteria(criteria: Partial<RankingCriteria>): Promise<{
    success: boolean;
    criteria: RankingCriteria;
  }> {
    return this.request('/config/criteria', {
      method: 'PUT',
      body: JSON.stringify(criteria),
    });
  }

  async getMarketStatus(): Promise<{
    isOpen: boolean;
    session: string;
    timestamp: number;
    serverTime: string;
  }> {
    return this.request('/market/status');
  }

  async healthCheck(): Promise<{
    status: string;
    timestamp: number;
    uptime: number;
    authenticated: boolean;
  }> {
    return this.request('/health');
  }
}

export const apiService = new ApiService();