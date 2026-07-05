/**
 * API Types for Upstox Integration
 * All types strictly typed - no 'any' allowed
 */

export interface UpstoxConfig {
  apiKey: string;
  apiSecret: string;
  redirectUri: string;
  baseUrl: string;
}

export interface UpstoxAuthResponse {
  status: string;
  data: {
    email: string;
    exchanges: string[];
    products: string[];
    broker: string;
    user_id: string;
    user_name: string;
    order_types: string[];
    user_type: string;
    poa: boolean;
    ddpi: boolean;
  };
}

export interface UpstoxQuoteResponse {
  status: string;
  data: Record<string, UpstoxQuoteData>;
}

export interface UpstoxQuoteData {
  ohlc: {
    open: number;
    high: number;
    low: number;
    close: number;
  };
  depth: {
    buy: Array<{ price: number; quantity: number; orders: number }>;
    sell: Array<{ price: number; quantity: number; orders: number }>;
  };
  instrument_token: string;
  last_price: number;
  last_trade_time: number;
  net_change: number;
  oi: number;
  oi_day_high: number;
  oi_day_low: number;
  timestamp: number;
  volume: number;
  vwap: number;
  average_price: number;
  total_buy_quantity: number;
  total_sell_quantity: number;
  lower_circuit_limit: number;
  upper_circuit_limit: number;
}

export interface UpstoxHistoricalResponse {
  status: string;
  data: Array<{
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    oi: number;
  }>;
}

export interface UpstoxOptionChainResponse {
  status: string;
  data: {
    expiry: string;
    pcr: number;
    spot_price: number;
    strikes: Array<{
      call_options: {
        instrument_key: string;
        market_data: {
          ltp: number;
          close: number;
          net_change: number;
          volume: number;
          oi: number;
          bid: number;
          ask: number;
          bid_qty: number;
          ask_qty: number;
        };
        option_greeks: {
          vega: number;
          theta: number;
          gamma: number;
          delta: number;
          iv: number;
        };
      };
      put_options: {
        instrument_key: string;
        market_data: {
          ltp: number;
          close: number;
          net_change: number;
          volume: number;
          oi: number;
          bid: number;
          ask: number;
          bid_qty: number;
          ask_qty: number;
        };
        option_greeks: {
          vega: number;
          theta: number;
          gamma: number;
          delta: number;
          iv: number;
        };
      };
      strike_price: number;
    }>;
  };
}

export interface UpstoxInstrumentsResponse {
  status: string;
  data: Array<{
    instrument_key: string;
    exchange_token: string;
    trading_symbol: string;
    name: string;
    last_price: number;
    expiry: string;
    strike: number;
    tick_size: number;
    lot_size: number;
    instrument_type: string;
    segment: string;
    exchange: string;
  }>;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
  timestamp: number;
  source: string;
}

export interface WebSocketMessage {
  type: 'quote' | 'depth' | 'order' | 'error' | 'heartbeat' | 'scan_update' | 'opportunity_update';
  data: unknown;
  timestamp: number;
}

export interface WebSocketScanUpdate {
  type: 'scan_update';
  data: {
    progress: number;
    total: number;
    processed: number;
    currentSymbol: string;
    phase: string;
  };
  timestamp: number;
}

export interface WebSocketOpportunityUpdate {
  type: 'opportunity_update';
  data: {
    opportunities: Array<{
      symbol: string;
      score: number;
      bias: string;
      rank: number;
    }>;
  };
  timestamp: number;
}