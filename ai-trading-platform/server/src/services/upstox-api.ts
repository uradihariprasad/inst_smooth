/**
 * Upstox API Service
 * Handles all communication with Upstox v2 REST APIs
 * No mock data - all responses come from live API
 */

import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import NodeCache from 'node-cache';
import { UPSTOX_CONFIG, type CandleInterval } from '../config/upstox';
import type {
  Quote,
  MarketDepth,
  DepthLevel,
  OptionChain,
  OptionChainEntry,
  OHLCV,
  FnoInstrument,
  IndexData,
  PreviousDayData,
} from '../../shared/types/market';
import type {
  UpstoxQuoteResponse,
  UpstoxQuoteData,
  UpstoxHistoricalResponse,
  UpstoxOptionChainResponse,
  UpstoxInstrumentsResponse,
} from '../../shared/types/api';

interface RateLimitBucket {
  tokens: number;
  maxTokens: number;
  refillRate: number;
  lastRefill: number;
}

export class UpstoxApiService {
  private client: AxiosInstance;
  private cache: NodeCache;
  private rateLimiters: Map<string, RateLimitBucket>;
  private accessToken: string | null = null;
  private requestQueue: Array<() => Promise<void>> = [];
  private processing = false;

  constructor() {
    this.client = axios.create({
      baseURL: UPSTOX_CONFIG.BASE_URL,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    this.cache = new NodeCache({
      stdTTL: UPSTOX_CONFIG.CACHE_TTL.QUOTE,
      checkperiod: 2,
      useClones: false,
    });

    this.rateLimiters = new Map();
    this.initializeRateLimiters();
    this.setupInterceptors();
  }

  private initializeRateLimiters(): void {
    this.rateLimiters.set('quotes', {
      tokens: UPSTOX_CONFIG.RATE_LIMITS.QUOTES_PER_SECOND,
      maxTokens: UPSTOX_CONFIG.RATE_LIMITS.QUOTES_PER_SECOND,
      refillRate: UPSTOX_CONFIG.RATE_LIMITS.QUOTES_PER_SECOND,
      lastRefill: Date.now(),
    });
    this.rateLimiters.set('historical', {
      tokens: UPSTOX_CONFIG.RATE_LIMITS.HISTORICAL_PER_SECOND,
      maxTokens: UPSTOX_CONFIG.RATE_LIMITS.HISTORICAL_PER_SECOND,
      refillRate: UPSTOX_CONFIG.RATE_LIMITS.HISTORICAL_PER_SECOND,
      lastRefill: Date.now(),
    });
    this.rateLimiters.set('option_chain', {
      tokens: UPSTOX_CONFIG.RATE_LIMITS.OPTION_CHAIN_PER_SECOND,
      maxTokens: UPSTOX_CONFIG.RATE_LIMITS.OPTION_CHAIN_PER_SECOND,
      refillRate: UPSTOX_CONFIG.RATE_LIMITS.OPTION_CHAIN_PER_SECOND,
      lastRefill: Date.now(),
    });
    this.rateLimiters.set('instruments', {
      tokens: UPSTOX_CONFIG.RATE_LIMITS.INSTRUMENTS_PER_SECOND,
      maxTokens: UPSTOX_CONFIG.RATE_LIMITS.INSTRUMENTS_PER_SECOND,
      refillRate: UPSTOX_CONFIG.RATE_LIMITS.INSTRUMENTS_PER_SECOND,
      lastRefill: Date.now(),
    });
  }

  private setupInterceptors(): void {
    this.client.interceptors.request.use(
      (config) => {
        if (this.accessToken) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          throw new Error('ACCESS_TOKEN_EXPIRED');
        }
        if (error.response?.status === 429) {
          const retryAfter = parseInt(error.response.headers['retry-after'] as string) || 5;
          await this.delay(retryAfter * 1000);
          if (error.config) {
            return this.client.request(error.config);
          }
        }
        if (error.response?.status && error.response.status >= 500) {
          throw new Error('UPSTOX_SERVER_ERROR');
        }
        throw error;
      }
    );
  }

  setAccessToken(token: string): void {
    this.accessToken = token;
    this.cache.flushAll();
  }

  clearAccessToken(): void {
    this.accessToken = null;
    this.cache.flushAll();
  }

  isAuthenticated(): boolean {
    return this.accessToken !== null;
  }

  private async waitForToken(bucketName: string): Promise<void> {
    const bucket = this.rateLimiters.get(bucketName);
    if (!bucket) return;

    const now = Date.now();
    const elapsed = (now - bucket.lastRefill) / 1000;
    bucket.tokens = Math.min(
      bucket.maxTokens,
      bucket.tokens + elapsed * bucket.refillRate
    );
    bucket.lastRefill = now;

    if (bucket.tokens < 1) {
      const waitTime = ((1 - bucket.tokens) / bucket.refillRate) * 1000;
      await this.delay(waitTime);
      bucket.tokens = 1;
    }

    bucket.tokens -= 1;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async enqueueRequest<T>(
    bucketName: string,
    fn: () => Promise<T>
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          await this.waitForToken(bucketName);
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.requestQueue.length > 0) {
      const task = this.requestQueue.shift();
      if (task) {
        await task();
      }
    }

    this.processing = false;
  }

  // ==========================================
  // MARKET QUOTES
  // ==========================================

  async getQuotes(instrumentKeys: string[]): Promise<Map<string, Quote>> {
    const cacheKey = `quotes:${instrumentKeys.sort().join(',')}`;
    const cached = this.cache.get<Map<string, Quote>>(cacheKey);
    if (cached) return cached;

    const result = await this.enqueueRequest('quotes', async () => {
      const chunks = this.chunkArray(instrumentKeys, 50);
      const allQuotes = new Map<string, Quote>();

      for (const chunk of chunks) {
        const response = await this.client.get<UpstoxQuoteResponse>(
          UPSTOX_CONFIG.ENDPOINTS.MARKET_QUOTE,
          {
            params: {
              instrument_key: chunk.join(','),
            },
          }
        );

        if (response.data.status === 'success' && response.data.data) {
          for (const [key, data] of Object.entries(response.data.data)) {
            const quote = this.transformQuote(key, data);
            allQuotes.set(key, quote);
          }
        }
      }

      return allQuotes;
    });

    this.cache.set(cacheKey, result, UPSTOX_CONFIG.CACHE_TTL.QUOTE);
    return result;
  }

  async getQuote(instrumentKey: string): Promise<Quote | null> {
    const quotes = await this.getQuotes([instrumentKey]);
    return quotes.get(instrumentKey) ?? null;
  }

  async getLTP(instrumentKeys: string[]): Promise<Map<string, number>> {
    const cacheKey = `ltp:${instrumentKeys.sort().join(',')}`;
    const cached = this.cache.get<Map<string, number>>(cacheKey);
    if (cached) return cached;

    const result = await this.enqueueRequest('quotes', async () => {
      const response = await this.client.get<Record<string, { last_price: number }>>(
        UPSTOX_CONFIG.ENDPOINTS.MARKET_QUOTE_LTP,
        {
          params: {
            instrument_key: instrumentKeys.join(','),
          },
        }
      );

      const ltpMap = new Map<string, number>();
      if (response.data) {
        for (const [key, data] of Object.entries(response.data)) {
          ltpMap.set(key, data.last_price);
        }
      }
      return ltpMap;
    });

    this.cache.set(cacheKey, result, UPSTOX_CONFIG.CACHE_TTL.QUOTE);
    return result;
  }

  async getMarketDepth(instrumentKey: string): Promise<MarketDepth | null> {
    const cacheKey = `depth:${instrumentKey}`;
    const cached = this.cache.get<MarketDepth>(cacheKey);
    if (cached) return cached;

    const result = await this.enqueueRequest('quotes', async () => {
      const response = await this.client.get<UpstoxQuoteResponse>(
        UPSTOX_CONFIG.ENDPOINTS.MARKET_QUOTE_DEPTH,
        {
          params: {
            instrument_key: instrumentKey,
          },
        }
      );

      if (response.data.status === 'success' && response.data.data) {
        const data = Object.values(response.data.data)[0];
        if (data?.depth) {
          return {
            buy: data.depth.buy.map((level) => ({
              price: level.price,
              quantity: level.quantity,
              orders: level.orders,
            })),
            sell: data.depth.sell.map((level) => ({
              price: level.price,
              quantity: level.quantity,
              orders: level.orders,
            })),
          };
        }
      }
      return null;
    });

    if (result) {
      this.cache.set(cacheKey, result, UPSTOX_CONFIG.CACHE_TTL.QUOTE);
    }
    return result;
  }

  // ==========================================
  // HISTORICAL CANDLES
  // ==========================================

  async getHistoricalCandles(
    instrumentKey: string,
    interval: CandleInterval,
    fromDate: string,
    toDate: string
  ): Promise<OHLCV[]> {
    const cacheKey = `historical:${instrumentKey}:${interval}:${fromDate}:${toDate}`;
    const cached = this.cache.get<OHLCV[]>(cacheKey);
    if (cached) return cached;

    const result = await this.enqueueRequest('historical', async () => {
      const response = await this.client.get<UpstoxHistoricalResponse>(
        `${UPSTOX_CONFIG.ENDPOINTS.MARKET_HISTORICAL_CANDLE}/${instrumentKey}/${interval}/${toDate}/${fromDate}`
      );

      if (response.data.status === 'success' && response.data.data) {
        return response.data.data.map((candle) => ({
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volume,
          timestamp: candle.timestamp,
        }));
      }
      return [];
    });

    this.cache.set(cacheKey, result, UPSTOX_CONFIG.CACHE_TTL.HISTORICAL);
    return result;
  }

  async getIntraDayCandles(
    instrumentKey: string,
    interval: CandleInterval
  ): Promise<OHLCV[]> {
    const cacheKey = `intraday:${instrumentKey}:${interval}`;
    const cached = this.cache.get<OHLCV[]>(cacheKey);
    if (cached) return cached;

    const result = await this.enqueueRequest('historical', async () => {
      const response = await this.client.get<UpstoxHistoricalResponse>(
        `${UPSTOX_CONFIG.ENDPOINTS.MARKET_INTRA_DAY_CANDLE}/${instrumentKey}/${interval}`
      );

      if (response.data.status === 'success' && response.data.data) {
        return response.data.data.map((candle) => ({
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volume,
          timestamp: candle.timestamp,
        }));
      }
      return [];
    });

    this.cache.set(cacheKey, result, UPSTOX_CONFIG.CACHE_TTL.QUOTE);
    return result;
  }

  // ==========================================
  // OPTION CHAIN
  // ==========================================

  async getOptionChain(
    instrumentKey: string,
    expiryDate: string
  ): Promise<OptionChain | null> {
    const cacheKey = `optionchain:${instrumentKey}:${expiryDate}`;
    const cached = this.cache.get<OptionChain>(cacheKey);
    if (cached) return cached;

    const result = await this.enqueueRequest('option_chain', async () => {
      const response = await this.client.get<UpstoxOptionChainResponse>(
        UPSTOX_CONFIG.ENDPOINTS.OPTION_CHAIN,
        {
          params: {
            instrument_key: instrumentKey,
            expiry_date: expiryDate,
          },
        }
      );

      if (response.data.status === 'success' && response.data.data) {
        return this.transformOptionChain(instrumentKey, response.data.data);
      }
      return null;
    });

    if (result) {
      this.cache.set(cacheKey, result, UPSTOX_CONFIG.CACHE_TTL.OPTION_CHAIN);
    }
    return result;
  }

  async getOptionExpiries(instrumentKey: string): Promise<string[]> {
    const cacheKey = `expiries:${instrumentKey}`;
    const cached = this.cache.get<string[]>(cacheKey);
    if (cached) return cached;

    const result = await this.enqueueRequest('option_chain', async () => {
      const response = await this.client.get<{ status: string; data: string[] }>(
        UPSTOX_CONFIG.ENDPOINTS.OPTION_EXPIRIES,
        {
          params: {
            instrument_key: instrumentKey,
          },
        }
      );

      if (response.data.status === 'success' && response.data.data) {
        return response.data.data;
      }
      return [];
    });

    this.cache.set(cacheKey, result, UPSTOX_CONFIG.CACHE_TTL.OPTION_CHAIN);
    return result;
  }

  // ==========================================
  // INSTRUMENTS
  // ==========================================

  async getFnoInstruments(): Promise<FnoInstrument[]> {
    const cacheKey = 'fno_instruments';
    const cached = this.cache.get<FnoInstrument[]>(cacheKey);
    if (cached) return cached;

    const result = await this.enqueueRequest('instruments', async () => {
      const response = await this.client.get<UpstoxInstrumentsResponse>(
        UPSTOX_CONFIG.ENDPOINTS.INSTRUMENTS_FNO,
        {
          params: {
            segment: 'NSE_FO',
          },
        }
      );

      if (response.data.status === 'success' && response.data.data) {
        return this.transformFnoInstruments(response.data.data);
      }
      return [];
    });

    this.cache.set(cacheKey, result, UPSTOX_CONFIG.CACHE_TTL.INSTRUMENTS);
    return result;
  }

  // ==========================================
  // INDEX DATA
  // ==========================================

  async getIndexData(indexKeys: string[]): Promise<Map<string, IndexData>> {
    const cacheKey = `indices:${indexKeys.sort().join(',')}`;
    const cached = this.cache.get<Map<string, IndexData>>(cacheKey);
    if (cached) return cached;

    const quotes = await this.getQuotes(indexKeys);
    const indexDataMap = new Map<string, IndexData>();

    for (const [key, quote] of quotes) {
      indexDataMap.set(key, {
        symbol: key.split('|')[1] ?? key,
        name: key.split('|')[1] ?? key,
        ltp: quote.ltp,
        change: quote.change,
        changePercent: quote.changePercent,
        open: quote.open,
        high: quote.high,
        low: quote.low,
        close: quote.close,
        previousClose: quote.previousClose,
        volume: quote.volume,
        timestamp: quote.timestamp,
      });
    }

    this.cache.set(cacheKey, indexDataMap, UPSTOX_CONFIG.CACHE_TTL.QUOTE);
    return indexDataMap;
  }

  // ==========================================
  // TRANSFORM METHODS
  // ==========================================

  private transformQuote(instrumentKey: string, data: UpstoxQuoteData): Quote {
    const symbol = instrumentKey.split('|')[1] ?? instrumentKey;
    const ohlc = data.ohlc;
    const ltp = data.last_price;
    const previousClose = ohlc.close;
    const change = ltp - previousClose;
    const changePercent = previousClose !== 0 ? (change / previousClose) * 100 : 0;
    const bid = data.depth.buy[0]?.price ?? 0;
    const ask = data.depth.sell[0]?.price ?? 0;
    const spread = ask - bid;
    const spreadPercent = ltp !== 0 ? (spread / ltp) * 100 : 0;

    return {
      instrumentKey,
      symbol,
      ltp,
      ltt: data.last_trade_time,
      change,
      changePercent,
      open: ohlc.open,
      high: ohlc.high,
      low: ohlc.low,
      close: ohlc.close,
      previousClose,
      volume: data.volume,
      vwap: data.vwap,
      bid,
      ask,
      bidQuantity: data.depth.buy[0]?.quantity ?? 0,
      askQuantity: data.depth.sell[0]?.quantity ?? 0,
      spread,
      spreadPercent,
      totalBuyQuantity: data.total_buy_quantity,
      totalSellQuantity: data.total_sell_quantity,
      averageTradePrice: data.average_price,
      lastTradeTime: data.last_trade_time,
      marketDepth: {
        buy: data.depth.buy.map((level) => ({
          price: level.price,
          quantity: level.quantity,
          orders: level.orders,
        })),
        sell: data.depth.sell.map((level) => ({
          price: level.price,
          quantity: level.quantity,
          orders: level.orders,
        })),
      },
      timestamp: data.timestamp,
      source: 'upstox',
    };
  }

  private transformOptionChain(
    instrumentKey: string,
    data: UpstoxOptionChainResponse['data']
  ): OptionChain {
    const calls: OptionChainEntry[] = [];
    const puts: OptionChainEntry[] = [];

    for (const strike of data.strikes) {
      if (strike.call_options) {
        calls.push({
          strike: strike.strike_price,
          optionType: 'CE',
          instrumentKey: strike.call_options.instrument_key,
          ltp: strike.call_options.market_data.ltp,
          change: strike.call_options.market_data.net_change,
          changePercent:
            strike.call_options.market_data.close !== 0
              ? (strike.call_options.market_data.net_change /
                  strike.call_options.market_data.close) *
                100
              : 0,
          volume: strike.call_options.market_data.volume,
          openInterest: strike.call_options.market_data.oi,
          changeInOI: 0,
          impliedVolatility: strike.call_options.option_greeks.iv,
          delta: strike.call_options.option_greeks.delta,
          gamma: strike.call_options.option_greeks.gamma,
          theta: strike.call_options.option_greeks.theta,
          vega: strike.call_options.option_greeks.vega,
          bid: strike.call_options.market_data.bid,
          ask: strike.call_options.market_data.ask,
          bidQuantity: strike.call_options.market_data.bid_qty,
          askQuantity: strike.call_options.market_data.ask_qty,
          lastTradeTime: 0,
        });
      }

      if (strike.put_options) {
        puts.push({
          strike: strike.strike_price,
          optionType: 'PE',
          instrumentKey: strike.put_options.instrument_key,
          ltp: strike.put_options.market_data.ltp,
          change: strike.put_options.market_data.net_change,
          changePercent:
            strike.put_options.market_data.close !== 0
              ? (strike.put_options.market_data.net_change /
                  strike.put_options.market_data.close) *
                100
              : 0,
          volume: strike.put_options.market_data.volume,
          openInterest: strike.put_options.market_data.oi,
          changeInOI: 0,
          impliedVolatility: strike.put_options.option_greeks.iv,
          delta: strike.put_options.option_greeks.delta,
          gamma: strike.put_options.option_greeks.gamma,
          theta: strike.put_options.option_greeks.theta,
          vega: strike.put_options.option_greeks.vega,
          bid: strike.put_options.market_data.bid,
          ask: strike.put_options.market_data.ask,
          bidQuantity: strike.put_options.market_data.bid_qty,
          askQuantity: strike.put_options.market_data.ask_qty,
          lastTradeTime: 0,
        });
      }
    }

    const totalCallOI = calls.reduce((sum, c) => sum + c.openInterest, 0);
    const totalPutOI = puts.reduce((sum, p) => sum + p.openInterest, 0);
    const totalCallVolume = calls.reduce((sum, c) => sum + c.volume, 0);
    const totalPutVolume = puts.reduce((sum, p) => sum + p.volume, 0);
    const pcr = totalCallOI !== 0 ? totalPutOI / totalCallOI : 0;

    let maxPainStrike = data.spot_price;
    let minPain = Infinity;
    for (const strike of data.strikes) {
      let pain = 0;
      for (const call of calls) {
        if (data.spot_price > call.strike) {
          pain += (data.spot_price - call.strike) * call.openInterest;
        }
      }
      for (const put of puts) {
        if (data.spot_price < put.strike) {
          pain += (put.strike - data.spot_price) * put.openInterest;
        }
      }
      if (pain < minPain) {
        minPain = pain;
        maxPainStrike = strike.strike_price;
      }
    }

    return {
      instrumentKey,
      symbol: instrumentKey.split('|')[1] ?? instrumentKey,
      underlyingPrice: data.spot_price,
      atmStrike: this.findATMStrike(data.strikes.map((s) => s.strike_price), data.spot_price),
      expiryDate: data.expiry,
      calls,
      puts,
      pcr,
      totalCallOI,
      totalPutOI,
      totalCallVolume,
      totalPutVolume,
      maxPainStrike,
      timestamp: Date.now(),
      source: 'upstox',
    };
  }

  private findATMStrike(strikes: number[], spotPrice: number): number {
    let closest = strikes[0] ?? 0;
    let minDiff = Math.abs(spotPrice - closest);

    for (const strike of strikes) {
      const diff = Math.abs(spotPrice - strike);
      if (diff < minDiff) {
        minDiff = diff;
        closest = strike;
      }
    }
    return closest;
  }

  private transformFnoInstruments(data: UpstoxInstrumentsResponse['data']): FnoInstrument[] {
    const uniqueSymbols = new Map<string, FnoInstrument>();

    for (const instrument of data) {
      if (instrument.instrument_type === 'FUT' || instrument.instrument_type === 'EQ') {
        const existing = uniqueSymbols.get(instrument.trading_symbol);
        if (!existing) {
          uniqueSymbols.set(instrument.trading_symbol, {
            instrumentKey: instrument.instrument_key,
            symbol: instrument.trading_symbol,
            name: instrument.name,
            sector: 'Unknown',
            industry: 'Unknown',
            lotSize: instrument.lot_size,
            tickSize: instrument.tick_size,
            expiryDates: instrument.expiry ? [instrument.expiry] : [],
            exchange: instrument.exchange,
            segment: instrument.segment,
            isin: '',
            underlyingKey: instrument.instrument_key,
          });
        } else if (instrument.expiry && !existing.expiryDates.includes(instrument.expiry)) {
          existing.expiryDates.push(instrument.expiry);
        }
      }
    }

    return Array.from(uniqueSymbols.values());
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  // ==========================================
  // VALIDATION
  // ==========================================

  async validateToken(): Promise<boolean> {
    if (!this.accessToken) return false;

    try {
      const response = await this.client.get(
        UPSTOX_CONFIG.ENDPOINTS.USER_PROFILE
      );
      return response.data.status === 'success';
    } catch {
      this.accessToken = null;
      return false;
    }
  }

  async getMarketStatus(): Promise<{ isOpen: boolean; nextEvent: string; timestamp: number }> {
    const cacheKey = 'market_status';
    const cached = this.cache.get<{ isOpen: boolean; nextEvent: string; timestamp: number }>(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const day = now.getDay();
    const currentTime = hours * 60 + minutes;

    let isOpen = false;
    let nextEvent = '';

    if (day >= 1 && day <= 5) {
      if (currentTime >= 555 && currentTime < 915) {
        isOpen = true;
        nextEvent = 'Market closes at 15:30 IST';
      } else if (currentTime < 555) {
        nextEvent = 'Market opens at 09:15 IST';
      } else {
        nextEvent = 'Market closed. Opens tomorrow at 09:15 IST';
      }
    } else {
      nextEvent = 'Weekend - Market closed. Opens Monday at 09:15 IST';
    }

    const result = { isOpen, nextEvent, timestamp: Date.now() };
    this.cache.set(cacheKey, result, UPSTOX_CONFIG.CACHE_TTL.MARKET_STATUS);
    return result;
  }
}