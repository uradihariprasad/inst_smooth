/**
 * Momentum Intelligence Module
 * Analyzes momentum strength, acceleration, breakout power, and continuation
 * Pure, independently testable service
 */

import type { FeatureSet, MomentumOutput } from '../../../shared/types/analysis';

export class MomentumIntelligenceModule {
  analyze(features: FeatureSet): MomentumOutput {
    const evidence: string[] = [];
    const metadata: Record<string, number | string | boolean> = {};

    // Calculate all momentum metrics
    const momentumStrength = this.calculateMomentumStrength(features, evidence, metadata);
    const acceleration = this.calculateAcceleration(features, evidence, metadata);
    const deceleration = this.calculateDeceleration(features, evidence, metadata);
    const breakoutStrength = this.calculateBreakoutStrength(features, evidence, metadata);
    const volumeExpansion = this.calculateVolumeExpansion(features, evidence, metadata);
    const atrExpansion = this.calculateATRExpansion(features, evidence, metadata);
    const bollingerExpansion = this.calculateBollingerExpansion(features, evidence, metadata);
    const candleStrength = this.calculateCandleStrength(features, evidence, metadata);
    const bodySize = this.calculateBodySize(features, evidence, metadata);
    const velocity = this.calculateVelocity(features, evidence, metadata);
    const rangeExpansion = features.rangeExpansion;

    // Add range expansion evidence
    if (rangeExpansion > 1.5) {
      evidence.push(`Range expansion of ${rangeExpansion.toFixed(2)}x indicates strong momentum`);
    } else if (rangeExpansion < 0.8) {
      evidence.push(`Range contraction of ${rangeExpansion.toFixed(2)}x indicates low momentum`);
    }

    metadata.rangeExpansion = rangeExpansion;
    metadata.momentumPersistence = features.momentumPersistence;

    // Calculate overall score
    const score = this.calculateScore(
      momentumStrength,
      acceleration,
      breakoutStrength,
      volumeExpansion,
      atrExpansion,
      bollingerExpansion,
      rangeExpansion,
      features
    );

    const confidence = this.calculateConfidence(features, evidence);

    return {
      score,
      confidence,
      reason: this.generateReason(momentumStrength, acceleration, breakoutStrength, features),
      evidence,
      metadata,
      momentumStrength,
      acceleration,
      deceleration,
      breakoutStrength,
      volumeExpansion,
      atrExpansion,
      bollingerExpansion,
      candleStrength,
      bodySize,
      velocity,
      rangeExpansion,
    };
  }

  private calculateMomentumStrength(
    features: FeatureSet,
    evidence: string[],
    metadata: Record<string, number | string | boolean>
  ): number {
    let strength = 0;

    // RSI contribution
    if (features.rsi > 60) {
      strength += 25;
      evidence.push(`RSI bullish at ${features.rsi.toFixed(1)}`);
    } else if (features.rsi < 40) {
      strength -= 25;
      evidence.push(`RSI bearish at ${features.rsi.toFixed(1)}`);
    } else {
      strength += 0;
    }

    // RSI slope
    if (features.rsiSlope > 1) {
      strength += 15;
      evidence.push(`RSI rising strongly (${features.rsiSlope.toFixed(2)})`);
    } else if (features.rsiSlope < -1) {
      strength -= 15;
      evidence.push(`RSI falling strongly (${features.rsiSlope.toFixed(2)})`);
    }

    // Price acceleration
    if (features.priceAcceleration > 0.5) {
      strength += 20;
      evidence.push(`Strong positive price acceleration`);
    } else if (features.priceAcceleration < -0.5) {
      strength -= 20;
      evidence.push(`Strong negative price acceleration`);
    }

    // Momentum persistence
    strength += (features.momentumPersistence - 50) * 0.4;

    // VWAP distance as momentum indicator
    if (features.vwapDistance > 1) {
      strength += 10;
    } else if (features.vwapDistance < -1) {
      strength -= 10;
    }

    metadata.momentumStrengthRaw = strength;
    return Math.max(-100, Math.min(100, strength));
  }

  private calculateAcceleration(
    features: FeatureSet,
    evidence: string[],
    metadata: Record<string, number | string | boolean>
  ): number {
    const acceleration = features.priceAcceleration;

    if (acceleration > 1) {
      evidence.push(`Strong momentum acceleration detected`);
    } else if (acceleration > 0.3) {
      evidence.push(`Moderate momentum acceleration`);
    }

    metadata.acceleration = acceleration;
    return acceleration;
  }

  private calculateDeceleration(
    features: FeatureSet,
    _evidence: string[],
    metadata: Record<string, number | string | boolean>
  ): number {
    // Deceleration is negative acceleration
    const deceleration = features.priceAcceleration < 0 ? Math.abs(features.priceAcceleration) : 0;
    metadata.deceleration = deceleration;
    return deceleration;
  }

  private calculateBreakoutStrength(
    features: FeatureSet,
    evidence: string[],
    metadata: Record<string, number | string | boolean>
  ): number {
    let breakoutScore = 0;

    // Breakout from previous day
    if (features.breakoutPercent > 0) {
      breakoutScore += Math.min(features.breakoutPercent * 10, 30);
      evidence.push(`Breakout above previous day high by ${features.breakoutPercent.toFixed(2)}%`);
    }

    // Breakdown from previous day
    if (features.breakdownPercent > 0) {
      breakoutScore -= Math.min(features.breakdownPercent * 10, 30);
      evidence.push(`Breakdown below previous day low by ${features.breakdownPercent.toFixed(2)}%`);
    }

    // Opening range breakout
    if (features.openingRangeBreakout) {
      breakoutScore += 20;
      evidence.push(`Opening range breakout (${features.openingRangeDirection ?? 'unknown'})`);
    }

    // Bollinger band breakout
    if (features.bollingerPercent > 0.95) {
      breakoutScore += 15;
      evidence.push('Price near upper Bollinger band - potential breakout');
    } else if (features.bollingerPercent < 0.05) {
      breakoutScore -= 15;
      evidence.push('Price near lower Bollinger band - potential breakdown');
    }

    metadata.breakoutScore = breakoutScore;
    return Math.max(-100, Math.min(100, breakoutScore));
  }

  private calculateVolumeExpansion(
    features: FeatureSet,
    evidence: string[],
    metadata: Record<string, number | string | boolean>
  ): number {
    const volumeRatio = features.volumeRatio;
    const relativeVolume = features.relativeVolume;

    if (relativeVolume > 2) {
      evidence.push(`Very high relative volume (${relativeVolume.toFixed(2)}x) - institutional interest likely`);
    } else if (relativeVolume > 1.5) {
      evidence.push(`Elevated relative volume (${relativeVolume.toFixed(2)}x)`);
    } else if (relativeVolume < 0.5) {
      evidence.push(`Low relative volume (${relativeVolume.toFixed(2)}x) - weak participation`);
    }

    metadata.volumeRatio = volumeRatio;
    metadata.relativeVolume = relativeVolume;

    return relativeVolume;
  }

  private calculateATRExpansion(
    features: FeatureSet,
    evidence: string[],
    metadata: Record<string, number | string | boolean>
  ): number {
    const atrPercent = features.atrPercent;
    const volatilityExpansion = features.volatilityExpansion;

    if (volatilityExpansion > 1.5) {
      evidence.push(`ATR expansion of ${volatilityExpansion.toFixed(2)}x - volatility increasing`);
    } else if (volatilityExpansion < 0.7) {
      evidence.push(`ATR contraction of ${volatilityExpansion.toFixed(2)}x - volatility decreasing`);
    }

    metadata.atrPercent = atrPercent;
    metadata.volatilityExpansion = volatilityExpansion;

    return volatilityExpansion;
  }

  private calculateBollingerExpansion(
    features: FeatureSet,
    evidence: string[],
    metadata: Record<string, number | string | boolean>
  ): number {
    const bollingerWidth = features.bollingerWidth;
    const bollingerPercent = features.bollingerPercent;

    if (bollingerPercent > 0.8) {
      evidence.push(`Price at ${(bollingerPercent * 100).toFixed(0)}% of Bollinger band - strong momentum`);
    } else if (bollingerPercent < 0.2) {
      evidence.push(`Price at ${(bollingerPercent * 100).toFixed(0)}% of Bollinger band - oversold momentum`);
    }

    metadata.bollingerWidth = bollingerWidth;
    metadata.bollingerPercent = bollingerPercent;

    return bollingerPercent;
  }

  private calculateCandleStrength(
    features: FeatureSet,
    evidence: string[],
    metadata: Record<string, number | string | boolean>
  ): number {
    // Candle strength derived from momentum persistence and range expansion
    const candleStrength = (features.momentumPersistence / 100) * features.rangeExpansion;
    
    if (candleStrength > 1.2) {
      evidence.push('Strong candle patterns supporting momentum');
    }

    metadata.candleStrength = candleStrength;
    return Math.min(candleStrength, 2);
  }

  private calculateBodySize(
    features: FeatureSet,
    _evidence: string[],
    metadata: Record<string, number | string | boolean>
  ): number {
    // Body size approximation from ATR and range expansion
    const bodySize = features.atrPercent * features.rangeExpansion;
    metadata.bodySize = bodySize;
    return bodySize;
  }

  private calculateVelocity(
    features: FeatureSet,
    evidence: string[],
    metadata: Record<string, number | string | boolean>
  ): number {
    const velocity = features.priceAcceleration;
    
    if (Math.abs(velocity) > 1) {
      evidence.push(`High price velocity detected (${velocity.toFixed(2)})`);
    }

    metadata.velocity = velocity;
    return velocity;
  }

  private calculateScore(
    momentumStrength: number,
    acceleration: number,
    breakoutStrength: number,
    volumeExpansion: number,
    atrExpansion: number,
    bollingerExpansion: number,
    rangeExpansion: number,
    features: FeatureSet
  ): number {
    let score = 50; // Neutral baseline

    // Momentum strength (0-30 points)
    score += momentumStrength * 0.3;

    // Acceleration (0-15 points)
    score += acceleration * 15;

    // Breakout strength (0-20 points)
    score += breakoutStrength * 0.2;

    // Volume expansion (0-15 points)
    if (volumeExpansion > 1) {
      score += Math.min((volumeExpansion - 1) * 15, 15);
    }

    // Range expansion (0-10 points)
    if (rangeExpansion > 1) {
      score += Math.min((rangeExpansion - 1) * 10, 10);
    }

    // Bollinger position (0-10 points)
    score += (bollingerExpansion - 0.5) * 20;

    return Math.max(0, Math.min(100, score));
  }

  private calculateConfidence(features: FeatureSet, evidence: string[]): number {
    let confidence = 50;

    // Evidence-based confidence
    confidence += Math.min(evidence.length * 2, 20);

    // Data quality
    if (features.rsi !== 50) confidence += 5; // Non-default RSI
    if (features.volumeRatio > 0) confidence += 5;
    if (features.atr > 0) confidence += 5;
    if (features.priceAcceleration !== 0) confidence += 5;

    return Math.max(0, Math.min(100, confidence));
  }

  private generateReason(
    momentumStrength: number,
    acceleration: number,
    breakoutStrength: number,
    features: FeatureSet
  ): string {
    const strengthText = momentumStrength > 30 ? 'strong' : momentumStrength > 0 ? 'moderate' : 'weak';
    const directionText = momentumStrength > 0 ? 'bullish' : momentumStrength < 0 ? 'bearish' : 'neutral';
    const accelText = acceleration > 0.3 ? 'accelerating' : acceleration < -0.3 ? 'decelerating' : 'stable';

    return `Momentum is ${strengthText} and ${directionText}, currently ${accelText}. ` +
      `RSI at ${features.rsi.toFixed(1)} with ${features.rsiSlope > 0 ? 'rising' : 'falling'} slope. ` +
      `Relative volume at ${features.relativeVolume.toFixed(2)}x. ` +
      `Range expansion at ${features.rangeExpansion.toFixed(2)}x.`;
  }
}