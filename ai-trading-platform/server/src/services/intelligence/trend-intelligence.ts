/**
 * Trend Intelligence Module
 * Analyzes trend direction, strength, quality, persistence, and stage
 * Pure, independently testable service
 */

import type { FeatureSet, TrendOutput } from '../../../shared/types/analysis';
import type { TrendDirection, TrendStage, TrendStrength, TrendQuality } from '../../../shared/types/market';

export class TrendIntelligenceModule {
  analyze(features: FeatureSet): TrendOutput {
    const evidence: string[] = [];
    const metadata: Record<string, number | string | boolean> = {};

    // Determine trend direction
    const direction = this.determineDirection(features, evidence, metadata);
    
    // Determine trend strength
    const strength = this.determineStrength(features, evidence, metadata);
    
    // Determine trend quality
    const quality = this.determineQuality(features, evidence, metadata);
    
    // Determine trend stage
    const stage = this.determineStage(features, evidence, metadata);
    
    // Calculate persistence score
    const persistence = this.calculatePersistenceScore(features);
    
    // Calculate overall score and confidence
    const score = this.calculateScore(direction, strength, quality, persistence, features);
    const confidence = this.calculateConfidence(features, evidence);

    metadata.direction = direction;
    metadata.strength = strength;
    metadata.quality = quality;
    metadata.stage = stage;
    metadata.persistence = persistence;

    const reason = this.generateReason(direction, strength, quality, stage, features);

    return {
      score,
      confidence,
      reason,
      evidence,
      metadata,
      direction,
      strength,
      quality,
      stage,
      persistence,
      slope: features.maSlope,
      vwapDistance: features.vwapDistance,
      swingStructure: features.swingStructure,
      higherHighs: features.higherHighs,
      higherLows: features.higherLows,
      lowerHighs: features.lowerHighs,
      lowerLows: features.lowerLows,
    };
  }

  private determineDirection(
    features: FeatureSet,
    evidence: string[],
    metadata: Record<string, number | string | boolean>
  ): TrendDirection {
    let bullishSignals = 0;
    let bearishSignals = 0;

    // EMA alignment
    if (features.ema9 > features.ema21 && features.ema21 > features.ema50) {
      bullishSignals += 2;
      evidence.push('EMA alignment bullish (9 > 21 > 50)');
    } else if (features.ema9 < features.ema21 && features.ema21 < features.ema50) {
      bearishSignals += 2;
      evidence.push('EMA alignment bearish (9 < 21 < 50)');
    }

    // MA slope
    if (features.maSlope > 0.1) {
      bullishSignals += 1;
      evidence.push(`MA slope positive (${features.maSlope.toFixed(2)}%)`);
    } else if (features.maSlope < -0.1) {
      bearishSignals += 1;
      evidence.push(`MA slope negative (${features.maSlope.toFixed(2)}%)`);
    }

    // VWAP distance
    if (features.vwapDistance > 0.5) {
      bullishSignals += 1;
      evidence.push(`Price above VWAP (${features.vwapDistance.toFixed(2)}%)`);
    } else if (features.vwapDistance < -0.5) {
      bearishSignals += 1;
      evidence.push(`Price below VWAP (${features.vwapDistance.toFixed(2)}%)`);
    }

    // Swing structure
    if (features.swingStructure === 'uptrend') {
      bullishSignals += 2;
      evidence.push('Swing structure indicates uptrend');
    } else if (features.swingStructure === 'downtrend') {
      bearishSignals += 2;
      evidence.push('Swing structure indicates downtrend');
    }

    // Higher highs and higher lows
    if (features.higherHighs > features.lowerHighs && features.higherLows > features.lowerLows) {
      bullishSignals += 1;
      evidence.push(`More higher highs (${features.higherHighs}) and higher lows (${features.higherLows})`);
    } else if (features.lowerHighs > features.higherHighs && features.lowerLows > features.higherLows) {
      bearishSignals += 1;
      evidence.push(`More lower highs (${features.lowerHighs}) and lower lows (${features.lowerLows})`);
    }

    // RSI trend
    if (features.rsi > 55 && features.rsiSlope > 0) {
      bullishSignals += 1;
      evidence.push(`RSI bullish (${features.rsi.toFixed(1)}) with positive slope`);
    } else if (features.rsi < 45 && features.rsiSlope < 0) {
      bearishSignals += 1;
      evidence.push(`RSI bearish (${features.rsi.toFixed(1)}) with negative slope`);
    }

    metadata.bullishSignals = bullishSignals;
    metadata.bearishSignals = bearishSignals;

    const netSignal = bullishSignals - bearishSignals;
    if (netSignal >= 2) return 'uptrend';
    if (netSignal <= -2) return 'downtrend';
    return 'sideways';
  }

  private determineStrength(
    features: FeatureSet,
    evidence: string[],
    metadata: Record<string, number | string | boolean>
  ): TrendStrength {
    let strengthScore = 0;

    // Trend persistence
    if (features.trendPersistence > 70) {
      strengthScore += 2;
      evidence.push(`Strong trend persistence (${features.trendPersistence.toFixed(1)}%)`);
    } else if (features.trendPersistence > 50) {
      strengthScore += 1;
      evidence.push(`Moderate trend persistence (${features.trendPersistence.toFixed(1)}%)`);
    }

    // MA slope magnitude
    const absSlope = Math.abs(features.maSlope);
    if (absSlope > 0.5) {
      strengthScore += 2;
      evidence.push(`Strong MA slope (${features.maSlope.toFixed(2)}%)`);
    } else if (absSlope > 0.2) {
      strengthScore += 1;
      evidence.push(`Moderate MA slope (${features.maSlope.toFixed(2)}%)`);
    }

    // Swing count consistency
    const totalSwings = features.higherHighs + features.higherLows + features.lowerHighs + features.lowerLows;
    if (totalSwings >= 4) {
      const consistentSwings = Math.max(
        features.higherHighs + features.higherLows,
        features.lowerHighs + features.lowerLows
      );
      const consistency = consistentSwings / totalSwings;
      if (consistency > 0.7) {
        strengthScore += 2;
        evidence.push(`High swing consistency (${(consistency * 100).toFixed(0)}%)`);
      } else if (consistency > 0.5) {
        strengthScore += 1;
        evidence.push(`Moderate swing consistency (${(consistency * 100).toFixed(0)}%)`);
      }
    }

    // Momentum persistence
    if (features.momentumPersistence > 65) {
      strengthScore += 1;
      evidence.push(`Strong momentum persistence (${features.momentumPersistence.toFixed(1)}%)`);
    }

    metadata.strengthScore = strengthScore;

    if (strengthScore >= 5) return 'very_strong';
    if (strengthScore >= 3) return 'strong';
    if (strengthScore >= 1) return 'moderate';
    return 'weak';
  }

  private determineQuality(
    features: FeatureSet,
    evidence: string[],
    metadata: Record<string, number | string | boolean>
  ): TrendQuality {
    let qualityScore = 0;

    // Low volatility = cleaner trend
    if (features.volatilityExpansion < 1.2) {
      qualityScore += 2;
      evidence.push('Low volatility expansion - clean trend');
    } else if (features.volatilityExpansion > 2.0) {
      qualityScore -= 1;
      evidence.push('High volatility expansion - noisy trend');
    }

    // Bollinger width
    if (features.bollingerWidth > 0) {
      const normalizedWidth = features.bollingerPercent;
      if (normalizedWidth > 0.3 && normalizedWidth < 0.7) {
        qualityScore += 1;
        evidence.push('Price within Bollinger bands - orderly movement');
      }
    }

    // Spread quality
    if (features.spreadAnalysis < 0.1) {
      qualityScore += 1;
      evidence.push('Tight spread - quality price action');
    }

    // Range expansion
    if (features.rangeExpansion < 1.5) {
      qualityScore += 1;
      evidence.push('Controlled range expansion');
    } else if (features.rangeExpansion > 2.5) {
      qualityScore -= 1;
      evidence.push('Excessive range expansion - potential exhaustion');
    }

    metadata.qualityScore = qualityScore;

    if (qualityScore >= 3) return 'clean';
    if (qualityScore >= 1) return 'noisy';
    if (qualityScore <= -1) return 'parabolic';
    return 'choppy';
  }

  private determineStage(
    features: FeatureSet,
    evidence: string[],
    metadata: Record<string, number | string | boolean>
  ): TrendStage {
    // Check RSI extremes
    if (features.rsi > 75 || features.rsi < 25) {
      evidence.push(`RSI at extreme (${features.rsi.toFixed(1)}) - potential exhaustion`);
      return 'exhaustion';
    }

    // Check volatility expansion
    if (features.volatilityExpansion > 2.0) {
      evidence.push('High volatility - late stage trend');
      return 'late';
    }

    // Check momentum persistence
    if (features.momentumPersistence > 70 && features.trendPersistence > 60) {
      evidence.push('Strong momentum and persistence - middle stage');
      return 'middle';
    }

    // Check if trend is just starting
    if (features.trendPersistence < 40 && features.momentumPersistence > 50) {
      evidence.push('Early trend stage - momentum building');
      return 'early';
    }

    return 'middle';
  }

  private calculatePersistenceScore(features: FeatureSet): number {
    const persistenceWeight = 0.4;
    const momentumWeight = 0.3;
    const swingWeight = 0.3;

    const persistenceNormalized = Math.min(features.trendPersistence / 100, 1);
    const momentumNormalized = Math.min(features.momentumPersistence / 100, 1);

    const totalSwings = features.higherHighs + features.higherLows + features.lowerHighs + features.lowerLows;
    const consistentSwings = Math.max(
      features.higherHighs + features.higherLows,
      features.lowerHighs + features.lowerLows
    );
    const swingNormalized = totalSwings > 0 ? consistentSwings / totalSwings : 0.5;

    return (
      persistenceNormalized * persistenceWeight +
      momentumNormalized * momentumWeight +
      swingNormalized * swingWeight
    ) * 100;
  }

  private calculateScore(
    direction: TrendDirection,
    strength: TrendStrength,
    quality: TrendQuality,
    persistence: number,
    features: FeatureSet
  ): number {
    let score = 50; // Neutral baseline

    // Direction contribution
    if (direction === 'uptrend') score += 15;
    else if (direction === 'downtrend') score -= 15;

    // Strength contribution
    const strengthMap: Record<TrendStrength, number> = {
      very_strong: 15,
      strong: 10,
      moderate: 5,
      weak: -5,
    };
    score += strengthMap[strength];

    // Quality contribution
    const qualityMap: Record<TrendQuality, number> = {
      clean: 10,
      noisy: 0,
      choppy: -5,
      parabolic: -10,
    };
    score += qualityMap[quality];

    // Persistence contribution
    score += (persistence - 50) * 0.2;

    // Clamp to 0-100
    return Math.max(0, Math.min(100, score));
  }

  private calculateConfidence(features: FeatureSet, evidence: string[]): number {
    let confidence = 50;

    // More evidence = higher confidence
    confidence += Math.min(evidence.length * 3, 20);

    // Data quality indicators
    if (features.trendPersistence > 0) confidence += 5;
    if (features.higherHighs + features.higherLows + features.lowerHighs + features.lowerLows >= 4) confidence += 10;
    if (features.maSlope !== 0) confidence += 5;

    // Data sufficiency
    if (features.ema50 > 0) confidence += 5;

    return Math.max(0, Math.min(100, confidence));
  }

  private generateReason(
    direction: TrendDirection,
    strength: TrendStrength,
    quality: TrendQuality,
    stage: TrendStage,
    features: FeatureSet
  ): string {
    const directionText = direction === 'uptrend' ? 'bullish' : direction === 'downtrend' ? 'bearish' : 'neutral';
    const slopeText = features.maSlope > 0 ? 'positive' : features.maSlope < 0 ? 'negative' : 'flat';

    return `Trend is ${directionText} with ${strength} strength and ${quality} quality. ` +
      `Currently in ${stage} stage. MA slope is ${slopeText} at ${features.maSlope.toFixed(2)}%. ` +
      `Price is ${features.vwapDistance > 0 ? 'above' : 'below'} VWAP by ${Math.abs(features.vwapDistance).toFixed(2)}%. ` +
      `Swing structure shows ${features.swingStructure}.`;
  }
}