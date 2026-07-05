/**
 * Feature Engineering Pipeline
 * Calculates all derived metrics from raw market data
 * Independent of UI - pure data processing
 */

import type {
  OHLCV,
  Quote,
  OptionChain,
  PreviousDayData,
  OpeningRange,
  SupportResistanceZone,
} from '../../shared/types/market';
import type {
  FeatureSet,
  SupportResistanceZoneAnalysis,
} from '../../shared/types/analysis';

export class FeatureEngineeringService {
  /**
   * Calculate complete feature set for an instrument
   */
  calculateFeatures(
    instrumentKey: string,
    symbol: string,
    quote: Quote,
    intradayCandles: OHLCV[],
    historicalCandles: OHLCV[],
    previousDay: PreviousDayData,
    openingRange: OpeningRange,
    optionChain: OptionChain | null
  ): FeatureSet {
    const allCandles = [...historicalCandles, ...intradayCandles];
    
    // Calculate all features
    const vwapDistance = this.calculateVWAPDistance(quote.ltp, quote.vwap);
    const priceAcceleration = this.calculatePriceAcceleration(intradayCandles);
    const volumeRatio = this.calculateVolumeRatio(intradayCandles, historicalCandles);
    const relativeVolume = this.calculateRelativeVolume(intradayCandles, historicalCandles);
    const atr = this.calculateATR(historicalCandles.length > 0 ? historicalCandles : intradayCandles);
    const atrPercent = quote.ltp !== 0 ? (atr / quote.ltp) * 100 : 0;
    const rsi = this.calculateRSI(allCandles);
    const rsiSlope = this.calculateRSISlope(allCandles);
    const bollinger = this.calculateBollingerBands(allCandles);
    const maSlope = this.calculateMASlope(allCandles, 20);
    const ema9 = this.calculateEMA(allCandles.map(c => c.close), 9);
    const ema21 = this.calculateEMA(allCandles.map(c => c.close), 21);
    const ema50 = this.calculateEMA(allCandles.map(c => c.close), 50);
    
    // Trend features
    const trendPersistence = this.calculateTrendPersistence(allCandles);
    const swingStructure = this.analyzeSwingStructure(allCandles);
    const { higherHighs, higherLows, lowerHighs, lowerLows } = this.countSwings(allCandles);
    
    // Breakout features
    const breakoutPercent = this.calculateBreakoutPercent(quote.ltp, previousDay.high, previousDay.low);
    const breakdownPercent = this.calculateBreakdownPercent(quote.ltp, previousDay.low, previousDay.high);
    const volatilityExpansion = this.calculateVolatilityExpansion(intradayCandles, historicalCandles);
    const momentumPersistence = this.calculateMomentumPersistence(intradayCandles);
    const rangeExpansion = this.calculateRangeExpansion(intradayCandles, historicalCandles);
    
    // Opening features
    const openingRangeBreakout = openingRange.isBroken;
    const openingRangeDirection = openingRange.breakDirection ?? null;
    const previousDayBreakout = quote.ltp > previousDay.high || quote.ltp < previousDay.low;
    const gapPercent = this.calculateGapPercent(quote.open, previousDay.close);
    
    // Zone features
    const supportZones = this.calculateSupportZones(allCandles, previousDay, quote.ltp);
    const resistanceZones = this.calculateResistanceZones(allCandles, previousDay, quote.ltp);
    
    // Liquidity features
    const liquidityScore = this.calculateLiquidityScore(quote);
    const spreadAnalysis = quote.spreadPercent;
    
    // Risk features
    const rewardRiskEstimation = this.calculateRewardRisk(
      quote.ltp,
      supportZones,
      resistanceZones
    );

    return {
      instrumentKey,
      symbol,
      vwapDistance,
      priceAcceleration,
      volumeRatio,
      relativeVolume,
      atr,
      atrPercent,
      rsi,
      rsiSlope,
      bollingerUpper: bollinger.upper,
      bollingerLower: bollinger.lower,
      bollingerWidth: bollinger.width,
      bollingerPercent: bollinger.percent,
      maSlope,
      ema9,
      ema21,
      ema50,
      trendPersistence,
      swingStructure,
      higherHighs,
      higherLows,
      lowerHighs,
      lowerLows,
      breakoutPercent,
      breakdownPercent,
      volatilityExpansion,
      momentumPersistence,
      rangeExpansion,
      openingRangeBreakout,
      openingRangeDirection,
      previousDayBreakout,
      gapPercent,
      supportZones,
      resistanceZones,
      liquidityScore,
      spreadAnalysis,
      rewardRiskEstimation,
      timestamp: Date.now(),
    };
  }

  // ==========================================
  // VWAP ANALYSIS
  // ==========================================

  calculateVWAP(candles: OHLCV[]): number {
    if (candles.length === 0) return 0;

    let cumulativeTPV = 0;
    let cumulativeVolume = 0;

    for (const candle of candles) {
      const typicalPrice = (candle.high + candle.low + candle.close) / 3;
      cumulativeTPV += typicalPrice * candle.volume;
      cumulativeVolume += candle.volume;
    }

    return cumulativeVolume !== 0 ? cumulativeTPV / cumulativeVolume : 0;
  }

  calculateVWAPDistance(ltp: number, vwap: number): number {
    if (vwap === 0) return 0;
    return ((ltp - vwap) / vwap) * 100;
  }

  // ==========================================
  // MOMENTUM & VELOCITY
  // ==========================================

  calculatePriceAcceleration(candles: OHLCV[]): number {
    if (candles.length < 3) return 0;

    const recentCandles = candles.slice(-10);
    if (recentCandles.length < 3) return 0;

    const velocities: number[] = [];
    for (let i = 1; i < recentCandles.length; i++) {
      const prev = recentCandles[i - 1];
      const curr = recentCandles[i];
      if (prev && curr) {
        velocities.push(curr.close - prev.close);
      }
    }

    if (velocities.length < 2) return 0;

    let acceleration = 0;
    for (let i = 1; i < velocities.length; i++) {
      const prev = velocities[i - 1] ?? 0;
      const curr = velocities[i] ?? 0;
      acceleration += curr - prev;
    }

    return acceleration / (velocities.length - 1);
  }

  calculateMomentumPersistence(candles: OHLCV[]): number {
    if (candles.length < 5) return 0;

    const recentCandles = candles.slice(-20);
    let positiveMoves = 0;
    let negativeMoves = 0;
    let totalMoves = 0;

    for (let i = 1; i < recentCandles.length; i++) {
      const prev = recentCandles[i - 1];
      const curr = recentCandles[i];
      if (prev && curr) {
        const move = curr.close - prev.close;
        totalMoves++;
        if (move > 0) positiveMoves++;
        if (move < 0) negativeMoves++;
      }
    }

    if (totalMoves === 0) return 0;
    const dominant = Math.max(positiveMoves, negativeMoves);
    return (dominant / totalMoves) * 100;
  }

  // ==========================================
  // VOLUME ANALYSIS
  // ==========================================

  calculateVolumeRatio(intradayCandles: OHLCV[], historicalCandles: OHLCV[]): number {
    if (historicalCandles.length === 0) return 1;

    const avgHistoricalVolume =
      historicalCandles.reduce((sum, c) => sum + c.volume, 0) / historicalCandles.length;
    const currentVolume = intradayCandles.reduce((sum, c) => sum + c.volume, 0);

    return avgHistoricalVolume !== 0 ? currentVolume / avgHistoricalVolume : 1;
  }

  calculateRelativeVolume(intradayCandles: OHLCV[], historicalCandles: OHLCV[]): number {
    if (historicalCandles.length === 0 || intradayCandles.length === 0) return 1;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const marketOpenMinutes = 9 * 60 + 15;
    const elapsedMinutes = currentMinutes - marketOpenMinutes;

    if (elapsedMinutes <= 0) return 1;

    const currentVolume = intradayCandles.reduce((sum, c) => sum + c.volume, 0);

    const dailyVolumes = historicalCandles.map((c) => c.volume);
    const avgDailyVolume =
      dailyVolumes.reduce((sum, v) => sum + v, 0) / dailyVolumes.length;
    const totalMarketMinutes = 6 * 60 + 15;

    const expectedVolumeAtTime = (avgDailyVolume / totalMarketMinutes) * elapsedMinutes;

    return expectedVolumeAtTime !== 0 ? currentVolume / expectedVolumeAtTime : 1;
  }

  // ==========================================
  // AVERAGE TRUE RANGE
  // ==========================================

  calculateATR(candles: OHLCV[], period: number = 14): number {
    if (candles.length < period + 1) return 0;

    const trueRanges: number[] = [];
    for (let i = 1; i < candles.length; i++) {
      const curr = candles[i];
      const prev = candles[i - 1];
      if (curr && prev) {
        const tr = Math.max(
          curr.high - curr.low,
          Math.abs(curr.high - prev.close),
          Math.abs(curr.low - prev.close)
        );
        trueRanges.push(tr);
      }
    }

    if (trueRanges.length < period) return 0;

    let atr = trueRanges.slice(0, period).reduce((sum, tr) => sum + tr, 0) / period;

    for (let i = period; i < trueRanges.length; i++) {
      const tr = trueRanges[i] ?? 0;
      atr = (atr * (period - 1) + tr) / period;
    }

    return atr;
  }

  // ==========================================
  // RSI
  // ==========================================

  calculateRSI(candles: OHLCV[], period: number = 14): number {
    if (candles.length < period + 1) return 50;

    const changes: number[] = [];
    for (let i = 1; i < candles.length; i++) {
      const curr = candles[i];
      const prev = candles[i - 1];
      if (curr && prev) {
        changes.push(curr.close - prev.close);
      }
    }

    if (changes.length < period) return 50;

    let avgGain = 0;
    let avgLoss = 0;

    for (let i = 0; i < period; i++) {
      const change = changes[i] ?? 0;
      if (change > 0) avgGain += change;
      else avgLoss += Math.abs(change);
    }

    avgGain /= period;
    avgLoss /= period;

    for (let i = period; i < changes.length; i++) {
      const change = changes[i] ?? 0;
      if (change > 0) {
        avgGain = (avgGain * (period - 1) + change) / period;
        avgLoss = (avgLoss * (period - 1)) / period;
      } else {
        avgGain = (avgGain * (period - 1)) / period;
        avgLoss = (avgLoss * (period - 1) + Math.abs(change)) / period;
      }
    }

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  }

  calculateRSISlope(candles: OHLCV[], period: number = 5): number {
    if (candles.length < 30) return 0;

    const rsiValues: number[] = [];
    for (let i = 20; i <= candles.length; i++) {
      rsiValues.push(this.calculateRSI(candles.slice(0, i)));
    }

    if (rsiValues.length < period) return 0;

    const recent = rsiValues.slice(-period);
    let slope = 0;
    for (let i = 1; i < recent.length; i++) {
      const prev = recent[i - 1] ?? 0;
      const curr = recent[i] ?? 0;
      slope += curr - prev;
    }

    return slope / (period - 1);
  }

  // ==========================================
  // BOLLINGER BANDS
  // ==========================================

  calculateBollingerBands(
    candles: OHLCV[],
    period: number = 20,
    stdDev: number = 2
  ): { upper: number; lower: number; width: number; percent: number } {
    if (candles.length < period) {
      return { upper: 0, lower: 0, width: 0, percent: 0.5 };
    }

    const recentCandles = candles.slice(-period);
    const closes = recentCandles.map((c) => c.close);
    const currentPrice = candles[candles.length - 1]?.close ?? 0;

    const sma = closes.reduce((sum, c) => sum + c, 0) / period;

    const variance =
      closes.reduce((sum, c) => sum + Math.pow(c - sma, 2), 0) / period;
    const standardDeviation = Math.sqrt(variance);

    const upper = sma + stdDev * standardDeviation;
    const lower = sma - stdDev * standardDeviation;
    const width = upper - lower;
    const percent = width !== 0 ? (currentPrice - lower) / width : 0.5;

    return { upper, lower, width, percent };
  }

  // ==========================================
  // MOVING AVERAGES
  // ==========================================

  calculateSMA(candles: OHLCV[], period: number): number {
    if (candles.length < period) return 0;

    const recentCandles = candles.slice(-period);
    const sum = recentCandles.reduce((acc, c) => acc + c.close, 0);
    return sum / period;
  }

  calculateEMA(data: number[], period: number): number {
    if (data.length === 0) return 0;
    if (data.length < period) return data[data.length - 1] ?? 0;

    const multiplier = 2 / (period + 1);
    let ema = data.slice(0, period).reduce((sum, v) => sum + v, 0) / period;

    for (let i = period; i < data.length; i++) {
      const value = data[i] ?? 0;
      ema = (value - ema) * multiplier + ema;
    }

    return ema;
  }

  calculateMASlope(candles: OHLCV[], period: number): number {
    if (candles.length < period + 5) return 0;

    const recentSMA = this.calculateSMA(candles.slice(-period), period);
    const prevSMA = this.calculateSMA(candles.slice(-(period + 5), -5), period);

    if (prevSMA === 0) return 0;
    return ((recentSMA - prevSMA) / prevSMA) * 100;
  }

  // ==========================================
  // TREND PERSISTENCE
  // ==========================================

  calculateTrendPersistence(candles: OHLCV[]): number {
    if (candles.length < 10) return 0;

    const recentCandles = candles.slice(-20);
    let consecutiveUp = 0;
    let consecutiveDown = 0;
    let maxConsecutiveUp = 0;
    let maxConsecutiveDown = 0;

    for (let i = 1; i < recentCandles.length; i++) {
      const curr = recentCandles[i];
      const prev = recentCandles[i - 1];
      if (curr && prev) {
        if (curr.close > prev.close) {
          consecutiveUp++;
          consecutiveDown = 0;
          maxConsecutiveUp = Math.max(maxConsecutiveUp, consecutiveUp);
        } else if (curr.close < prev.close) {
          consecutiveDown++;
          consecutiveUp = 0;
          maxConsecutiveDown = Math.max(maxConsecutiveDown, consecutiveDown);
        }
      }
    }

    const maxConsecutive = Math.max(maxConsecutiveUp, maxConsecutiveDown);
    return (maxConsecutive / recentCandles.length) * 100;
  }

  // ==========================================
  // SWING STRUCTURE
  // ==========================================

  analyzeSwingStructure(candles: OHLCV[]): string {
    if (candles.length < 10) return 'insufficient_data';

    const swings = this.findSwings(candles);
    if (swings.length < 4) return 'forming';

    const recentSwings = swings.slice(-4);
    const highs = recentSwings.filter((s) => s.type === 'high').map((s) => s.price);
    const lows = recentSwings.filter((s) => s.type === 'low').map((s) => s.price);

    if (highs.length >= 2 && lows.length >= 2) {
      const firstHigh = highs[0] ?? 0;
      const lastHigh = highs[highs.length - 1] ?? 0;
      const firstLow = lows[0] ?? 0;
      const lastLow = lows[lows.length - 1] ?? 0;

      if (lastHigh > firstHigh && lastLow > firstLow) return 'uptrend';
      if (lastHigh < firstHigh && lastLow < firstLow) return 'downtrend';
      if (lastHigh > firstHigh && lastLow < firstLow) return 'expanding';
      if (lastHigh < firstHigh && lastLow > firstLow) return 'contracting';
    }

    return 'sideways';
  }

  private findSwings(candles: OHLCV[]): Array<{ type: 'high' | 'low'; price: number; index: number }> {
    const swings: Array<{ type: 'high' | 'low'; price: number; index: number }> = [];
    const lookback = 3;

    for (let i = lookback; i < candles.length - lookback; i++) {
      const current = candles[i];
      if (!current) continue;

      let isHigh = true;
      let isLow = true;

      for (let j = 1; j <= lookback; j++) {
        const left = candles[i - j];
        const right = candles[i + j];
        if (left && right) {
          if (current.high <= left.high || current.high <= right.high) isHigh = false;
          if (current.low >= left.low || current.low >= right.low) isLow = false;
        }
      }

      if (isHigh) swings.push({ type: 'high', price: current.high, index: i });
      if (isLow) swings.push({ type: 'low', price: current.low, index: i });
    }

    return swings;
  }

  countSwings(candles: OHLCV[]): {
    higherHighs: number;
    higherLows: number;
    lowerHighs: number;
    lowerLows: number;
  } {
    const swings = this.findSwings(candles);
    let higherHighs = 0;
    let higherLows = 0;
    let lowerHighs = 0;
    let lowerLows = 0;

    const highs = swings.filter((s) => s.type === 'high');
    const lows = swings.filter((s) => s.type === 'low');

    for (let i = 1; i < highs.length; i++) {
      const curr = highs[i];
      const prev = highs[i - 1];
      if (curr && prev) {
        if (curr.price > prev.price) higherHighs++;
        else lowerHighs++;
      }
    }

    for (let i = 1; i < lows.length; i++) {
      const curr = lows[i];
      const prev = lows[i - 1];
      if (curr && prev) {
        if (curr.price > prev.price) higherLows++;
        else lowerLows++;
      }
    }

    return { higherHighs, higherLows, lowerHighs, lowerLows };
  }

  // ==========================================
  // BREAKOUT & BREAKDOWN
  // ==========================================

  calculateBreakoutPercent(ltp: number, resistance: number, support: number): number {
    if (resistance === 0) return 0;
    if (ltp > resistance) {
      const range = resistance - support;
      if (range === 0) return 0;
      return ((ltp - resistance) / range) * 100;
    }
    return 0;
  }

  calculateBreakdownPercent(ltp: number, support: number, resistance: number): number {
    if (support === 0) return 0;
    if (ltp < support) {
      const range = resistance - support;
      if (range === 0) return 0;
      return ((support - ltp) / range) * 100;
    }
    return 0;
  }

  // ==========================================
  // VOLATILITY & RANGE
  // ==========================================

  calculateVolatilityExpansion(intradayCandles: OHLCV[], historicalCandles: OHLCV[]): number {
    if (historicalCandles.length === 0 || intradayCandles.length === 0) return 1;

    const intradayATR = this.calculateATR(intradayCandles, Math.min(5, intradayCandles.length));
    const historicalATR = this.calculateATR(historicalCandles);

    if (historicalATR === 0) return 1;
    return intradayATR / historicalATR;
  }

  calculateRangeExpansion(intradayCandles: OHLCV[], historicalCandles: OHLCV[]): number {
    if (historicalCandles.length === 0 || intradayCandles.length === 0) return 1;

    const intradayRange = intradayCandles.reduce(
      (sum, c) => sum + (c.high - c.low),
      0
    ) / intradayCandles.length;

    const historicalRange = historicalCandles.reduce(
      (sum, c) => sum + (c.high - c.low),
      0
    ) / historicalCandles.length;

    if (historicalRange === 0) return 1;
    return intradayRange / historicalRange;
  }

  // ==========================================
  // GAP ANALYSIS
  // ==========================================

  calculateGapPercent(openPrice: number, previousClose: number): number {
    if (previousClose === 0) return 0;
    return ((openPrice - previousClose) / previousClose) * 100;
  }

  // ==========================================
  // SUPPORT & RESISTANCE ZONES
  // ==========================================

  calculateSupportZones(
    candles: OHLCV[],
    previousDay: PreviousDayData,
    currentPrice: number
  ): SupportResistanceZoneAnalysis[] {
    const zones: SupportResistanceZoneAnalysis[] = [];

    // Previous day low as support
    zones.push({
      level: previousDay.low,
      zone: 'support',
      strength: 0.7,
      touches: 1,
      type: 'previous_day',
      distance: currentPrice !== 0 ? ((currentPrice - previousDay.low) / currentPrice) * 100 : 0,
    });

    // VWAP as support
    zones.push({
      level: previousDay.vwap,
      zone: 'support',
      strength: 0.6,
      touches: 1,
      type: 'vwap',
      distance: currentPrice !== 0 ? ((currentPrice - previousDay.vwap) / currentPrice) * 100 : 0,
    });

    // Pivot S1
    zones.push({
      level: previousDay.s1,
      zone: 'support',
      strength: 0.5,
      touches: 0,
      type: 'pivot',
      distance: currentPrice !== 0 ? ((currentPrice - previousDay.s1) / currentPrice) * 100 : 0,
    });

    // Pivot S2
    zones.push({
      level: previousDay.s2,
      zone: 'support',
      strength: 0.4,
      touches: 0,
      type: 'pivot',
      distance: currentPrice !== 0 ? ((currentPrice - previousDay.s2) / currentPrice) * 100 : 0,
    });

    // Swing lows from candles
    const swingLows = this.findSwings(candles).filter((s) => s.type === 'low');
    for (const swing of swingLows.slice(-3)) {
      zones.push({
        level: swing.price,
        zone: 'support',
        strength: 0.6,
        touches: 1,
        type: 'swing',
        distance: currentPrice !== 0 ? ((currentPrice - swing.price) / currentPrice) * 100 : 0,
      });
    }

    // Filter zones below current price and sort by proximity
    return zones
      .filter((z) => z.level <= currentPrice)
      .sort((a, b) => b.level - a.level)
      .slice(0, 5);
  }

  calculateResistanceZones(
    candles: OHLCV[],
    previousDay: PreviousDayData,
    currentPrice: number
  ): SupportResistanceZoneAnalysis[] {
    const zones: SupportResistanceZoneAnalysis[] = [];

    // Previous day high as resistance
    zones.push({
      level: previousDay.high,
      zone: 'resistance',
      strength: 0.7,
      touches: 1,
      type: 'previous_day',
      distance: currentPrice !== 0 ? ((previousDay.high - currentPrice) / currentPrice) * 100 : 0,
    });

    // Pivot R1
    zones.push({
      level: previousDay.r1,
      zone: 'resistance',
      strength: 0.5,
      touches: 0,
      type: 'pivot',
      distance: currentPrice !== 0 ? ((previousDay.r1 - currentPrice) / currentPrice) * 100 : 0,
    });

    // Pivot R2
    zones.push({
      level: previousDay.r2,
      zone: 'resistance',
      strength: 0.4,
      touches: 0,
      type: 'pivot',
      distance: currentPrice !== 0 ? ((previousDay.r2 - currentPrice) / currentPrice) * 100 : 0,
    });

    // Pivot R3
    zones.push({
      level: previousDay.r3,
      zone: 'resistance',
      strength: 0.3,
      touches: 0,
      type: 'pivot',
      distance: currentPrice !== 0 ? ((previousDay.r3 - currentPrice) / currentPrice) * 100 : 0,
    });

    // Swing highs from candles
    const swingHighs = this.findSwings(candles).filter((s) => s.type === 'high');
    for (const swing of swingHighs.slice(-3)) {
      zones.push({
        level: swing.price,
        zone: 'resistance',
        strength: 0.6,
        touches: 1,
        type: 'swing',
        distance: currentPrice !== 0 ? ((swing.price - currentPrice) / currentPrice) * 100 : 0,
      });
    }

    // Filter zones above current price and sort by proximity
    return zones
      .filter((z) => z.level >= currentPrice)
      .sort((a, b) => a.level - b.level)
      .slice(0, 5);
  }

  // ==========================================
  // LIQUIDITY & RISK
  // ==========================================

  calculateLiquidityScore(quote: Quote): number {
    let score = 0;

    // Volume component (0-30)
    if (quote.volume > 1000000) score += 30;
    else if (quote.volume > 500000) score += 25;
    else if (quote.volume > 100000) score += 20;
    else if (quote.volume > 50000) score += 15;
    else score += 10;

    // Spread component (0-30)
    if (quote.spreadPercent < 0.05) score += 30;
    else if (quote.spreadPercent < 0.1) score += 25;
    else if (quote.spreadPercent < 0.2) score += 20;
    else if (quote.spreadPercent < 0.5) score += 15;
    else score += 10;

    // Depth component (0-20)
    const totalDepth = quote.totalBuyQuantity + quote.totalSellQuantity;
    if (totalDepth > 500000) score += 20;
    else if (totalDepth > 100000) score += 15;
    else if (totalDepth > 50000) score += 10;
    else score += 5;

    // Order count component (0-20)
    const totalOrders =
      quote.marketDepth.buy.reduce((sum, l) => sum + l.orders, 0) +
      quote.marketDepth.sell.reduce((sum, l) => sum + l.orders, 0);
    if (totalOrders > 100) score += 20;
    else if (totalOrders > 50) score += 15;
    else if (totalOrders > 20) score += 10;
    else score += 5;

    return score;
  }

  calculateRewardRisk(
    currentPrice: number,
    supportZones: SupportResistanceZoneAnalysis[],
    resistanceZones: SupportResistanceZoneAnalysis[]
  ): number {
    if (supportZones.length === 0 || resistanceZones.length === 0) return 0;

    const nearestSupport = supportZones[0]?.level ?? currentPrice;
    const nearestResistance = resistanceZones[0]?.level ?? currentPrice;

    const risk = Math.abs(currentPrice - nearestSupport);
    const reward = Math.abs(nearestResistance - currentPrice);

    return risk !== 0 ? reward / risk : 0;
  }

  // ==========================================
  // PREVIOUS DAY CALCULATIONS
  // ==========================================

  calculatePreviousDayLevels(candles: OHLCV[]): PreviousDayData {
    if (candles.length === 0) {
      return {
        open: 0, high: 0, low: 0, close: 0, volume: 0, vwap: 0,
        pivot: 0, r1: 0, r2: 0, r3: 0, s1: 0, s2: 0, s3: 0,
      };
    }

    const lastCandle = candles[candles.length - 1];
    if (!lastCandle) {
      return {
        open: 0, high: 0, low: 0, close: 0, volume: 0, vwap: 0,
        pivot: 0, r1: 0, r2: 0, r3: 0, s1: 0, s2: 0, s3: 0,
      };
    }

    const open = lastCandle.open;
    const high = lastCandle.high;
    const low = lastCandle.low;
    const close = lastCandle.close;
    const volume = lastCandle.volume;
    const vwap = this.calculateVWAP(candles);

    const pivot = (high + low + close) / 3;
    const r1 = 2 * pivot - low;
    const r2 = pivot + (high - low);
    const r3 = r1 + (high - low);
    const s1 = 2 * pivot - high;
    const s2 = pivot - (high - low);
    const s3 = s1 - (high - low);

    return { open, high, low, close, volume, vwap, pivot, r1, r2, r3, s1, s2, s3 };
  }

  // ==========================================
  // OPENING RANGE
  // ==========================================

  calculateOpeningRange(candles: OHLCV[], minutes: number = 15): OpeningRange {
    if (candles.length === 0) {
      return {
        high: 0, low: 0, range: 0, rangePercent: 0, volume: 0,
        timestamp: Date.now(), minutes, isBroken: false,
      };
    }

    const openingCandles = candles.slice(0, Math.ceil(minutes / 1));
    const high = Math.max(...openingCandles.map((c) => c.high));
    const low = Math.min(...openingCandles.map((c) => c.low));
    const volume = openingCandles.reduce((sum, c) => sum + c.volume, 0);
    const range = high - low;
    const midPrice = (high + low) / 2;
    const rangePercent = midPrice !== 0 ? (range / midPrice) * 100 : 0;

    // Check if opening range was broken
    const subsequentCandles = candles.slice(openingCandles.length);
    let isBroken = false;
    let breakDirection: 'up' | 'down' | undefined;
    let breakTime: number | undefined;

    for (const candle of subsequentCandles) {
      if (candle.close > high) {
        isBroken = true;
        breakDirection = 'up';
        breakTime = candle.timestamp;
        break;
      }
      if (candle.close < low) {
        isBroken = true;
        breakDirection = 'down';
        breakTime = candle.timestamp;
        break;
      }
    }

    return {
      high,
      low,
      range,
      rangePercent,
      volume,
      timestamp: openingCandles[0]?.timestamp ?? Date.now(),
      minutes,
      isBroken,
      breakDirection,
      breakTime,
    };
  }
}