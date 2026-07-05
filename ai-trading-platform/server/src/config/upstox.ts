/**
 * Upstox API Configuration
 * Centralized configuration for all Upstox API endpoints
 */

export const UPSTOX_CONFIG = {
  BASE_URL: 'https://api.upstox.com/v2',
  ENDPOINTS: {
    // Market Data
    MARKET_QUOTE: '/market/quote',
    MARKET_QUOTE_DEPTH: '/market/quote/depth',
    MARKET_QUOTE_LTP: '/market/quote/ltp',
    MARKET_HISTORICAL_CANDLE: '/market/historical-candle',
    MARKET_INTRA_DAY_CANDLE: '/market/intra-day-candle',
    
    // Option Chain
    OPTION_CHAIN: '/option/chain',
    OPTION_EXPIRIES: '/option/expiry',
    
    // Instruments
    INSTRUMENTS: '/instruments',
    INSTRUMENTS_FNO: '/instruments/fno',
    
    // Market Status
    MARKET_STATUS: '/market/status',
    
    // User
    USER_PROFILE: '/user/profile',
    USER_GET_FUND: '/user/get-funds',
  },
  INTERVALS: {
    '1minute': '1minute',
    '5minute': '5minute',
    '15minute': '15minute',
    '30minute': '30minute',
    '1day': '1day',
  } as const,
  SEGMENTS: {
    NSE_FO: 'NSE_FO',
    NSE_EQ: 'NSE_EQ',
    NSE_INDEX: 'NSE_INDEX',
    BSE_FO: 'BSE_FO',
    BSE_EQ: 'BSE_EQ',
  } as const,
  RATE_LIMITS: {
    QUOTES_PER_SECOND: 10,
    HISTORICAL_PER_SECOND: 3,
    OPTION_CHAIN_PER_SECOND: 2,
    INSTRUMENTS_PER_SECOND: 1,
  },
  CACHE_TTL: {
    QUOTE: 2,
    HISTORICAL: 300,
    OPTION_CHAIN: 5,
    INSTRUMENTS: 3600,
    MARKET_STATUS: 60,
  },
} as const;

export const NSE_FNO_INDICES = [
  'NSE_INDEX|Nifty 50',
  'NSE_INDEX|Nifty Bank',
  'NSE_INDEX|India VIX',
] as const;

export const INDIA_VIX_KEY = 'NSE_INDEX|India VIX';
export const NIFTY_KEY = 'NSE_INDEX|Nifty 50';
export const BANKNIFTY_KEY = 'NSE_INDEX|Nifty Bank';

export type CandleInterval = keyof typeof UPSTOX_CONFIG.INTERVALS;