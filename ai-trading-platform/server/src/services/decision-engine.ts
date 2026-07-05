/**
 * Decision Engine
 * Core brain that combines all intelligence module outputs
 * Uses configurable weighted scoring
 * Never issues recommendations without supporting evidence
 */

import type { FeatureSet, DecisionOutput } from '../../shared/types/analysis';
import type { Quote, OptionChain, IndexData, MarketBreadth, SectorPerformance } from '../../shared/types/market';
import { TrendIntelligenceModule } from './intelligence/trend-intelligence';
import { MomentumIntelligenceModule } from './intelligence/momentum-intelligence';
import { InstitutionalIntelligenceModule } from './intelligence/institutional-intelligence';
import { OptionChainIntelligenceModule } from './intelligence/option-chain-intelligence';
import { PriceStructureIntelligenceModule } from './intelligence/price-structure-intelligence';
import { MarketContextIntelligenceModule } from './intelligence/market-context-intelligence';
import { RiskIntelligenceModule } from './intelligence/risk-intelligence';

export interface DecisionWeights {
  trend: number;
  momentum: number;
  institutional: number;
  optionChain: number;
  priceStructure: number;
  marketContext: number;
  risk: number;
}

const DEFAULT_WEIGHTS: DecisionWeights = {
  trend: 0.2,
  momentum: 0.2,
  institutional: 0.15,
  optionChain: 0.15,
  priceStructure: 0.1,
  marketContext: 0.1,
  risk: 0.1,
};

export class DecisionEngine {
  private trendModule: TrendIntelligenceModule;
  private momentumModule: MomentumIntelligenceModule;
  private institutionalModule: InstitutionalIntelligenceModule;
  private optionChainModule: OptionChainIntelligenceModule;
  private priceStructureModule: PriceStructureIntelligenceModule;
  private marketContextModule: MarketContextIntelligenceModule;
  private riskModule: RiskIntelligenceModule;
  private weights: DecisionWeights;

  constructor(weights: DecisionWeights = DEFAULT_WEIGHTS) {
    this.trendModule = new TrendIntelligenceModule();
    this.momentumModule = new MomentumIntelligenceModule();
    this.institutionalModule = new InstitutionalIntelligenceModule();
    this.optionChainModule = new OptionChainIntelligenceModule();
    this.priceStructureModule = new PriceStructureIntelligenceModule();
    this.marketContextModule = new MarketContextIntelligenceModule();
    this.riskModule = new RiskIntelligenceModule();
    this.weights = weights;
  }

  updateWeights(weights: Partial<DecisionWeights>): void {
    this.weights = { ...this.weights, ...weights };
  }

  getWeights(): DecisionWeights {
    return { ...this.weights };
  }

  analyze(
    instrumentKey: string,
    symbol: string,
    features: FeatureSet,
    quote: Quote,
    optionChain: OptionChain | null,
    nifty: IndexData | null,
    bankNifty: IndexData | null,
    indiaVix: IndexData | null,
    marketBreadth: MarketBreadth | null,
    sectorPerformance: SectorPerformance | null
  ): DecisionOutput {
    // Run all intelligence modules
    const trendOutput = this.trendModule.analyze(features);
    const momentumOutput = this.momentumModule.analyze(features);
    const institutionalOutput = this.institutionalModule.analyze(features, quote, optionChain);
    const optionChainOutput = this.optionChainModule.analyze(features, optionChain);
    const priceStructureOutput = this.priceStructureModule.analyze(features);
    const marketContextOutput = this.marketContextModule.analyze(
      nifty,
      bankNifty,
      indiaVix,
      marketBreadth,
      sectorPerformance,
      'Unknown' // Sector would come from instrument data
    );
    const riskOutput = this.riskModule.analyze(features, quote, optionChain);

    // Calculate weighted overall score
    const overallScore = this.calculateOverallScore(
      trendOutput.score,
      momentumOutput.score,
      institutionalOutput.score,
      optionChainOutput.score,
      priceStructureOutput.score,
      marketContextOutput.score,
      riskOutput.score
    );

    // Calculate confidence
    const confidenceScore = this.calculateConfidence(
      trendOutput.confidence,
      momentumOutput.confidence,
      institutionalOutput.confidence,
      optionChainOutput.confidence,
      priceStructureOutput.confidence,
      marketContextOutput.confidence,
      riskOutput.confidence
    );

    // Determine trade bias
    const tradeBias = this.determineTradeBias(
      trendOutput,
      momentumOutput,
      institutionalOutput,
      optionChainOutput,
      priceStructureOutput,
      features
    );

    // Determine risk level
    const riskLevel = this.determineRiskLevel(riskOutput, features);

    // Calculate entry, stop, and targets
    const suggestedEntryZone = this.calculateEntryZone(features, quote);
    const suggestedStopLoss = this.calculateStopLoss(features, quote, tradeBias);
    const suggestedTargets = this.calculateTargets(features, quote, tradeBias);

    // Generate invalidation conditions
    const invalidationConditions = this.generateInvalidationConditions(
      tradeBias,
      features,
      trendOutput,
      momentumOutput,
      riskOutput
    );

    // Generate evidence summary
    const evidenceSummary = this.generateEvidenceSummary(
      trendOutput,
      momentumOutput,
      institutionalOutput,
      optionChainOutput,
      priceStructureOutput,
      marketContextOutput,
      riskOutput
    );

    return {
      instrumentKey,
      symbol,
      overallScore,
      confidenceScore,
      tradeBias,
      riskLevel,
      suggestedEntryZone,
      suggestedStopLoss,
      suggestedTargets,
      invalidationConditions,
      evidenceSummary,
      moduleScores: {
        trend: trendOutput,
        momentum: momentumOutput,
        institutional: institutionalOutput,
        optionChain: optionChainOutput,
        priceStructure: priceStructureOutput,
        marketContext: marketContextOutput,
        risk: riskOutput,
      },
      timestamp: Date.now(),
    };
  }

  private calculateOverallScore(
    trend: number,
    momentum: number,
    institutional: number,
    optionChain: number,
    priceStructure: number,
    marketContext: number,
    risk: number
  ): number {
    const weightedScore =
      trend * this.weights.trend +
      momentum * this.weights.momentum +
      institutional * this.weights.institutional +
      optionChain * this.weights.optionChain +
      priceStructure * this.weights.priceStructure +
      marketContext * this.weights.marketContext +
      risk * this.weights.risk;

    return Math.max(0, Math.min(100, weightedScore));
  }

  private calculateConfidence(
    trend: number,
    momentum: number,
    institutional: number,
    optionChain: number,
    priceStructure: number,
    marketContext: number,
    risk: number
  ): number {
    const confidences = [trend, momentum, institutional, optionChain, priceStructure, marketContext, risk];
    const avgConfidence = confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
    
    // Penalize if any module has very low confidence
    const minConfidence = Math.min(...confidences);
    const penalty = minConfidence < 30 ? (30 - minConfidence) * 0.5 : 0;

    return Math.max(0, Math.min(100, avgConfidence - penalty));
  }

  private determineTradeBias(
    trendOutput: { direction: string; score: number },
    momentumOutput: { momentumStrength: number; score: number },
    institutionalOutput: { estimatedParticipation: number; repeatedBuying: number; repeatedSelling: number },
    optionChainOutput: { pcr: number; score: number },
    priceStructureOutput: { breakoutPercent: number; breakdownPercent: number },
    features: FeatureSet
  ): 'bullish' | 'bearish' | 'neutral' {
    let bullishScore = 0;
    let bearishScore = 0;

    // Trend direction
    if (trendOutput.direction === 'uptrend') bullishScore += 2;
    else if (trendOutput.direction === 'downtrend') bearishScore += 2;

    // Momentum
    if (momentumOutput.momentumStrength > 20) bullishScore += 1;
    else if (momentumOutput.momentumStrength < -20) bearishScore += 1;

    // Institutional
    if (institutionalOutput.repeatedBuying > institutionalOutput.repeatedSelling) {
      bullishScore += 1;
    } else if (institutionalOutput.repeatedSelling > institutionalOutput.repeatedBuying) {
      bearishScore += 1;
    }

    // Options
    if (optionChainOutput.pcr > 1.2) bullishScore += 1;
    else if (optionChainOutput.pcr < 0.8) bearishScore += 1;

    // Price structure
    if (priceStructureOutput.breakoutPercent > 0) bullishScore += 1;
    if (priceStructureOutput.breakdownPercent > 0) bearishScore += 1;

    // VWAP
    if (features.vwapDistance > 0.5) bullishScore += 1;
    else if (features.vwapDistance < -0.5) bearishScore += 1;

    const netScore = bullishScore - bearishScore;
    if (netScore >= 2) return 'bullish';
    if (netScore <= -2) return 'bearish';
    return 'neutral';
  }

  private determineRiskLevel(
    riskOutput: { score: number; rejectionReasons: string[] },
    features: FeatureSet
  ): 'low' | 'medium' | 'high' | 'extreme' {
    let riskScore = 0;

    // Risk module score (inverted - lower score = higher risk)
    riskScore += (100 - riskOutput.score) * 0.4;

    // Rejection reasons
    riskScore += riskOutput.rejectionReasons.length * 10;

    // Volatility
    if (features.atrPercent > 3) riskScore += 20;
    else if (features.atrPercent > 2) riskScore += 10;

    // Liquidity
    if (features.liquidityScore < 30) riskScore += 20;
    else if (features.liquidityScore < 50) riskScore += 10;

    // Spread
    if (features.spreadAnalysis > 0.5) riskScore += 15;

    if (riskScore > 70) return 'extreme';
    if (riskScore > 50) return 'high';
    if (riskScore > 30) return 'medium';
    return 'low';
  }

  private calculateEntryZone(
    features: FeatureSet,
    quote: Quote
  ): [number, number] {
    const ltp = quote.ltp;
    const atr = features.atr;

    // Entry zone around current price with ATR-based buffer
    const buffer = atr * 0.2;
    return [ltp - buffer, ltp + buffer];
  }

  private calculateStopLoss(
    features: FeatureSet,
    quote: Quote,
    tradeBias: 'bullish' | 'bearish' | 'neutral'
  ): number {
    const ltp = quote.ltp;
    const atr = features.atr;

    if (tradeBias === 'bullish') {
      // Stop below recent support or ATR-based
      const nearestSupport = features.supportZones[0]?.level;
      if (nearestSupport && nearestSupport < ltp) {
        return nearestSupport - atr * 0.2;
      }
      return ltp - atr * 1.5;
    }

    if (tradeBias === 'bearish') {
      // Stop above recent resistance or ATR-based
      const nearestResistance = features.resistanceZones[0]?.level;
      if (nearestResistance && nearestResistance > ltp) {
        return nearestResistance + atr * 0.2;
      }
      return ltp + atr * 1.5;
    }

    return ltp;
  }

  private calculateTargets(
    features: FeatureSet,
    quote: Quote,
    tradeBias: 'bullish' | 'bearish' | 'neutral'
  ): number[] {
    const ltp = quote.ltp;
    const atr = features.atr;
    const targets: number[] = [];

    if (tradeBias === 'bullish') {
      targets.push(ltp + atr * 1);   // T1
      targets.push(ltp + atr * 2);   // T2
      targets.push(ltp + atr * 3);   // T3

      // Add resistance-based targets
      for (const resistance of features.resistanceZones.slice(0, 2)) {
        if (resistance.level > ltp && !targets.includes(resistance.level)) {
          targets.push(resistance.level);
        }
      }
    }

    if (tradeBias === 'bearish') {
      targets.push(ltp - atr * 1);   // T1
      targets.push(ltp - atr * 2);   // T2
      targets.push(ltp - atr * 3);   // T3

      // Add support-based targets
      for (const support of features.supportZones.slice(0, 2)) {
        if (support.level < ltp && !targets.includes(support.level)) {
          targets.push(support.level);
        }
      }
    }

    return targets.sort((a, b) => {
      if (tradeBias === 'bullish') return a - b;
      return b - a;
    }).slice(0, 3);
  }

  private generateInvalidationConditions(
    tradeBias: 'bullish' | 'bearish' | 'neutral',
    features: FeatureSet,
    trendOutput: { direction: string },
    momentumOutput: { momentumStrength: number },
    riskOutput: { rejectionReasons: string[] }
  ): string[] {
    const conditions: string[] = [];

    if (tradeBias === 'bullish') {
      conditions.push('Price closes below VWAP with volume');
      if (features.supportZones.length > 0) {
        const support = features.supportZones[0];
        if (support) {
          conditions.push(`Price breaks below support at ${support.level.toFixed(2)}`);
        }
      }
      if (trendOutput.direction === 'uptrend') {
        conditions.push('Swing structure changes to lower highs and lower lows');
      }
    }

    if (tradeBias === 'bearish') {
      conditions.push('Price closes above VWAP with volume');
      if (features.resistanceZones.length > 0) {
        const resistance = features.resistanceZones[0];
        if (resistance) {
          conditions.push(`Price breaks above resistance at ${resistance.level.toFixed(2)}`);
        }
      }
      if (trendOutput.direction === 'downtrend') {
        conditions.push('Swing structure changes to higher highs and higher lows');
      }
    }

    if (tradeBias === 'neutral') {
      conditions.push('Wait for clear directional bias before taking a position');
    }

    // Common invalidation conditions
    conditions.push('Volume drops significantly below average');
    conditions.push('Spread widens beyond acceptable levels');

    // Add risk module rejections
    for (const reason of riskOutput.rejectionReasons.slice(0, 2)) {
      conditions.push(`Risk concern: ${reason}`);
    }

    return conditions;
  }

  private generateEvidenceSummary(
    trendOutput: { reason: string; evidence: string[] },
    momentumOutput: { reason: string; evidence: string[] },
    institutionalOutput: { reason: string; evidence: string[] },
    optionChainOutput: { reason: string; evidence: string[] },
    priceStructureOutput: { reason: string; evidence: string[] },
    marketContextOutput: { reason: string; evidence: string[] },
    riskOutput: { reason: string; evidence: string[] }
  ): string {
    const sections = [
      `TREND: ${trendOutput.reason}`,
      `MOMENTUM: ${momentumOutput.reason}`,
      `INSTITUTIONAL: ${institutionalOutput.reason}`,
      `OPTION CHAIN: ${optionChainOutput.reason}`,
      `PRICE STRUCTURE: ${priceStructureOutput.reason}`,
      `MARKET CONTEXT: ${marketContextOutput.reason}`,
      `RISK: ${riskOutput.reason}`,
    ];

    return sections.join('\n\n');
  }
}