/**
 * Option Chain Intelligence Module
 * Analyzes OI, Change OI, Writing, Unwinding, IV, and Strike Strength
 * Pure, independently testable service
 */

import type { FeatureSet, OptionChainOutput } from '../../../shared/types/analysis';
import type { OptionChain, OptionChainEntry } from '../../../shared/types/market';

export class OptionChainIntelligenceModule {
  analyze(
    features: FeatureSet,
    optionChain: OptionChain | null
  ): OptionChainOutput {
    const evidence: string[] = [];
    const metadata: Record<string, number | string | boolean> = {};

    if (!optionChain) {
      evidence.push('Option chain data unavailable - cannot perform option analysis');
      return this.createEmptyOutput(evidence, metadata);
    }

    // Calculate all option chain metrics
    const callWriting = this.assessCallWriting(optionChain, evidence, metadata);
    const putWriting = this.assessPutWriting(optionChain, evidence, metadata);
    const callUnwinding = this.assessCallUnwinding(optionChain, evidence, metadata);
    const putUnwinding = this.assessPutUnwinding(optionChain, evidence, metadata);
    const atmActivity = this.assessATMActivity(optionChain, evidence, metadata);
    const pcr = optionChain.pcr;
    const ivRank = this.calculateIVRank(optionChain, evidence, metadata);
    const maxPainDistance = this.calculateMaxPainDistance(optionChain, evidence, metadata);
    const dynamicSupport = this.identifyDynamicSupport(optionChain, evidence);
    const dynamicResistance = this.identifyDynamicResistance(optionChain, evidence);
    const strikeStrength = this.calculateStrikeStrength(optionChain);

    metadata.pcr = pcr;
    metadata.atmStrike = optionChain.atmStrike;
    metadata.maxPainStrike = optionChain.maxPainStrike;

    // Calculate score
    const score = this.calculateScore(
      callWriting,
      putWriting,
      callUnwinding,
      putUnwinding,
      atmActivity,
      pcr,
      ivRank,
      features
    );

    const confidence = this.calculateConfidence(optionChain, evidence);

    return {
      score,
      confidence,
      reason: this.generateReason(callWriting, putWriting, pcr, optionChain),
      evidence,
      metadata,
      callWriting,
      putWriting,
      callUnwinding,
      putUnwinding,
      atmActivity,
      pcr,
      ivRank,
      maxPainDistance,
      dynamicSupport,
      dynamicResistance,
      strikeStrength,
    };
  }

  private createEmptyOutput(
    evidence: string[],
    metadata: Record<string, number | string | boolean>
  ): OptionChainOutput {
    return {
      score: 50,
      confidence: 20,
      reason: 'Option chain data unavailable - cannot perform analysis',
      evidence,
      metadata,
      callWriting: 0,
      putWriting: 0,
      callUnwinding: 0,
      putUnwinding: 0,
      atmActivity: 0,
      pcr: 1,
      ivRank: 50,
      maxPainDistance: 0,
      dynamicSupport: [],
      dynamicResistance: [],
      strikeStrength: {},
    };
  }

  private assessCallWriting(
    optionChain: OptionChain,
    evidence: string[],
    metadata: Record<string, number | string | boolean>
  ): number {
    const calls = optionChain.calls;
    const currentPrice = optionChain.underlyingPrice;

    // Look for OI increase in OTM calls (above current price)
    const otmCalls = calls.filter((c) => c.strike > currentPrice);
    const totalOTMCallOI = otmCalls.reduce((sum, c) => sum + c.openInterest, 0);
    const avgOTMCallOI = otmCalls.length > 0 ? totalOTMCallOI / otmCalls.length : 0;

    // Identify concentrated call writing (resistance building)
    let concentratedOI = 0;
    for (const call of otmCalls) {
      if (call.openInterest > avgOTMCallOI * 2) {
        concentratedOI += call.openInterest;
        evidence.push(`Heavy call writing at strike ${call.strike} (OI: ${call.openInterest.toLocaleString()})`);
      }
    }

    const score = Math.min(100, (concentratedOI / 100000) * 30 + 30);
    metadata.callWritingOI = concentratedOI;
    metadata.totalOTMCallOI = totalOTMCallOI;

    return score;
  }

  private assessPutWriting(
    optionChain: OptionChain,
    evidence: string[],
    metadata: Record<string, number | string | boolean>
  ): number {
    const puts = optionChain.puts;
    const currentPrice = optionChain.underlyingPrice;

    // Look for OI increase in OTM puts (below current price)
    const otmPuts = puts.filter((p) => p.strike < currentPrice);
    const totalOTMPutOI = otmPuts.reduce((sum, p) => sum + p.openInterest, 0);
    const avgOTMPutOI = otmPuts.length > 0 ? totalOTMPutOI / otmPuts.length : 0;

    // Identify concentrated put writing (support building)
    let concentratedOI = 0;
    for (const put of otmPuts) {
      if (put.openInterest > avgOTMPutOI * 2) {
        concentratedOI += put.openInterest;
        evidence.push(`Heavy put writing at strike ${put.strike} (OI: ${put.openInterest.toLocaleString()})`);
      }
    }

    const score = Math.min(100, (concentratedOI / 100000) * 30 + 30);
    metadata.putWritingOI = concentratedOI;
    metadata.totalOTMPutOI = totalOTMPutOI;

    return score;
  }

  private assessCallUnwinding(
    optionChain: OptionChain,
    evidence: string[],
    metadata: Record<string, number | string | boolean>
  ): number {
    // Call unwinding = decrease in call OI (bullish signal)
    const calls = optionChain.calls;
    const currentPrice = optionChain.underlyingPrice;

    // Look for negative change in OI for ITM calls
    const itmCalls = calls.filter((c) => c.strike < currentPrice);
    let unwindingScore = 0;

    for (const call of itmCalls) {
      if (call.changeInOI < 0 && Math.abs(call.changeInOI) > call.openInterest * 0.1) {
        unwindingScore += Math.abs(call.changeInOI);
        evidence.push(`Call unwinding at strike ${call.strike} (Change OI: ${call.changeInOI.toLocaleString()})`);
      }
    }

    metadata.callUnwindingOI = unwindingScore;
    return Math.min(100, (unwindingScore / 50000) * 30 + 20);
  }

  private assessPutUnwinding(
    optionChain: OptionChain,
    evidence: string[],
    metadata: Record<string, number | string | boolean>
  ): number {
    // Put unwinding = decrease in put OI (bearish signal)
    const puts = optionChain.puts;
    const currentPrice = optionChain.underlyingPrice;

    // Look for negative change in OI for ITM puts
    const itmPuts = puts.filter((p) => p.strike > currentPrice);
    let unwindingScore = 0;

    for (const put of itmPuts) {
      if (put.changeInOI < 0 && Math.abs(put.changeInOI) > put.openInterest * 0.1) {
        unwindingScore += Math.abs(put.changeInOI);
        evidence.push(`Put unwinding at strike ${put.strike} (Change OI: ${put.changeInOI.toLocaleString()})`);
      }
    }

    metadata.putUnwindingOI = unwindingScore;
    return Math.min(100, (unwindingScore / 50000) * 30 + 20);
  }

  private assessATMActivity(
    optionChain: OptionChain,
    evidence: string[],
    metadata: Record<string, number | string | boolean>
  ): number {
    const atmStrike = optionChain.atmStrike;
    const atmCall = optionChain.calls.find((c) => c.strike === atmStrike);
    const atmPut = optionChain.puts.find((p) => p.strike === atmStrike);

    let score = 0;

    if (atmCall) {
      score += atmCall.volume > 50000 ? 25 : atmCall.volume > 10000 ? 15 : 5;
      if (atmCall.openInterest > 100000) {
        evidence.push(`High ATM call OI (${atmCall.openInterest.toLocaleString()}) at ${atmStrike}`);
      }
    }

    if (atmPut) {
      score += atmPut.volume > 50000 ? 25 : atmPut.volume > 10000 ? 15 : 5;
      if (atmPut.openInterest > 100000) {
        evidence.push(`High ATM put OI (${atmPut.openInterest.toLocaleString()}) at ${atmStrike}`);
      }
    }

    // Compare ATM activity to nearby strikes
    const nearbyCalls = optionChain.calls.filter(
      (c) => Math.abs(c.strike - atmStrike) / atmStrike < 0.02
    );
    const nearbyPuts = optionChain.puts.filter(
      (p) => Math.abs(p.strike - atmStrike) / atmStrike < 0.02
    );

    const nearbyCallOI = nearbyCalls.reduce((sum, c) => sum + c.openInterest, 0);
    const nearbyPutOI = nearbyPuts.reduce((sum, p) => sum + p.openInterest, 0);

    if (nearbyCallOI + nearbyPutOI > 0) {
      const totalNearby = nearbyCallOI + nearbyPutOI;
      score += Math.min(25, totalNearby / 10000);
    }

    metadata.atmCallOI = atmCall?.openInterest ?? 0;
    metadata.atmPutOI = atmPut?.openInterest ?? 0;
    metadata.nearbyCallOI = nearbyCallOI;
    metadata.nearbyPutOI = nearbyPutOI;

    return Math.min(100, score);
  }

  private calculateIVRank(
    optionChain: OptionChain,
    evidence: string[],
    metadata: Record<string, number | string | boolean>
  ): number {
    const calls = optionChain.calls;
    const puts = optionChain.puts;

    const allIVs = [
      ...calls.map((c) => c.impliedVolatility),
      ...puts.map((p) => p.impliedVolatility),
    ].filter((iv) => iv > 0);

    if (allIVs.length === 0) {
      evidence.push('IV data unavailable');
      return 50;
    }

    const avgIV = allIVs.reduce((sum, iv) => sum + iv, 0) / allIVs.length;
    const maxIV = Math.max(...allIVs);
    const minIV = Math.min(...allIVs);

    const ivRange = maxIV - minIV;
    const ivRank = ivRange > 0 ? ((avgIV - minIV) / ivRange) * 100 : 50;

    if (ivRank > 70) {
      evidence.push(`High IV environment (${ivRank.toFixed(0)}% rank) - options expensive`);
    } else if (ivRank < 30) {
      evidence.push(`Low IV environment (${ivRank.toFixed(0)}% rank) - options cheap`);
    }

    metadata.avgIV = avgIV;
    metadata.ivRange = ivRange;

    return ivRank;
  }

  private calculateMaxPainDistance(
    optionChain: OptionChain,
    evidence: string[],
    metadata: Record<string, number | string | boolean>
  ): number {
    const currentPrice = optionChain.underlyingPrice;
    const maxPain = optionChain.maxPainStrike;

    const distance = currentPrice !== 0 ? ((maxPain - currentPrice) / currentPrice) * 100 : 0;

    if (Math.abs(distance) < 0.5) {
      evidence.push(`Price near max pain (${maxPain}) - low directional expectation`);
    } else if (distance > 1) {
      evidence.push(`Max pain above current price (${distance.toFixed(2)}%) - potential upward pull`);
    } else if (distance < -1) {
      evidence.push(`Max pain below current price (${distance.toFixed(2)}%) - potential downward pull`);
    }

    metadata.maxPainStrike = maxPain;
    metadata.maxPainDistance = distance;

    return distance;
  }

  private identifyDynamicSupport(
    optionChain: OptionChain,
    evidence: string[]
  ): number[] {
    const puts = optionChain.puts;
    const currentPrice = optionChain.underlyingPrice;

    // Strong put OI below current price acts as support
    const supportStrikes: Array<{ strike: number; strength: number }> = [];

    for (const put of puts) {
      if (put.strike < currentPrice) {
        const distance = currentPrice - put.strike;
        const strength = put.openInterest / (distance + 1);
        if (put.openInterest > 50000) {
          supportStrikes.push({ strike: put.strike, strength });
        }
      }
    }

    const supports = supportStrikes
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 3)
      .map((s) => s.strike);

    if (supports.length > 0) {
      evidence.push(`Dynamic support levels at strikes: ${supports.join(', ')}`);
    }

    return supports;
  }

  private identifyDynamicResistance(
    optionChain: OptionChain,
    evidence: string[]
  ): number[] {
    const calls = optionChain.calls;
    const currentPrice = optionChain.underlyingPrice;

    // Strong call OI above current price acts as resistance
    const resistanceStrikes: Array<{ strike: number; strength: number }> = [];

    for (const call of calls) {
      if (call.strike > currentPrice) {
        const distance = call.strike - currentPrice;
        const strength = call.openInterest / (distance + 1);
        if (call.openInterest > 50000) {
          resistanceStrikes.push({ strike: call.strike, strength });
        }
      }
    }

    const resistances = resistanceStrikes
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 3)
      .map((r) => r.strike);

    if (resistances.length > 0) {
      evidence.push(`Dynamic resistance levels at strikes: ${resistances.join(', ')}`);
    }

    return resistances;
  }

  private calculateStrikeStrength(
    optionChain: OptionChain
  ): Record<number, number> {
    const strikeStrength: Record<number, number> = {};

    for (const call of optionChain.calls) {
      const existing = strikeStrength[call.strike] ?? 0;
      strikeStrength[call.strike] = existing + call.openInterest + call.volume;
    }

    for (const put of optionChain.puts) {
      const existing = strikeStrength[put.strike] ?? 0;
      strikeStrength[put.strike] = existing + put.openInterest + put.volume;
    }

    return strikeStrength;
  }

  private calculateScore(
    callWriting: number,
    putWriting: number,
    callUnwinding: number,
    putUnwinding: number,
    atmActivity: number,
    pcr: number,
    ivRank: number,
    features: FeatureSet
  ): number {
    let score = 50;

    // PCR contribution
    if (pcr > 1.2) score += 15; // Bullish
    else if (pcr < 0.8) score -= 10; // Bearish
    else score += 0; // Neutral

    // Put writing = support = bullish
    score += putWriting * 0.1;

    // Call writing = resistance = bearish
    score -= callWriting * 0.05;

    // Call unwinding = bullish
    score += callUnwinding * 0.1;

    // Put unwinding = bearish
    score -= putUnwinding * 0.05;

    // ATM activity adds conviction
    score += atmActivity * 0.05;

    return Math.max(0, Math.min(100, score));
  }

  private calculateConfidence(optionChain: OptionChain, evidence: string[]): number {
    let confidence = 50;

    // Data completeness
    if (optionChain.calls.length > 0) confidence += 10;
    if (optionChain.puts.length > 0) confidence += 10;
    if (optionChain.pcr > 0) confidence += 5;

    // Evidence
    confidence += Math.min(evidence.length * 2, 15);

    return Math.max(0, Math.min(90, confidence));
  }

  private generateReason(
    callWriting: number,
    putWriting: number,
    pcr: number,
    optionChain: OptionChain
  ): string {
    const pcrText = pcr > 1.2 ? 'bullish' : pcr < 0.8 ? 'bearish' : 'neutral';
    const dominant = putWriting > callWriting ? 'put writing' : 'call writing';

    return `Option chain shows ${pcrText} PCR of ${pcr.toFixed(2)}. ` +
      `${dominant} is dominant. ` +
      `Max pain at ${optionChain.maxPainStrike}. ` +
      `Total call OI: ${optionChain.totalCallOI.toLocaleString()}, ` +
      `Total put OI: ${optionChain.totalPutOI.toLocaleString()}.`;
  }
}