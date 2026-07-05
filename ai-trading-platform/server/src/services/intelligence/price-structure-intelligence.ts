/**
 * Price Structure Intelligence Module
 * Analyzes breakouts, breakdowns, retests, consolidation, support/resistance
 * Pure, independently testable service
 */

import type { FeatureSet, PriceStructureOutput, SupportResistanceZoneAnalysis } from '../../../shared/types/analysis';

export class PriceStructureIntelligenceModule {
  analyze(features: FeatureSet): PriceStructureOutput {
    const evidence: string[] = [];
    const metadata: Record<string, number | string | boolean> = {};

    // Calculate all price structure metrics
    const breakoutPercent = features.breakoutPercent;
    const breakdownPercent = features.breakdownPercent;
    const retestQuality = this.assessRetestQuality(features, evidence, metadata);
    const consolidationScore = this.assessConsolidation(features, evidence, metadata);
    const compressionLevel = this.assessCompression(features, evidence, metadata);
    const expansionLevel = this.assessExpansion(features, evidence, metadata);
    const supportZones = features.supportZones;
    const resistanceZones = features.resistanceZones;
    const previousDayBreakout = features.previousDayBreakout;
    const openingRangeBreakout = features.openingRangeBreakout;

    // Add breakout/breakdown evidence
    if (breakoutPercent > 0) {
      evidence.push(`Price broke above previous day high by ${breakoutPercent.toFixed(2)}%`);
    }
    if (breakdownPercent > 0) {
      evidence.push(`Price broke below previous day low by ${breakdownPercent.toFixed(2)}%`);
    }
    if (previousDayBreakout) {
      evidence.push('Previous day range breakout detected');
    }
    if (openingRangeBreakout) {
      evidence.push(`Opening range breakout (${features.openingRangeDirection ?? 'unknown'})`);
    }

    metadata.breakoutPercent = breakoutPercent;
    metadata.breakdownPercent = breakdownPercent;
    metadata.previousDayBreakout = previousDayBreakout;
    metadata.openingRangeBreakout = openingRangeBreakout;

    // Calculate score
    const score = this.calculateScore(
      breakoutPercent,
      breakdownPercent,
      retestQuality,
      consolidationScore,
      compressionLevel,
      expansionLevel,
      features
    );

    const confidence = this.calculateConfidence(features, evidence);

    return {
      score,
      confidence,
      reason: this.generateReason(breakoutPercent, breakdownPercent, features),
      evidence,
      metadata,
      breakoutPercent,
      breakdownPercent,
      retestQuality,
      consolidationScore,
      compressionLevel,
      expansionLevel,
      supportZones,
      resistanceZones,
      previousDayBreakout,
      openingRangeBreakout,
    };
  }

  private assessRetestQuality(
    features: FeatureSet,
    evidence: string[],
    metadata: Record<string, number | string | boolean>
  ): number {
    let score = 0;

    // Check if price is near support zones (potential retest)
    const nearSupport = features.supportZones.some((z) => z.distance < 0.5);
    if (nearSupport) {
      score += 40;
      evidence.push('Price near support zone - potential retest');
    }

    // Check if price is near resistance zones (potential retest)
    const nearResistance = features.resistanceZones.some((z) => z.distance < 0.5);
    if (nearResistance) {
      score += 30;
      evidence.push('Price near resistance zone - potential retest');
    }

    // VWAP as a retest level
    if (Math.abs(features.vwapDistance) < 0.3) {
      score += 20;
      evidence.push('Price near VWAP - key level retest');
    }

    metadata.retestQuality = score;
    return Math.min(100, score);
  }

  private assessConsolidation(
    features: FeatureSet,
    evidence: string[],
    metadata: Record<string, number | string | boolean>
  ): number {
    let score = 0;

    // Low range expansion indicates consolidation
    if (features.rangeExpansion < 0.8) {
      score += 40;
      evidence.push(`Low range expansion (${features.rangeExpansion.toFixed(2)}x) - consolidation`);
    }

    // Low volatility indicates consolidation
    if (features.volatilityExpansion < 0.8) {
      score += 30;
      evidence.push(`Low volatility expansion (${features.volatilityExpansion.toFixed(2)}x) - consolidation`);
    }

    // Narrow Bollinger bands
    if (features.bollingerWidth > 0) {
      const normalizedWidth = features.bollingerPercent;
      if (normalizedWidth > 0.3 && normalizedWidth < 0.7) {
        score += 20;
        evidence.push('Price within Bollinger bands - range-bound');
      }
    }

    // Low momentum persistence
    if (features.momentumPersistence < 50) {
      score += 10;
      evidence.push('Low momentum persistence - consolidation phase');
    }

    metadata.consolidationScore = score;
    return Math.min(100, score);
  }

  private assessCompression(
    features: FeatureSet,
    evidence: string[],
    metadata: Record<string, number | string | boolean>
  ): number {
    let score = 0;

    // Bollinger band compression
    if (features.bollingerWidth > 0) {
      const width = features.bollingerWidth;
      const price = features.ema21;
      if (price > 0) {
        const normalizedWidth = (width / price) * 100;
        if (normalizedWidth < 2) {
          score += 50;
          evidence.push(`Bollinger band compression (${normalizedWidth.toFixed(2)}%) - potential breakout`);
        } else if (normalizedWidth < 4) {
          score += 30;
          evidence.push(`Moderate Bollinger compression (${normalizedWidth.toFixed(2)}%)`);
        }
      }
    }

    // ATR compression
    if (features.atrPercent < 1) {
      score += 30;
      evidence.push(`Low ATR percent (${features.atrPercent.toFixed(2)}%) - volatility compression`);
    } else if (features.atrPercent < 2) {
      score += 15;
    }

    metadata.compressionLevel = score;
    return Math.min(100, score);
  }

  private assessExpansion(
    features: FeatureSet,
    evidence: string[],
    metadata: Record<string, number | string | boolean>
  ): number {
    let score = 0;

    // Range expansion
    if (features.rangeExpansion > 1.5) {
      score += 40;
      evidence.push(`Range expansion (${features.rangeExpansion.toFixed(2)}x) - volatility increasing`);
    }

    // Volatility expansion
    if (features.volatilityExpansion > 1.5) {
      score += 30;
      evidence.push(`Volatility expansion (${features.volatilityExpansion.toFixed(2)}x)`);
    }

    // Bollinger band expansion
    if (features.bollingerPercent > 0.8 || features.bollingerPercent < 0.2) {
      score += 20;
      evidence.push('Price at Bollinger band extremes - expansion phase');
    }

    // Breakout with volume
    if (features.breakoutPercent > 0.5 && features.relativeVolume > 1.5) {
      score += 10;
      evidence.push('Breakout with volume confirmation');
    }

    metadata.expansionLevel = score;
    return Math.min(100, score);
  }

  private calculateScore(
    breakoutPercent: number,
    breakdownPercent: number,
    retestQuality: number,
    consolidationScore: number,
    compressionLevel: number,
    expansionLevel: number,
    features: FeatureSet
  ): number {
    let score = 50;

    // Breakout contribution
    if (breakoutPercent > 0) {
      score += Math.min(breakoutPercent * 10, 25);
    }

    // Breakdown contribution
    if (breakdownPercent > 0) {
      score -= Math.min(breakdownPercent * 10, 25);
    }

    // Compression followed by expansion is bullish
    if (compressionLevel > 50 && expansionLevel > 30) {
      score += 15;
    }

    // Retest quality adds conviction
    score += retestQuality * 0.1;

    // Consolidation after move can be continuation
    if (consolidationScore > 50 && features.vwapDistance > 0) {
      score += 5;
    }

    // Support proximity
    if (features.supportZones.length > 0) {
      const nearestSupport = features.supportZones[0];
      if (nearestSupport && nearestSupport.distance < 1) {
        score += 5;
      }
    }

    // Resistance proximity
    if (features.resistanceZones.length > 0) {
      const nearestResistance = features.resistanceZones[0];
      if (nearestResistance && nearestResistance.distance < 1) {
        score -= 5;
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  private calculateConfidence(features: FeatureSet, evidence: string[]): number {
    let confidence = 50;

    // More evidence = higher confidence
    confidence += Math.min(evidence.length * 2, 20);

    // Data quality
    if (features.supportZones.length > 0) confidence += 5;
    if (features.resistanceZones.length > 0) confidence += 5;
    if (features.breakoutPercent !== 0 || features.breakdownPercent !== 0) confidence += 5;

    return Math.max(0, Math.min(90, confidence));
  }

  private generateReason(
    breakoutPercent: number,
    breakdownPercent: number,
    features: FeatureSet
  ): string {
    if (breakoutPercent > 0) {
      return `Price broke above previous day high by ${breakoutPercent.toFixed(2)}%. ` +
        `Swing structure: ${features.swingStructure}. ` +
        `Range expansion at ${features.rangeExpansion.toFixed(2)}x.`;
    }

    if (breakdownPercent > 0) {
      return `Price broke below previous day low by ${breakdownPercent.toFixed(2)}%. ` +
        `Swing structure: ${features.swingStructure}. ` +
        `Range expansion at ${features.rangeExpansion.toFixed(2)}x.`;
    }

    return `Price is within previous day range. ` +
      `Swing structure: ${features.swingStructure}. ` +
      `VWAP distance: ${features.vwapDistance.toFixed(2)}%.`;
  }
}