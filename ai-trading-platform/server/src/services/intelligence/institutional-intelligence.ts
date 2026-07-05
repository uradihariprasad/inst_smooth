/**
 * Institutional Intelligence Module
 * Estimates institutional participation using observable market behavior
 * Never claims certainty - presents evidence-based assessment only
 * Pure, independently testable service
 */

import type { FeatureSet, InstitutionalOutput } from '../../../shared/types/analysis';
import type { Quote, OptionChain } from '../../../shared/types/market';

export class InstitutionalIntelligenceModule {
  analyze(
    features: FeatureSet,
    quote: Quote,
    optionChain: OptionChain | null
  ): InstitutionalOutput {
    const evidence: string[] = [];
    const metadata: Record<string, number | string | boolean> = {};

    // Calculate all institutional indicators
    const relativeVolume = this.assessRelativeVolume(features, evidence, metadata);
    const priceAcceptance = this.assessPriceAcceptance(features, quote, evidence, metadata);
    const repeatedBuying = this.assessRepeatedBuying(features, quote, evidence, metadata);
    const repeatedSelling = this.assessRepeatedSelling(features, quote, evidence, metadata);
    const vwapHolding = this.assessVWAPHolding(features, evidence, metadata);
    const oiBuildUp = this.assessOIBuildUp(optionChain, evidence, metadata);
    const depthImbalance = this.assessDepthImbalance(quote, evidence, metadata);
    const volumeCharacteristics = this.assessVolumeCharacteristics(features, evidence, metadata);
    const sustainedMovement = this.assessSustainedMovement(features, evidence, metadata);

    // Calculate estimated participation
    const estimatedParticipation = this.estimateParticipation(
      relativeVolume,
      priceAcceptance,
      repeatedBuying,
      repeatedSelling,
      vwapHolding,
      depthImbalance,
      sustainedMovement
    );

    metadata.estimatedParticipation = estimatedParticipation;

    // Add disclaimer evidence
    if (estimatedParticipation > 60) {
      evidence.push('Note: Institutional participation is an evidence-based estimate, not a certainty');
    }

    // Calculate score
    const score = this.calculateScore(estimatedParticipation, features);
    const confidence = this.calculateConfidence(features, evidence, optionChain);

    return {
      score,
      confidence,
      reason: this.generateReason(estimatedParticipation, features),
      evidence,
      metadata,
      estimatedParticipation,
      relativeVolume,
      priceAcceptance,
      repeatedBuying,
      repeatedSelling,
      vwapHolding,
      oiBuildUp,
      depthImbalance,
      volumeCharacteristics,
      sustainedMovement,
    };
  }

  private assessRelativeVolume(
    features: FeatureSet,
    evidence: string[],
    metadata: Record<string, number | string | boolean>
  ): number {
    const rv = features.relativeVolume;
    let score = 0;

    if (rv > 2.5) {
      score = 90;
      evidence.push(`Exceptional relative volume (${rv.toFixed(2)}x) - possible institutional activity`);
    } else if (rv > 2.0) {
      score = 80;
      evidence.push(`Very high relative volume (${rv.toFixed(2)}x)`);
    } else if (rv > 1.5) {
      score = 65;
      evidence.push(`Elevated relative volume (${rv.toFixed(2)}x)`);
    } else if (rv > 1.2) {
      score = 45;
      evidence.push(`Above average relative volume (${rv.toFixed(2)}x)`);
    } else if (rv > 0.8) {
      score = 30;
    } else {
      score = 15;
      evidence.push(`Low relative volume (${rv.toFixed(2)}x) - weak participation`);
    }

    metadata.relativeVolumeScore = score;
    return score;
  }

  private assessPriceAcceptance(
    features: FeatureSet,
    quote: Quote,
    evidence: string[],
    metadata: Record<string, number | string | boolean>
  ): number {
    // Price acceptance near VWAP suggests institutional activity
    const vwapDistance = Math.abs(features.vwapDistance);
    let score = 0;

    if (vwapDistance < 0.2) {
      score = 80;
      evidence.push('Price holding near VWAP - possible institutional accumulation/distribution');
    } else if (vwapDistance < 0.5) {
      score = 60;
      evidence.push('Price near VWAP - moderate institutional interest');
    } else if (vwapDistance < 1.0) {
      score = 40;
    } else {
      score = 20;
    }

    // Check if price is consistently near VWAP (low deviation)
    if (quote.vwap > 0) {
      const acceptance = 100 - vwapDistance * 20;
      score = (score + Math.max(0, acceptance)) / 2;
    }

    metadata.priceAcceptanceScore = score;
    return Math.max(0, Math.min(100, score));
  }

  private assessRepeatedBuying(
    features: FeatureSet,
    quote: Quote,
    evidence: string[],
    metadata: Record<string, number | string | boolean>
  ): number {
    let score = 0;

    // Higher highs and higher lows suggest sustained buying
    if (features.higherHighs >= 2 && features.higherLows >= 2) {
      score += 30;
      evidence.push('Pattern of higher highs and higher lows suggests sustained buying');
    }

    // Buy quantity dominance
    if (quote.totalBuyQuantity > quote.totalSellQuantity * 1.2) {
      score += 25;
      evidence.push('Buy quantity significantly exceeds sell quantity');
    }

    // Momentum persistence in bullish direction
    if (features.momentumPersistence > 60 && features.vwapDistance > 0) {
      score += 20;
      evidence.push('Persistent bullish momentum with price above VWAP');
    }

    // RSI trending up
    if (features.rsi > 50 && features.rsiSlope > 0.5) {
      score += 15;
    }

    // EMA alignment
    if (features.ema9 > features.ema21 && features.ema21 > features.ema50) {
      score += 10;
    }

    metadata.repeatedBuyingScore = score;
    return Math.min(100, score);
  }

  private assessRepeatedSelling(
    features: FeatureSet,
    quote: Quote,
    evidence: string[],
    metadata: Record<string, number | string | boolean>
  ): number {
    let score = 0;

    // Lower highs and lower lows suggest sustained selling
    if (features.lowerHighs >= 2 && features.lowerLows >= 2) {
      score += 30;
      evidence.push('Pattern of lower highs and lower lows suggests sustained selling');
    }

    // Sell quantity dominance
    if (quote.totalSellQuantity > quote.totalBuyQuantity * 1.2) {
      score += 25;
      evidence.push('Sell quantity significantly exceeds buy quantity');
    }

    // Momentum persistence in bearish direction
    if (features.momentumPersistence > 60 && features.vwapDistance < 0) {
      score += 20;
      evidence.push('Persistent bearish momentum with price below VWAP');
    }

    // RSI trending down
    if (features.rsi < 50 && features.rsiSlope < -0.5) {
      score += 15;
    }

    metadata.repeatedSellingScore = score;
    return Math.min(100, score);
  }

  private assessVWAPHolding(
    features: FeatureSet,
    evidence: string[],
    metadata: Record<string, number | string | boolean>
  ): number {
    const vwapDistance = Math.abs(features.vwapDistance);
    let score = 0;

    if (vwapDistance < 0.3) {
      score = 85;
      evidence.push('Price holding tightly to VWAP - institutional control likely');
    } else if (vwapDistance < 0.5) {
      score = 70;
      evidence.push('Price near VWAP - institutional interest');
    } else if (vwapDistance < 1.0) {
      score = 50;
    } else if (vwapDistance < 2.0) {
      score = 30;
    } else {
      score = 15;
      evidence.push('Price far from VWAP - retail-driven movement possible');
    }

    // Bonus for bullish bias above VWAP
    if (features.vwapDistance > 0 && features.vwapDistance < 1.0) {
      score += 10;
      evidence.push('Controlled bullish bias above VWAP');
    }

    metadata.vwapHoldingScore = score;
    return Math.min(100, score);
  }

  private assessOIBuildUp(
    optionChain: OptionChain | null,
    evidence: string[],
    metadata: Record<string, number | string | boolean>
  ): number {
    if (!optionChain) {
      evidence.push('Option chain data unavailable for OI assessment');
      metadata.oiBuildUpScore = 0;
      return 0;
    }

    let score = 0;

    // PCR analysis
    const pcr = optionChain.pcr;
    if (pcr > 1.2) {
      score += 30;
      evidence.push(`Bullish PCR (${pcr.toFixed(2)}) - more put writing than call writing`);
    } else if (pcr < 0.8) {
      score += 20;
      evidence.push(`Bearish PCR (${pcr.toFixed(2)}) - more call writing than put writing`);
    } else {
      score += 10;
      evidence.push(`Neutral PCR (${pcr.toFixed(2)})`);
    }

    // ATM activity
    const atmStrike = optionChain.atmStrike;
    const atmCall = optionChain.calls.find((c) => c.strike === atmStrike);
    const atmPut = optionChain.puts.find((p) => p.strike === atmStrike);

    if (atmCall && atmPut) {
      const totalATMOI = atmCall.openInterest + atmPut.openInterest;
      if (totalATMOI > 100000) {
        score += 30;
        evidence.push(`High ATM OI (${totalATMOI.toLocaleString()}) - significant institutional positioning`);
      } else if (totalATMOI > 50000) {
        score += 20;
        evidence.push(`Moderate ATM OI (${totalATMOI.toLocaleString()})`);
      }
    }

    // OI concentration near current price
    const nearbyStrikes = optionChain.calls
      .filter((c) => Math.abs(c.strike - optionChain.underlyingPrice) / optionChain.underlyingPrice < 0.03)
      .concat(
        optionChain.puts.filter(
          (p) => Math.abs(p.strike - optionChain.underlyingPrice) / optionChain.underlyingPrice < 0.03
        )
      );

    const nearbyOI = nearbyStrikes.reduce((sum, s) => sum + s.openInterest, 0);
    if (nearbyOI > 200000) {
      score += 20;
      evidence.push(`High OI concentration near current price - institutional battleground`);
    }

    metadata.oiBuildUpScore = score;
    return Math.min(100, score);
  }

  private assessDepthImbalance(
    quote: Quote,
    evidence: string[],
    metadata: Record<string, number | string | boolean>
  ): number {
    let score = 0;

    // Buy vs Sell depth imbalance
    const buyDepth = quote.totalBuyQuantity;
    const sellDepth = quote.totalSellQuantity;

    if (buyDepth > 0 && sellDepth > 0) {
      const ratio = buyDepth / sellDepth;

      if (ratio > 1.5) {
        score = 75;
        evidence.push(`Strong buy depth imbalance (${ratio.toFixed(2)}x) - institutional buying pressure`);
      } else if (ratio > 1.2) {
        score = 60;
        evidence.push(`Moderate buy depth imbalance (${ratio.toFixed(2)}x)`);
      } else if (ratio < 0.67) {
        score = 70;
        evidence.push(`Strong sell depth imbalance (${(1 / ratio).toFixed(2)}x) - institutional selling pressure`);
      } else if (ratio < 0.83) {
        score = 55;
        evidence.push(`Moderate sell depth imbalance (${(1 / ratio).toFixed(2)}x)`);
      } else {
        score = 30;
      }
    }

    // Order concentration in top levels
    const topBuyOrders = quote.marketDepth.buy.slice(0, 3).reduce((sum, l) => sum + l.quantity, 0);
    const topSellOrders = quote.marketDepth.sell.slice(0, 3).reduce((sum, l) => sum + l.quantity, 0);
    const totalOrders = topBuyOrders + topSellOrders;

    if (totalOrders > 0) {
      const concentration = Math.max(topBuyOrders, topSellOrders) / totalOrders;
      if (concentration > 0.7) {
        score += 15;
        evidence.push('High order concentration in top 3 levels');
      }
    }

    metadata.depthImbalanceScore = score;
    return Math.min(100, score);
  }

  private assessVolumeCharacteristics(
    features: FeatureSet,
    evidence: string[],
    metadata: Record<string, number | string | boolean>
  ): string {
    const rv = features.relativeVolume;
    const persistence = features.momentumPersistence;
    const rangeExpansion = features.rangeExpansion;

    if (rv > 2 && persistence > 60 && rangeExpansion > 1.2) {
      evidence.push('Volume profile suggests institutional accumulation with sustained directional movement');
      return 'institutional_accumulation';
    }

    if (rv > 1.5 && persistence > 50) {
      evidence.push('Above-average volume with directional consistency');
      return 'active_participation';
    }

    if (rv < 0.5) {
      return 'low_participation';
    }

    return 'normal';
  }

  private assessSustainedMovement(
    features: FeatureSet,
    evidence: string[],
    metadata: Record<string, number | string | boolean>
  ): number {
    let score = 0;

    // Trend persistence
    score += features.trendPersistence * 0.3;

    // Momentum persistence
    score += features.momentumPersistence * 0.3;

    // Swing consistency
    const totalSwings = features.higherHighs + features.higherLows + features.lowerHighs + features.lowerLows;
    if (totalSwings >= 4) {
      const consistentSwings = Math.max(
        features.higherHighs + features.higherLows,
        features.lowerHighs + features.lowerLows
      );
      score += (consistentSwings / totalSwings) * 20;
    }

    // VWAP holding
    if (Math.abs(features.vwapDistance) < 0.5) {
      score += 10;
    }

    if (score > 60) {
      evidence.push('Sustained directional movement detected');
    }

    metadata.sustainedMovementScore = score;
    return Math.min(100, score);
  }

  private estimateParticipation(
    relativeVolume: number,
    priceAcceptance: number,
    repeatedBuying: number,
    repeatedSelling: number,
    vwapHolding: number,
    depthImbalance: number,
    sustainedMovement: number
  ): number {
    const weights = {
      relativeVolume: 0.2,
      priceAcceptance: 0.15,
      repeatedBuying: 0.15,
      repeatedSelling: 0.1,
      vwapHolding: 0.15,
      depthImbalance: 0.1,
      sustainedMovement: 0.15,
    };

    const directionalBias = Math.max(repeatedBuying, repeatedSelling);

    return (
      relativeVolume * weights.relativeVolume +
      priceAcceptance * weights.priceAcceptance +
      repeatedBuying * weights.repeatedBuying +
      repeatedSelling * weights.repeatedSelling +
      vwapHolding * weights.vwapHolding +
      depthImbalance * weights.depthImbalance +
      sustainedMovement * weights.sustainedMovement
    );
  }

  private calculateScore(estimatedParticipation: number, features: FeatureSet): number {
    let score = 50;

    // Participation contribution
    score += (estimatedParticipation - 50) * 0.5;

    // Volume quality
    if (features.relativeVolume > 1.5) score += 10;
    if (features.relativeVolume < 0.5) score -= 10;

    // VWAP holding
    if (Math.abs(features.vwapDistance) < 0.3) score += 5;

    return Math.max(0, Math.min(100, score));
  }

  private calculateConfidence(
    features: FeatureSet,
    evidence: string[],
    optionChain: OptionChain | null
  ): number {
    let confidence = 40; // Base confidence for institutional assessment is lower

    // Evidence adds confidence
    confidence += Math.min(evidence.length * 2, 15);

    // Data availability
    if (features.relativeVolume > 0) confidence += 5;
    if (optionChain !== null) confidence += 10;
    if (features.liquidityScore > 50) confidence += 5;

    // Cap confidence - institutional assessment is inherently uncertain
    return Math.min(75, Math.max(0, confidence));
  }

  private generateReason(estimatedParticipation: number, features: FeatureSet): string {
    const level = estimatedParticipation > 70 ? 'high' : estimatedParticipation > 50 ? 'moderate' : 'low';
    const direction = features.vwapDistance > 0 ? 'bullish' : features.vwapDistance < 0 ? 'bearish' : 'neutral';

    return `Estimated institutional participation is ${level} at ${estimatedParticipation.toFixed(0)}%. ` +
      `Evidence suggests ${direction} institutional bias based on volume patterns, ` +
      `VWAP behavior, and market depth analysis. Note: This is an evidence-based assessment, ` +
      `not a definitive identification of institutional activity.`;
  }
}