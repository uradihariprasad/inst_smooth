/**
 * Market Context Intelligence Module
 * Analyzes Nifty, BankNifty, Sector Strength, VIX, Market Breadth
 * Pure, independently testable service
 */

import type { MarketContextOutput } from '../../../shared/types/analysis';
import type { IndexData, MarketBreadth, SectorPerformance, TrendDirection } from '../../../shared/types/market';

export class MarketContextIntelligenceModule {
  analyze(
    nifty: IndexData | null,
    bankNifty: IndexData | null,
    indiaVix: IndexData | null,
    marketBreadth: MarketBreadth | null,
    sectorPerformance: SectorPerformance | null,
    instrumentSector: string
  ): MarketContextOutput {
    const evidence: string[] = [];
    const metadata: Record<string, number | string | boolean> = {};

    // Analyze Nifty
    const { trend: niftyTrend, strength: niftyStrength } = this.analyzeIndex(nifty, 'Nifty', evidence, metadata);
    
    // Analyze BankNifty
    const { trend: bankNiftyTrend, strength: bankNiftyStrength } = this.analyzeIndex(bankNifty, 'BankNifty', evidence, metadata);
    
    // Analyze VIX
    const { vixLevel, vixSignal } = this.analyzeVIX(indiaVix, evidence, metadata);
    
    // Analyze Market Breadth
    const { advanceDeclineRatio, breadthStrength } = this.analyzeBreadth(marketBreadth, evidence, metadata);
    
    // Analyze Sector
    const { sectorStrength, sectorRotation } = this.analyzeSector(sectorPerformance, instrumentSector, evidence, metadata);
    
    // Index Momentum
    const indexMomentum = this.calculateIndexMomentum(nifty, bankNifty, evidence, metadata);

    // Calculate score
    const score = this.calculateScore(
      niftyStrength,
      bankNiftyStrength,
      sectorStrength,
      advanceDeclineRatio,
      vixLevel,
      breadthStrength,
      indexMomentum
    );

    const confidence = this.calculateConfidence(nifty, bankNifty, indiaVix, marketBreadth, evidence);

    return {
      score,
      confidence,
      reason: this.generateReason(niftyTrend, bankNiftyTrend, vixSignal, sectorStrength),
      evidence,
      metadata,
      niftyTrend,
      niftyStrength,
      bankNiftyTrend,
      bankNiftyStrength,
      sectorStrength,
      sectorRotation,
      advanceDeclineRatio,
      vixLevel,
      vixSignal,
      breadthStrength,
      indexMomentum,
    };
  }

  private analyzeIndex(
    indexData: IndexData | null,
    name: string,
    evidence: string[],
    metadata: Record<string, number | string | boolean>
  ): { trend: TrendDirection; strength: number } {
    if (!indexData) {
      evidence.push(`${name} data unavailable`);
      return { trend: 'sideways', strength: 0 };
    }

    let trend: TrendDirection = 'sideways';
    let strength = 0;

    // Trend from change percent
    if (indexData.changePercent > 0.5) {
      trend = 'uptrend';
      strength = Math.min(100, indexData.changePercent * 20);
      evidence.push(`${name} bullish (+${indexData.changePercent.toFixed(2)}%)`);
    } else if (indexData.changePercent < -0.5) {
      trend = 'downtrend';
      strength = Math.min(100, Math.abs(indexData.changePercent) * 20);
      evidence.push(`${name} bearish (${indexData.changePercent.toFixed(2)}%)`);
    } else {
      strength = 20;
      evidence.push(`${name} sideways (${indexData.changePercent.toFixed(2)}%)`);
    }

    // Position relative to range
    const range = indexData.high - indexData.low;
    if (range > 0) {
      const position = (indexData.ltp - indexData.low) / range;
      if (position > 0.7) {
        strength += 10;
        evidence.push(`${name} near day high`);
      } else if (position < 0.3) {
        strength -= 5;
        evidence.push(`${name} near day low`);
      }
    }

    metadata[`${name.toLowerCase()}Change`] = indexData.changePercent;
    metadata[`${name.toLowerCase()}Strength`] = strength;

    return { trend, strength: Math.max(0, Math.min(100, strength)) };
  }

  private analyzeVIX(
    indiaVix: IndexData | null,
    evidence: string[],
    metadata: Record<string, number | string | boolean>
  ): { vixLevel: number; vixSignal: string } {
    if (!indiaVix) {
      evidence.push('India VIX data unavailable');
      return { vixLevel: 0, vixSignal: 'unknown' };
    }

    const vixLevel = indiaVix.ltp;
    let vixSignal = 'normal';

    if (vixLevel > 25) {
      vixSignal = 'high_fear';
      evidence.push(`India VIX at ${vixLevel.toFixed(2)} - high fear in market`);
    } else if (vixLevel > 20) {
      vixSignal = 'elevated';
      evidence.push(`India VIX at ${vixLevel.toFixed(2)} - elevated volatility`);
    } else if (vixLevel > 15) {
      vixSignal = 'normal';
      evidence.push(`India VIX at ${vixLevel.toFixed(2)} - normal volatility`);
    } else if (vixLevel > 12) {
      vixSignal = 'low';
      evidence.push(`India VIX at ${vixLevel.toFixed(2)} - low volatility`);
    } else {
      vixSignal = 'complacent';
      evidence.push(`India VIX at ${vixLevel.toFixed(2)} - very low volatility, complacency`);
    }

    metadata.vixLevel = vixLevel;
    metadata.vixSignal = vixSignal;

    return { vixLevel, vixSignal };
  }

  private analyzeBreadth(
    breadth: MarketBreadth | null,
    evidence: string[],
    metadata: Record<string, number | string | boolean>
  ): { advanceDeclineRatio: number; breadthStrength: number } {
    if (!breadth) {
      evidence.push('Market breadth data unavailable');
      return { advanceDeclineRatio: 1, breadthStrength: 50 };
    }

    const advanceDeclineRatio = breadth.advanceDeclineRatio;
    let breadthStrength = 50;

    if (advanceDeclineRatio > 2) {
      breadthStrength = 80;
      evidence.push(`Strong market breadth (A/D ratio: ${advanceDeclineRatio.toFixed(2)})`);
    } else if (advanceDeclineRatio > 1.5) {
      breadthStrength = 65;
      evidence.push(`Positive market breadth (A/D ratio: ${advanceDeclineRatio.toFixed(2)})`);
    } else if (advanceDeclineRatio > 1) {
      breadthStrength = 55;
    } else if (advanceDeclineRatio > 0.67) {
      breadthStrength = 40;
      evidence.push(`Negative market breadth (A/D ratio: ${advanceDeclineRatio.toFixed(2)})`);
    } else {
      breadthStrength = 25;
      evidence.push(`Weak market breadth (A/D ratio: ${advanceDeclineRatio.toFixed(2)})`);
    }

    // New highs vs new lows
    if (breadth.newHighs > breadth.newLows * 2) {
      breadthStrength += 10;
      evidence.push(`More new highs (${breadth.newHighs}) than new lows (${breadth.newLows})`);
    } else if (breadth.newLows > breadth.newHighs * 2) {
      breadthStrength -= 10;
      evidence.push(`More new lows (${breadth.newLows}) than new highs (${breadth.newHighs})`);
    }

    metadata.advanceDeclineRatio = advanceDeclineRatio;
    metadata.breadthStrength = breadthStrength;

    return { advanceDeclineRatio, breadthStrength: Math.max(0, Math.min(100, breadthStrength)) };
  }

  private analyzeSector(
    sectorPerformance: SectorPerformance | null,
    instrumentSector: string,
    evidence: string[],
    metadata: Record<string, number | string | boolean>
  ): { sectorStrength: number; sectorRotation: number } {
    if (!sectorPerformance) {
      evidence.push('Sector performance data unavailable');
      return { sectorStrength: 50, sectorRotation: 0 };
    }

    let sectorStrength = 50;

    // Sector change
    if (sectorPerformance.changePercent > 1) {
      sectorStrength = 75;
      evidence.push(`${instrumentSector} sector strong (+${sectorPerformance.changePercent.toFixed(2)}%)`);
    } else if (sectorPerformance.changePercent > 0.3) {
      sectorStrength = 60;
      evidence.push(`${instrumentSector} sector positive (+${sectorPerformance.changePercent.toFixed(2)}%)`);
    } else if (sectorPerformance.changePercent < -1) {
      sectorStrength = 25;
      evidence.push(`${instrumentSector} sector weak (${sectorPerformance.changePercent.toFixed(2)}%)`);
    } else if (sectorPerformance.changePercent < -0.3) {
      sectorStrength = 35;
      evidence.push(`${instrumentSector} sector negative (${sectorPerformance.changePercent.toFixed(2)}%)`);
    }

    // Advance/Decline within sector
    const sectorADR = sectorPerformance.decliners > 0
      ? sectorPerformance.advancers / sectorPerformance.decliners
      : sectorPerformance.advancers > 0 ? 2 : 1;

    if (sectorADR > 1.5) {
      sectorStrength += 10;
      evidence.push(`Sector breadth positive (A/D: ${sectorPerformance.advancers}/${sectorPerformance.decliners})`);
    } else if (sectorADR < 0.67) {
      sectorStrength -= 10;
      evidence.push(`Sector breadth negative (A/D: ${sectorPerformance.advancers}/${sectorPerformance.decliners})`);
    }

    // Sector rotation (relative strength vs market)
    const sectorRotation = sectorPerformance.relativeStrength;

    metadata.sectorStrength = sectorStrength;
    metadata.sectorRotation = sectorRotation;
    metadata.sectorChange = sectorPerformance.changePercent;

    return { sectorStrength: Math.max(0, Math.min(100, sectorStrength)), sectorRotation };
  }

  private calculateIndexMomentum(
    nifty: IndexData | null,
    bankNifty: IndexData | null,
    evidence: string[],
    metadata: Record<string, number | string | boolean>
  ): number {
    let momentum = 50;

    if (nifty) {
      if (nifty.changePercent > 0.5) momentum += 15;
      else if (nifty.changePercent < -0.5) momentum -= 15;
    }

    if (bankNifty) {
      if (bankNifty.changePercent > 0.5) momentum += 10;
      else if (bankNifty.changePercent < -0.5) momentum -= 10;
    }

    // Both indices aligned
    if (nifty && bankNifty) {
      if (nifty.changePercent > 0 && bankNifty.changePercent > 0) {
        momentum += 5;
        evidence.push('Both Nifty and BankNifty positive - broad market strength');
      } else if (nifty.changePercent < 0 && bankNifty.changePercent < 0) {
        momentum -= 5;
        evidence.push('Both Nifty and BankNifty negative - broad market weakness');
      } else {
        evidence.push('Nifty and BankNifty divergent - mixed signals');
      }
    }

    metadata.indexMomentum = momentum;
    return Math.max(0, Math.min(100, momentum));
  }

  private calculateScore(
    niftyStrength: number,
    bankNiftyStrength: number,
    sectorStrength: number,
    advanceDeclineRatio: number,
    vixLevel: number,
    breadthStrength: number,
    indexMomentum: number
  ): number {
    // Weighted average
    const weights = {
      nifty: 0.25,
      bankNifty: 0.15,
      sector: 0.2,
      breadth: 0.15,
      vix: 0.1,
      momentum: 0.15,
    };

    let vixScore = 50;
    if (vixLevel > 25) vixScore = 30;
    else if (vixLevel > 20) vixScore = 40;
    else if (vixLevel > 15) vixScore = 50;
    else if (vixLevel > 12) vixScore = 60;
    else vixScore = 55;

    return (
      niftyStrength * weights.nifty +
      bankNiftyStrength * weights.bankNifty +
      sectorStrength * weights.sector +
      breadthStrength * weights.breadth +
      vixScore * weights.vix +
      indexMomentum * weights.momentum
    );
  }

  private calculateConfidence(
    nifty: IndexData | null,
    bankNifty: IndexData | null,
    indiaVix: IndexData | null,
    breadth: MarketBreadth | null,
    evidence: string[]
  ): number {
    let confidence = 30;

    if (nifty) confidence += 15;
    if (bankNifty) confidence += 10;
    if (indiaVix) confidence += 10;
    if (breadth) confidence += 10;

    confidence += Math.min(evidence.length * 2, 15);

    return Math.max(0, Math.min(90, confidence));
  }

  private generateReason(
    niftyTrend: TrendDirection,
    bankNiftyTrend: TrendDirection,
    vixSignal: string,
    sectorStrength: number
  ): string {
    const niftyText = niftyTrend === 'uptrend' ? 'bullish' : niftyTrend === 'downtrend' ? 'bearish' : 'neutral';
    const bankNiftyText = bankNiftyTrend === 'uptrend' ? 'bullish' : bankNiftyTrend === 'downtrend' ? 'bearish' : 'neutral';
    const sectorText = sectorStrength > 60 ? 'strong' : sectorStrength < 40 ? 'weak' : 'neutral';

    return `Market context: Nifty ${niftyText}, BankNifty ${bankNiftyText}. ` +
      `Sector performance ${sectorText}. VIX signal: ${vixSignal}. ` +
      `${niftyTrend === bankNiftyTrend ? 'Indices aligned.' : 'Indices divergent - exercise caution.'}`;
  }
}