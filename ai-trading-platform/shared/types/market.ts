/**
 * Core Market Data Types
 * All types strictly typed - no 'any' allowed
 */

export type TradeBias = 'bullish' | 'bearish' | 'neutral';
export type RiskLevel = 'low' | 'medium' | 'high' | 'extreme';
export type TrendDirection = 'uptrend' | 'downtrend' | 'sideways';
export type TrendStage = 'early' | 'middle' | 'late' | 'exhaustion';
export type TrendStrength = 'weak' | 'moderate' | 'strong' | 'very_strong';
export type TrendQuality = 'clean' | 'noisy' | 'choppy' | 'parabolic';
export type SignalAction = 'buy' | 'sell' | 'hold' | 'exit';
export type MarketSession = 'pre_market' | 'opening' | 'morning' | 'afternoon' | 'closing' | 'post_market' | 'closed';
export type OptionType = 'CE' | 'PE';
export type DataSource = 'upstox' | 'computed';

export interface OHLC {
  open: number;
  high: number;
  low: number;
  close: number;
  timestamp: number;
}

export interface OHLCV extends OHLC {
  volume: number;
}

export interface Candle extends OHLCV {
  interval: string;
  vwap?: number;
  trades?: number;
}

export interface MarketDepth {
  buy: DepthLevel[];
  sell: DepthLevel[];
}

export interface DepthLevel {
  price: number;
  quantity: number;
  orders: number;
}

export interface Quote {
  instrumentKey: string;
  symbol: string;
  ltp: number;
  ltt: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  close: number;
  previousClose: number;
  volume: number;
  vwap: number;
  bid: number;
  ask: number;
  bidQuantity: number;
  askQuantity: number;
  spread: number;
  spreadPercent: number;
  totalBuyQuantity: number;
  totalSellQuantity: number;
  averageTradePrice: number;
  lastTradeTime: number;
  marketDepth: MarketDepth;
  timestamp: number;
  source: DataSource;
}

export interface OptionChainEntry {
  strike: number;
  optionType: OptionType;
  instrumentKey: string;
  ltp: number;
  change: number;
  changePercent: number;
  volume: number;
  openInterest: number;
  changeInOI: number;
  impliedVolatility: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  bid: number;
  ask: number;
  bidQuantity: number;
  askQuantity: number;
  lastTradeTime: number;
}

export interface OptionChain {
  instrumentKey: string;
  symbol: string;
  underlyingPrice: number;
  atmStrike: number;
  expiryDate: string;
  calls: OptionChainEntry[];
  puts: OptionChainEntry[];
  pcr: number;
  totalCallOI: number;
  totalPutOI: number;
  totalCallVolume: number;
  totalPutVolume: number;
  maxPainStrike: number;
  timestamp: number;
  source: DataSource;
}

export interface FnoInstrument {
  instrumentKey: string;
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  lotSize: number;
  tickSize: number;
  expiryDates: string[];
  exchange: string;
  segment: string;
  isin: string;
  underlyingKey: string;
}

export interface IndexData {
  symbol: string;
  name: string;
  ltp: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  close: number;
  previousClose: number;
  volume: number;
  timestamp: number;
}

export interface SectorPerformance {
  sector: string;
  changePercent: number;
  advancers: number;
  decliners: number;
  unchanged: number;
  topGainers: string[];
  topLosers: string[];
  averageVolume: number;
  relativeStrength: number;
}

export interface MarketBreadth {
  advancers: number;
  decliners: number;
  unchanged: number;
  newHighs: number;
  newLows: number;
  advanceDeclineRatio: number;
  breadthStrength: number;
  timestamp: number;
}

export interface PreviousDayData {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap: number;
  pivot: number;
  r1: number;
  r2: number;
  r3: number;
  s1: number;
  s2: number;
  s3: number;
}

export interface OpeningRange {
  high: number;
  low: number;
  range: number;
  rangePercent: number;
  volume: number;
  timestamp: number;
  minutes: number;
  isBroken: boolean;
  breakDirection?: 'up' | 'down';
  breakTime?: number;
}

export interface SupportResistanceZone {
  level: number;
  zone: 'support' | 'resistance';
  strength: number;
  touches: number;
  lastTestedAt: number;
  type: 'swing' | 'previous_day' | 'opening_range' | 'vwap' | 'option_oi' | 'psychological' | 'gap_fill';
}