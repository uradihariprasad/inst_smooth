/**
 * Risk Intelligence Module
 * Rejects trades with poor risk characteristics
 * Pure, independently testable service
 */

import type { FeatureSet, RiskOutput } from '../../../shared/types/analysis';
import type { Quote, OptionChain } from '../../../shared/types/market';

export class RiskIntelligenceModule {
  analyze(
    features: FeatureSet,
    quote: Quote,
    optionChain: OptionChain | null
  ): RiskOutput {
    const evidence: string[] = [];
    const metadata: Record<string, number | string | boolean> = {};
    const rejectionReasons: string[] = [];

    // Assess all risk factors
    const liquidityScore = this.assessLiquidity(features, quote, evidence, rejectionReasons, metadata);
    const spreadQuality = this.assessSpreadQuality(quote, evidence, rejectionReasons, metadata);
    const trendConfidence = this.assessTrendConfidence(features, evidence, rejectionReasons, metadata);
    const momentumConfidence = this.assessMomentumConfidence(features, evidence, rejectionReasons, metadata);
    const optionConfirmation = this.assessOptionConfirmation(optionChain, features, evidence, metadata);
    const volatilityRisk = this.assessVolatilityRisk(features, evidence, rejectionReasons, metadata);
    const nearbyResistance = this.assessNearbyResistance(features, evidence, metadata);
    const rewardRiskRatio = features.rewardRiskEstimation;
    const falseBreakoutRisk = this.assessFalseBreakoutRisk(features, evidence, metadata);

    // Add reward/risk evidence
    if (rewardRiskRatio > 2) {
      evidence.push(`Favorable reward/risk ratio (${rewardRiskRatio.toFixed(2)})`);
    } else if (rewardRiskRatio < 1) {
      evidence.push(`Poor reward/risk ratio (${rewardRiskRatio.toFixed(2)})`);
      rejectionReasons.push('Poor reward/risk ratio');
    }

    metadata.rewardRiskRatio = rewardRiskRatio;
    metadata.rejectionCount = rejectionReasons.length;

    // Calculate score
    const score = this.calculateScore(
      liquidityScore,
      spreadQuality,
      trendConfidence,
      momentumConfidence,
      optionConfirmation,
      volatilityRisk,
      nearbyResistance,
      rewardRiskRatio,
      falseBreakoutRisk
    );

    const confidence = this.calculateConfidence(features, evidence);

    return {
      score,
      confidence,
      reason: this.generateReason(rejectionReasons, score),
      evidence,
      metadata,
      liquidityScore,
      spreadQuality,
      trendConfidence,
      momentumConfidence,
      optionConfirmation,
      volatilityRisk,
      nearbyResistance,
      rewardRiskRatio,
      falseBreakoutRisk,
      rejectionReasons,
    };
  }

  private assessLiquidity(
    features: FeatureSet,
    quote: Quote,
    evidence: string[],
    rejectionReasons: string[],
    metadata: Record<string, number | string | boolean>
  ): number {
    const score = features.liquidityScore;

    if (score < 30) {
      evidence.push(`Very low liquidity score (${score}) - high risk`);
      rejectionReasons.push('Insufficient liquidity');
    } else if (score < 50) {
      evidence.push(`Low liquidity score (${score}) - elevated risk`);
    } else if (score > 70) {
      evidence.push(`Good liquidity score (${score})`);
    }

    // Volume check
    if (quote.volume < 10000) {
      rejectionReasons.push('Very low trading volume');
    }

    metadata.liquidityScore = score;
    return score;
  }

  private assessSpreadQuality(
    quote: Quote,
    evidence: string[],
    rejectionReasons: string[],
    metadata: Record<string, number | string | boolean>
  ): number {
    const spreadPercent = quote.spreadPercent;
    let score = 100 - spreadPercent * 100;

    if (spreadPercent > 0.5) {
      score = 20;
      evidence.push(`Very wide spread (${spreadPercent.toFixed(3)}%) - high execution risk`);
      rejectionReasons.push('Wide bid-ask spread');
    } else if (spreadPercent > 0.2) {
      score = 50;
      evidence.push(`Moderate spread (${spreadPercent.toFixed(3)}%)`);
    } else if (spreadPercent < 0.05) {
      score = 90;
      evidence.push(`Tight spread (${spreadPercent.toFixed(3)}%) - good execution`);
    }

    metadata.spreadPercent = spreadPercent;
    return Math.max(0, Math.min(100, score));
  }

  private assessTrendConfidence(
    features: FeatureSet,
    evidence: string[],
    rejectionReasons: string[],
    metadata: Record<string, number | string | boolean>
  ): number {
    let score = 50;

    // Swing structure clarity
    if (features.swingStructure === 'uptrend' || features.swingStructure === 'downtrend') {
      score += 20;
      evidence.push(`Clear swing structure (${features.swingStructure})`);
    } else if (features.swingStructure === 'sideways') {
      score -= 10;
      evidence.push('Sideways swing structure - trend unclear');
    } else if (features.swingStructure === 'expanding' || features.swingStructure === 'contracting') {
      score -= 5;
      evidence.push(`${features.swingStructure} swing structure - trend uncertain`);
    }

    // Trend persistence
    if (features.trendPersistence > 60) {
      score += 15;
    } else if (features.trendPersistence < 30) {
      score -= 15;
      rejectionReasons.push('Weak trend persistence');
    }

    // EMA alignment
    if (features.ema9 > features.ema21 && features.ema21 > features.ema50) {
      score += 10;
    } else if (features.ema9 < features.ema21 && features.ema21 < features.ema50) {
      score += 10;
    } else {
      score -= 5;
      evidence.push('EMA alignment mixed - trend uncertain');
    }

    metadata.trendConfidence = score;
    return Math.max(0, Math.min(100, score));
  }

  private assessMomentumConfidence(
    features: FeatureSet,
    evidence: string[],
    rejectionReasons: string[],
    metadata: Record<string, number | string | boolean>
  ): number {
    let score = 50;

    // RSI
    if (features.rsi > 70) {
      score -= 10;
      evidence.push(`RSI overbought (${features.rsi.toFixed(1)}) - momentum risk`);
    } else if (features.rsi < 30) {
      score -= 10;
      evidence.push(`RSI oversold (${features.rsi.toFixed(1)}) - momentum risk`);
    }

    // Momentum persistence
    if (features.momentumPersistence > 60) {
      score += 15;
    } else if (features.momentumPersistence < 40) {
      score -= 15;
      rejectionReasons.push('Weak momentum persistence');
    }

    // Price acceleration
    if (Math.abs(features.priceAcceleration) > 2) {
      score -= 10;
      evidence.push('Extreme price acceleration - potential reversal risk');
    }

    // Range expansion
    if (features.rangeExpansion > 2.5) {
      score -= 10;
      evidence.push('Excessive range expansion - potential exhaustion');
    }

    metadata.momentumConfidence = score;
    return Math.max(0, Math.min(100, score));
  }

  private assessOptionConfirmation(
    optionChain: OptionChain | null,
    features: FeatureSet,
    evidence: string[],
    metadata: Record<string, number | string | boolean>
  ): number {
    if (!optionChain) {
      evidence.push('Option chain unavailable - cannot confirm via options');
      return 50;
    }

    let score = 50;

    // PCR alignment
    if (features.vwapDistance > 0 && optionChain.pcr > 1) {
      score += 15;
      evidence.push('PCR supports bullish bias');
    } else if (features.vwapDistance < 0 && optionChain.pcr < 1) {
      score += 15;
      evidence.push('PCR supports bearish bias');
    }

    // ATM activity
    const atmCall = optionChain.calls.find((c) => c.strike === optionChain.atmStrike);
    const atmPut = optionChain.puts.find((p) => p.strike === optionChain.atmStrike);
    if (atmCall && atmPut) {
      const totalOI = atmCall.openInterest + atmPut.openInterest;
      if (totalOI > 100000) {
        score += 10;
        evidence.push('High ATM OI - strong option confirmation');
      }
    }

    metadata.optionConfirmation = score;
    return Math.max(0, Math.min(100, score));
  }

  private assessVolatilityRisk(
    features: FeatureSet,
    evidence: string[],
    rejectionReasons: string[],
    metadata: Record<string, number | string | boolean>
  ): number {
    let riskScore = 0;

    // ATR percent
    if (features.atrPercent > 3) {
      riskScore += 40;
      evidence.push(`High intraday volatility (${features.atrPercent.toFixed(2)}%) - elevated risk`);
    } else if (features.atrPercent > 2) {
      riskScore += 25;
      evidence.push(`Moderate intraday volatility (${features.atrPercent.toFixed(2)}%)`);
    } else {
      riskScore += 10;
    }

    // Volatility expansion
    if (features.volatilityExpansion > 2) {
      riskScore += 30;
      evidence.push(`Volatility expanding rapidly (${features.volatilityExpansion.toFixed(2)}x)`);
    } else if (features.volatilityExpansion > 1.5) {
      riskScore += 15;
    }

    // Gap
    if (Math.abs(features.gapPercent) > 2) {
      riskScore += 20;
      evidence.push(`Large gap (${features.gapPercent.toFixed(2)}%) - gap fill risk`);
    }

    if (riskScore > 60) {
      rejectionReasons.push('High volatility risk');
    }

    metadata.volatilityRisk = riskScore;
    return Math.max(0, Math.min(100, riskScore));
  }

  private assessNearbyResistance(
    features: FeatureSet,
    evidence: string[],
    metadata: Record<string, number | string | boolean>
  ): boolean {
    const nearbyResistance = features.resistanceZones.some((z) => z.distance < 0.5);
    if (nearbyResistance) {
      evidence.push('Price near resistance zone - limited upside potential');
    }
    metadata.nearbyResistance = nearbyResistance;
    return nearbyResistance;
  }

  private assessFalseBreakoutRisk(
    features: FeatureSet,
    evidence: string[],
    metadata: Record<string, number | string | boolean>
  ): number {
    let risk = 0;

    // Breakout without volume
    if (features.breakoutPercent > 0 && features.relativeVolume < 1.2) {
      risk += 40;
      evidence.push('Breakout without volume confirmation - false breakout risk');
    }

    // Breakdown without volume
    if (features.breakdownPercent > 0 && features.relativeVolume < 1.2) {
      risk += 40;
      evidence.push('Breakdown without volume confirmation - false breakdown risk');
    }

    // Breakout with high RSI
    if (features.breakoutPercent > 0 && features.rsi > 70) {
      risk += 20;
      evidence.push('Breakout at overbought RSI - pullback risk');
    }

    // Breakdown with low RSI
    if (features.breakdownPercent > 0 && features.rsi < 30) {
      risk += 20;
      evidence.push('Breakdown at oversold RSI - bounce risk');
    }

    // Weak trend during breakout
    if ((features.breakoutPercent > 0 || features.breakdownPercent > 0) && features.trendPersistence < 40) {
      risk += 20;
      evidence.push('Breakout/breakdown with weak trend - false signal risk');
    }

    metadata.falseBreakoutRisk = risk;
    return Math.min(100, risk);
  }

  private calculateScore(
    liquidityScore: number,
    spreadQuality: number,
    trendConfidence: number,
    momentumConfidence: number,
    optionConfirmation: number,
    volatilityRisk: number,
    nearbyResistance: boolean,
    rewardRiskRatio: number,
    falseBreakoutRisk: number
  ): number {
    // Higher score = lower risk = better
    let score = 50;

    // Liquidity contribution
    score += (liquidityScore - 50) * 0.2;

    // Spread quality
    score += (spreadQuality - 50) * 0.15;

    // Trend confidence
    score += (trendConfidence - 50) * 0.15;

    // Momentum confidence
    score += (momentumConfidence - 50) * 0.15;

    // Option confirmation
    score += (optionConfirmation - 50) * 0.1;

    // Volatility risk (inverted - lower risk is better)
    score -= (volatilityRisk - 30) * 0.15;

    // Nearby resistance penalty
    if (nearbyResistance) score -= 5;

    // Reward/risk contribution
    if (rewardRiskRatio > 2) score += 10;
    else if (rewardRiskRatio < 1) score -= 10;

    // False breakout risk
    score -= falseBreakoutRisk * 0.1;

    return Math.max(0, Math.min(100, score));
  }

  private calculateConfidence(features: FeatureSet, evidence: string[]): number {
    let confidence = 50;

    confidence += Math.min(evidence.length * 2, 20);

    if (features.liquidityScore > 0) confidence += 5;
    if (features.spreadAnalysis >= 0) confidence += 5;

    return Math.max(0, Math.min(90, confidence));
  }

  private generateReason(rejectionReasons: string[], score: number): string {
    if (rejectionReasons.length === 0) {
      return `Risk assessment favorable. Overall risk score: ${score.toFixed(0)}/100.`;
    }

    return `Risk assessment identified ${rejectionReasons.length} concern(s): ${rejectionReasons.join('; ')}. ` +
      `Overall risk score: ${score.toFixed(0)}/100. Exercise caution.`;
  }
}