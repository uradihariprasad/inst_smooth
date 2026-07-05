/**
 * Server Type Definitions
 */

export interface ServerConfig {
  port: number;
  nodeEnv: string;
  logLevel: string;
}

export interface ScanConfig {
  intervalMs: number;
  maxConcurrentRequests: number;
  candleHistoryDays: number;
  optionChainExpiryWeeks: number;
}

export interface CacheConfig {
  ttlSeconds: number;
  checkPeriod: number;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}