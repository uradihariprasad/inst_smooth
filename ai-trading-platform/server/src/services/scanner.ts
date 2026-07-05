/**
 * Market Scanner Service
 * Orchestrates continuous scanning of all NSE F&O stocks
 * Coordinates data collection, feature engineering, analysis, and ranking
 */

import { EventEmitter } from 'events';
import { UpstoxApiService } from './upstox-api';
import { FeatureEngineeringService } from './feature-engineering';
import { DecisionEngine, type DecisionWeights } from './decision-engine';
import { RankingEngine, type RankingCriteria } from './ranking-engine';
import type {
  FnoInstrument,
  Quote,
  OptionChain,
  IndexData,
  MarketBreadth,
  SectorPerformance,
} from '../../shared/types/market';
import type {
  DecisionOutput,
  RankedOpportunity,
  ScanProgress,
  MarketScanResult,
} from '../../shared/types/analysis';
import { NIFTY_KEY, BANKNIFTY_KEY, INDIA_VIX_KEY } from '../config/upstox';

interface CollectedQuote {
  instrumentKey: string;
  symbol: string;
  sector: string;
  changePercent: number;
  volume: number;
}

export class MarketScanner extends EventEmitter {
  private upstoxApi: UpstoxApiService;
  private featureEngineering: FeatureEngineeringService;
  private decisionEngine: DecisionEngine;
  private rankingEngine: RankingEngine;

  private instruments: FnoInstrument[] = [];
  private scanProgress: ScanProgress;
  private isScanning = false;
  private scanInterval: ReturnType<typeof setInterval> | null = null;
  private lastResults: MarketScanResult | null = null;

  constructor() {
    super();
    this.upstoxApi = new UpstoxApiService();
    this.featureEngineering = new FeatureEngineeringService();
    this.decisionEngine = new DecisionEngine();
    this.rankingEngine = new RankingEngine();

    this.scanProgress = {
      total: 0,
      processed: 0,
      analyzed: 0,
      rejected: 0,
      ranked: 0,
      phase: 'collecting',
      currentSymbol: '',
      errors: [],
      startTime: 0,
      estimatedCompletion: 0,
    };
  }

  setAccessToken(token: string): void {
    this.upstoxApi.setAccessToken(token);
  }

  clearAccessToken(): void {
    this.upstoxApi.clearAccessToken();
  }

  isAuthenticated(): boolean {
    return this.upstoxApi.isAuthenticated();
  }

  updateDecisionWeights(weights: Partial<DecisionWeights>): void {
    this.decisionEngine.updateWeights(weights);
  }

  updateRankingCriteria(criteria: Partial<RankingCriteria>): void {
    this.rankingEngine.updateCriteria(criteria);
  }

  getDecisionWeights(): DecisionWeights {
    return this.decisionEngine.getWeights();
  }

  getRankingCriteria(): RankingCriteria {
    return this.rankingEngine.getCriteria();
  }

  async startScanning(intervalMs: number = 30000): Promise<void> {
    if (this.isScanning) return;
    this.isScanning = true;
    await this.loadInstruments();
    await this.runScan();
    this.scanInterval = setInterval(async () => {
      if (this.isScanning) {
        await this.runScan();
      }
    }, intervalMs);
    this.emit('scan_started');
  }

  stopScanning(): void {
    this.isScanning = false;
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    this.emit('scan_stopped');
  }

  async runScan(): Promise<MarketScanResult> {
    this.scanProgress = {
      total: this.instruments.length,
      processed: 0,
      analyzed: 0,
      rejected: 0,
      ranked: 0,
      phase: 'collecting',
      currentSymbol: '',
      errors: [],
      startTime: Date.now(),
      estimatedCompletion: 0,
    };

    this.emit('progress', this.scanProgress);

    try {
      // Phase 1: Collect market indices
      this.scanProgress.phase = 'collecting';
      this.emit('progress', this.scanProgress);

      const { nifty, bankNifty, indiaVix } = await this.collectIndices();

      // Phase 2: Process each instrument and collect all quotes for breadth
      this.scanProgress.phase = 'processing';
      this.emit('progress', this.scanProgress);

      const decisions: DecisionOutput[] = [];
      const allCollectedQuotes: CollectedQuote[] = [];
      const batchSize = 5;

      for (let i = 0; i < this.instruments.length; i += batchSize) {
        if (!this.isScanning) break;

        const batch = this.instruments.slice(i, i + batchSize);
        const batchResults = await this.processBatch(batch, {
          nifty,
          bankNifty,
          indiaVix,
          breadth: null,
          sectorMap: new Map(),
        });

        decisions.push(...batchResults.decisions);
        allCollectedQuotes.push(...batchResults.collectedQuotes);
        this.scanProgress.processed += batch.length;
        this.scanProgress.analyzed += batchResults.analyzed;
        this.scanProgress.rejected += batchResults.rejected;

        // Update estimated completion
        const elapsed = Date.now() - this.scanProgress.startTime;
        const rate = elapsed > 0 ? this.scanProgress.processed / elapsed : 0;
        const remaining = this.instruments.length - this.scanProgress.processed;
        this.scanProgress.estimatedCompletion = rate > 0 ? Date.now() + remaining / rate : Date.now();

        this.emit('progress', this.scanProgress);

        // Small delay to avoid overwhelming the API
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Phase 3: Compute Market Breadth from all scanned quotes
      const breadth = this.computeMarketBreadth(allCollectedQuotes);

      // Phase 4: Compute Sector Performance from all scanned quotes
      const sectorMap = this.computeSectorPerformance(allCollectedQuotes);

      // Phase 5: Re-run decision engine with computed breadth and sector data
      // (This ensures breadth/sector data contributes to final scores)
      const enrichedDecisions = decisions.map((decision) => {
        const collectedQuote = allCollectedQuotes.find(
          (q) => q.instrumentKey === decision.instrumentKey
        );
        const sectorPerf = collectedQuote
          ? sectorMap.get(collectedQuote.sector) ?? null
          : null;

        // Re-score with market context if breadth/sector data is available
        if (breadth && sectorPerf) {
          const contextModule = decision.moduleScores.marketContext;
          const contextScore = this.recalculateContextScore(
            contextModule,
            breadth,
            sectorPerf
          );
          return {
            ...decision,
            overallScore: this.recalculateOverallScore(decision, contextScore),
          };
        }
        return decision;
      });

      // Phase 6: Rank
      this.scanProgress.phase = 'ranking';
      this.emit('progress', this.scanProgress);

      const opportunities = this.rankingEngine.rank(enrichedDecisions);
      this.scanProgress.ranked = opportunities.length;

      // Phase 7: Complete
      this.scanProgress.phase = 'complete';
      this.emit('progress', this.scanProgress);

      const result: MarketScanResult = {
        opportunities,
        scanProgress: { ...this.scanProgress },
        marketContext: {
          nifty: nifty?.ltp ?? 0,
          niftyChange: nifty?.changePercent ?? 0,
          bankNifty: bankNifty?.ltp ?? 0,
          bankNiftyChange: bankNifty?.changePercent ?? 0,
          indiaVix: indiaVix?.ltp ?? 0,
          marketBreadth: {
            advancers: breadth.advancers,
            decliners: breadth.decliners,
            unchanged: breadth.unchanged,
          },
        },
        timestamp: Date.now(),
      };

      this.lastResults = result;
      this.emit('scan_complete', result);

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.scanProgress.errors.push(errorMessage);
      this.emit('error', errorMessage);
      throw error;
    }
  }

  /**
   * Compute Market Breadth from all scanned stock quotes
   * Counts advancers, decliners, and unchanged based on live changePercent
   */
  private computeMarketBreadth(quotes: CollectedQuote[]): MarketBreadth {
    let advancers = 0;
    let decliners = 0;
    let unchanged = 0;

    for (const quote of quotes) {
      if (quote.changePercent > 0.05) {
        advancers++;
      } else if (quote.changePercent < -0.05) {
        decliners++;
      } else {
        unchanged++;
      }
    }

    const total = advancers + decliners + unchanged;
    const advanceDeclineRatio = decliners > 0 ? advancers / decliners : advancers > 0 ? 2 : 1;
    const breadthStrength = total > 0
      ? ((advancers - decliners) / total) * 50 + 50
      : 50;

    return {
      advancers,
      decliners,
      unchanged,
      newHighs: 0, // Would need historical high/low data per instrument
      newLows: 0,
      advanceDeclineRatio,
      breadthStrength: Math.max(0, Math.min(100, breadthStrength)),
      timestamp: Date.now(),
    };
  }

  /**
   * Compute Sector Performance from all scanned stock quotes
   * Groups stocks by sector and calculates sector-level statistics
   */
  private computeSectorPerformance(quotes: CollectedQuote[]): Map<string, SectorPerformance> {
    const sectorMap = new Map<string, CollectedQuote[]>();

    // Group quotes by sector
    for (const quote of quotes) {
      const sector = quote.sector || 'Unknown';
      if (!sectorMap.has(sector)) {
        sectorMap.set(sector, []);
      }
      sectorMap.get(sector)!.push(quote);
    }

    const result = new Map<string, SectorPerformance>();

    for (const [sector, sectorQuotes] of sectorMap) {
      if (sectorQuotes.length === 0) continue;

      const totalChange = sectorQuotes.reduce((sum, q) => sum + q.changePercent, 0);
      const averageChange = totalChange / sectorQuotes.length;

      const advancers = sectorQuotes.filter((q) => q.changePercent > 0.05).length;
      const decliners = sectorQuotes.filter((q) => q.changePercent < -0.05).length;
      const unchangedCount = sectorQuotes.length - advancers - decliners;

      const averageVolume = sectorQuotes.reduce((sum, q) => sum + q.volume, 0) / sectorQuotes.length;

      // Top gainers and losers
      const sorted = [...sectorQuotes].sort((a, b) => b.changePercent - a.changePercent);
      const topGainers = sorted.slice(0, 3).map((q) => q.symbol);
      const topLosers = sorted.slice(-3).reverse().map((q) => q.symbol);

      // Relative strength vs market average
      const marketAverage = quotes.reduce((sum, q) => sum + q.changePercent, 0) / quotes.length;
      const relativeStrength = averageChange - marketAverage;

      result.set(sector, {
        sector,
        changePercent: averageChange,
        advancers,
        decliners,
        unchanged: unchangedCount,
        topGainers,
        topLosers,
        averageVolume,
        relativeStrength,
      });
    }

    return result;
  }

  /**
   * Recalculate market context score with real breadth/sector data
   */
  private recalculateContextScore(
    contextModule: { score: number; confidence: number; evidence: string[] },
    breadth: MarketBreadth,
    sectorPerf: SectorPerformance
  ): number {
    let score = contextModule.score;

    // Breadth contribution
    if (breadth.advanceDeclineRatio > 1.5) {
      score += 10;
    } else if (breadth.advanceDeclineRatio < 0.67) {
      score -= 10;
    }

    // Sector contribution
    if (sectorPerf.changePercent > 0.5) {
      score += 5;
    } else if (sectorPerf.changePercent < -0.5) {
      score -= 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Recalculate overall score with updated context
   */
  private recalculateOverallScore(decision: DecisionOutput, newContextScore: number): number {
    const weights = this.decisionEngine.getWeights();
    const scores = {
      trend: decision.moduleScores.trend.score,
      momentum: decision.moduleScores.momentum.score,
      institutional: decision.moduleScores.institutional.score,
      optionChain: decision.moduleScores.optionChain.score,
      priceStructure: decision.moduleScores.priceStructure.score,
      marketContext: newContextScore,
      risk: decision.moduleScores.risk.score,
    };

    return Math.max(0, Math.min(100,
      scores.trend * weights.trend +
      scores.momentum * weights.momentum +
      scores.institutional * weights.institutional +
      scores.optionChain * weights.optionChain +
      scores.priceStructure * weights.priceStructure +
      scores.marketContext * weights.marketContext +
      scores.risk * weights.risk
    ));
  }

  getLastResults(): MarketScanResult | null {
    return this.lastResults;
  }

  getScanProgress(): ScanProgress {
    return { ...this.scanProgress };
  }

  private async loadInstruments(): Promise<void> {
    try {
      this.instruments = await this.upstoxApi.getFnoInstruments();
      this.scanProgress.total = this.instruments.length;
      this.emit('instruments_loaded', this.instruments.length);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load instruments';
      this.scanProgress.errors.push(errorMessage);
      throw error;
    }
  }

  private async collectIndices(): Promise<{
    nifty: IndexData | null;
    bankNifty: IndexData | null;
    indiaVix: IndexData | null;
  }> {
    const indexKeys = [NIFTY_KEY, BANKNIFTY_KEY, INDIA_VIX_KEY];

    try {
      const indexData = await this.upstoxApi.getIndexData(indexKeys);
      return {
        nifty: indexData.get(NIFTY_KEY) ?? null,
        bankNifty: indexData.get(BANKNIFTY_KEY) ?? null,
        indiaVix: indexData.get(INDIA_VIX_KEY) ?? null,
      };
    } catch (error) {
      this.scanProgress.errors.push(`Index fetch error: ${error}`);
      return {
        nifty: null,
        bankNifty: null,
        indiaVix: null,
      };
    }
  }

  private async processBatch(
    instruments: FnoInstrument[],
    marketContext: {
      nifty: IndexData | null;
      bankNifty: IndexData | null;
      indiaVix: IndexData | null;
      breadth: MarketBreadth | null;
      sectorMap: Map<string, SectorPerformance>;
    }
  ): Promise<{
    decisions: DecisionOutput[];
    analyzed: number;
    rejected: number;
    collectedQuotes: CollectedQuote[];
  }> {
    const decisions: DecisionOutput[] = [];
    const collectedQuotes: CollectedQuote[] = [];
    let analyzed = 0;
    let rejected = 0;

    // Get quotes for batch
    const instrumentKeys = instruments.map((i) => i.instrumentKey);
    let quotes: Map<string, Quote>;

    try {
      quotes = await this.upstoxApi.getQuotes(instrumentKeys);
    } catch (error) {
      this.scanProgress.errors.push(`Quote fetch error: ${error}`);
      return { decisions: [], analyzed: 0, rejected: instruments.length, collectedQuotes: [] };
    }

    for (const instrument of instruments) {
      this.scanProgress.currentSymbol = instrument.symbol;
      this.emit('progress', this.scanProgress);

      const quote = quotes.get(instrument.instrumentKey);
      if (!quote) {
        rejected++;
        continue;
      }

      // Collect quote for breadth computation
      collectedQuotes.push({
        instrumentKey: instrument.instrumentKey,
        symbol: instrument.symbol,
        sector: instrument.sector,
        changePercent: quote.changePercent,
        volume: quote.volume,
      });

      // Quick pre-filter for liquidity
      if (quote.volume < 5000 || quote.spreadPercent > 1) {
        rejected++;
        continue;
      }

      try {
        const decision = await this.analyzeInstrument(
          instrument,
          quote,
          marketContext
        );

        if (decision) {
          decisions.push(decision);
          analyzed++;
        } else {
          rejected++;
        }
      } catch (error) {
        this.scanProgress.errors.push(`Analysis error for ${instrument.symbol}: ${error}`);
        rejected++;
      }
    }

    return { decisions, analyzed, rejected, collectedQuotes };
  }

  private async analyzeInstrument(
    instrument: FnoInstrument,
    quote: Quote,
    marketContext: {
      nifty: IndexData | null;
      bankNifty: IndexData | null;
      indiaVix: IndexData | null;
      breadth: MarketBreadth | null;
      sectorMap: Map<string, SectorPerformance>;
    }
  ): Promise<DecisionOutput | null> {
    try {
      // Get historical candles
      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const historicalCandles = await this.upstoxApi.getHistoricalCandles(
        instrument.instrumentKey,
        '1day',
        this.formatDate(thirtyDaysAgo),
        this.formatDate(today)
      );

      // Get intraday candles
      const intradayCandles = await this.upstoxApi.getIntraDayCandles(
        instrument.instrumentKey,
        '5minute'
      );

      // Get option chain for nearest expiry
      let optionChain: OptionChain | null = null;
      if (instrument.expiryDates.length > 0) {
        const nearestExpiry = this.getNearestExpiry(instrument.expiryDates);
        if (nearestExpiry) {
          optionChain = await this.upstoxApi.getOptionChain(
            instrument.instrumentKey,
            nearestExpiry
          );
        }
      }

      // Calculate previous day levels
      const previousDay = this.featureEngineering.calculatePreviousDayLevels(historicalCandles);

      // Calculate opening range
      const openingRange = this.featureEngineering.calculateOpeningRange(intradayCandles, 15);

      // Calculate features
      const features = this.featureEngineering.calculateFeatures(
        instrument.instrumentKey,
        instrument.symbol,
        quote,
        intradayCandles,
        historicalCandles,
        previousDay,
        openingRange,
        optionChain
      );

      // Get sector performance
      const sectorPerformance = marketContext.sectorMap.get(instrument.sector) ?? null;

      // Run decision engine
      const decision = this.decisionEngine.analyze(
        instrument.instrumentKey,
        instrument.symbol,
        features,
        quote,
        optionChain,
        marketContext.nifty,
        marketContext.bankNifty,
        marketContext.indiaVix,
        marketContext.breadth,
        sectorPerformance
      );

      return decision;
    } catch (error) {
      this.scanProgress.errors.push(`Instrument analysis error: ${error}`);
      return null;
    }
  }

  private getNearestExpiry(expiryDates: string[]): string | null {
    const today = new Date();
    const futureExpiries = expiryDates
      .filter((date) => new Date(date) >= today)
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    return futureExpiries[0] ?? null;
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0] ?? '';
  }
}