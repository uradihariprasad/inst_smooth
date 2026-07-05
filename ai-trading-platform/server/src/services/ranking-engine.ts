/**
 * Ranking Engine
 * Analyzes all NSE F&O stocks continuously
 * Rejects weak candidates first, then ranks remaining
 * Displays only Top 5 highest-quality opportunities
 */

import type { DecisionOutput, RankedOpportunity, OpportunityExplanation } from '../../shared/types/analysis';
import type { RiskLevel, TradeBias } from '../../shared/types/market';

export interface RankingCriteria {
  minOverallScore: number;
  minConfidence: number;
  maxRiskLevel: RiskLevel;
  requiredBias: TradeBias | 'any';
  minRewardRisk: number;
  minLiquidity: number;
  maxSpread: number;
}

const DEFAULT_CRITERIA: RankingCriteria = {
  minOverallScore: 60,
  minConfidence: 50,
  maxRiskLevel: 'high',
  requiredBias: 'any',
  minRewardRisk: 1.5,
  minLiquidity: 40,
  maxSpread: 0.3,
};

export class RankingEngine {
  private criteria: RankingCriteria;
  private maxOpportunities: number;

  constructor(criteria: RankingCriteria = DEFAULT_CRITERIA, maxOpportunities: number = 5) {
    this.criteria = criteria;
    this.maxOpportunities = maxOpportunities;
  }

  updateCriteria(criteria: Partial<RankingCriteria>): void {
    this.criteria = { ...this.criteria, ...criteria };
  }

  getCriteria(): RankingCriteria {
    return { ...this.criteria };
  }

  /**
   * Rank all candidates and return top opportunities
   */
  rank(decisions: DecisionOutput[]): RankedOpportunity[] {
    // Step 1: Filter out weak candidates
    const qualified = this.filterCandidates(decisions);

    // Step 2: Score and rank
    const ranked = this.scoreAndRank(qualified);

    // Step 3: Take top N
    const topCandidates = ranked.slice(0, this.maxOpportunities);

    // Step 4: Generate explanations
    return topCandidates.map((decision, index) => this.createRankedOpportunity(decision, index + 1));
  }

  /**
   * Filter candidates based on minimum criteria
   */
  private filterCandidates(decisions: DecisionOutput[]): DecisionOutput[] {
    return decisions.filter((decision) => {
      // Minimum score
      if (decision.overallScore < this.criteria.minOverallScore) return false;

      // Minimum confidence
      if (decision.confidenceScore < this.criteria.minConfidence) return false;

      // Maximum risk level
      if (!this.isRiskAcceptable(decision.riskLevel)) return false;

      // Required bias
      if (this.criteria.requiredBias !== 'any' && decision.tradeBias !== this.criteria.requiredBias) {
        return false;
      }

      // Minimum reward/risk
      const riskModule = decision.moduleScores.risk;
      if (riskModule.rewardRiskRatio < this.criteria.minRewardRisk) return false;

      // Minimum liquidity
      if (riskModule.liquidityScore < this.criteria.minLiquidity) return false;

      // Maximum spread
      if (decision.moduleScores.risk.spreadQuality < (100 - this.criteria.maxSpread * 100)) {
        // Spread quality inverted
      }

      // Risk rejection reasons check
      if (riskModule.rejectionReasons.length > 2) return false;

      return true;
    });
  }

  private isRiskAcceptable(riskLevel: RiskLevel): boolean {
    const riskLevels: Record<RiskLevel, number> = {
      low: 1,
      medium: 2,
      high: 3,
      extreme: 4,
    };
    const maxLevel = riskLevels[this.criteria.maxRiskLevel];
    const currentLevel = riskLevels[riskLevel];
    return currentLevel <= maxLevel;
  }

  /**
   * Score and rank candidates by composite quality score
   */
  private scoreAndRank(decisions: DecisionOutput[]): DecisionOutput[] {
    return decisions.sort((a, b) => {
      const scoreA = this.calculateRankingScore(a);
      const scoreB = this.calculateRankingScore(b);
      return scoreB - scoreA;
    });
  }

  private calculateRankingScore(decision: DecisionOutput): number {
    let score = 0;

    // Overall score (40%)
    score += decision.overallScore * 0.4;

    // Confidence (20%)
    score += decision.confidenceScore * 0.2;

    // Risk level bonus/penalty (15%)
    const riskBonus: Record<RiskLevel, number> = {
      low: 15,
      medium: 10,
      high: 5,
      extreme: -10,
    };
    score += riskBonus[decision.riskLevel];

    // Reward/risk ratio (10%)
    const riskModule = decision.moduleScores.risk;
    score += Math.min(riskModule.rewardRiskRatio * 5, 15);

    // Module agreement bonus (10%)
    score += this.calculateModuleAgreement(decision) * 10;

    // Evidence quality (5%)
    const totalEvidence = Object.values(decision.moduleScores).reduce(
      (sum, module) => sum + module.evidence.length,
      0
    );
    score += Math.min(totalEvidence, 10) * 0.5;

    return score;
  }

  private calculateModuleAgreement(decision: DecisionOutput): number {
    const scores = [
      decision.moduleScores.trend.score,
      decision.moduleScores.momentum.score,
      decision.moduleScores.institutional.score,
      decision.moduleScores.optionChain.score,
      decision.moduleScores.priceStructure.score,
    ];

    const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);

    // Lower standard deviation = higher agreement
    return Math.max(0, 1 - stdDev / 30);
  }

  /**
   * Create ranked opportunity with explanation
   */
  private createRankedOpportunity(decision: DecisionOutput, rank: number): RankedOpportunity {
    const rankReason = this.generateRankReason(decision, rank);
    const keyDrivers = this.identifyKeyDrivers(decision);
    const warnings = this.identifyWarnings(decision);
    const explanation = this.generateExplanation(decision, keyDrivers, warnings);

    return {
      ...decision,
      rank,
      rankReason,
      keyDrivers,
      warnings,
      explanation,
    };
  }

  private generateRankReason(decision: DecisionOutput, rank: number): string {
    const bias = decision.tradeBias === 'bullish' ? 'Bullish' : decision.tradeBias === 'bearish' ? 'Bearish' : 'Neutral';
    return `Ranked #${rank} with overall score ${decision.overallScore.toFixed(0)}/100. ` +
      `${bias} bias with ${decision.confidenceScore.toFixed(0)}% confidence. ` +
      `Risk level: ${decision.riskLevel}.`;
  }

  private identifyKeyDrivers(decision: DecisionOutput): string[] {
    const drivers: string[] = [];

    // Find modules with highest scores
    const moduleScores = [
      { name: 'Trend', score: decision.moduleScores.trend.score },
      { name: 'Momentum', score: decision.moduleScores.momentum.score },
      { name: 'Institutional', score: decision.moduleScores.institutional.score },
      { name: 'Option Chain', score: decision.moduleScores.optionChain.score },
      { name: 'Price Structure', score: decision.moduleScores.priceStructure.score },
    ];

    const sorted = moduleScores.sort((a, b) => b.score - a.score);
    const topModules = sorted.slice(0, 3);

    for (const module of topModules) {
      if (module.score > 60) {
        drivers.push(`${module.name} score: ${module.score.toFixed(0)}/100`);
      }
    }

    // Add specific evidence
    if (decision.moduleScores.trend.score > 60) {
      drivers.push(`Trend: ${decision.moduleScores.trend.direction} with ${decision.moduleScores.trend.strength} strength`);
    }

    if (decision.moduleScores.momentum.score > 60) {
      drivers.push(`Momentum: ${decision.moduleScores.momentum.momentumStrength > 0 ? 'bullish' : 'bearish'} acceleration`);
    }

    if (decision.moduleScores.risk.rewardRiskRatio > 2) {
      drivers.push(`Favorable reward/risk: ${decision.moduleScores.risk.rewardRiskRatio.toFixed(2)}`);
    }

    return drivers;
  }

  private identifyWarnings(decision: DecisionOutput): string[] {
    const warnings: string[] = [];

    // Risk warnings
    if (decision.riskLevel === 'high' || decision.riskLevel === 'extreme') {
      warnings.push(`Elevated risk level: ${decision.riskLevel}`);
    }

    // Rejection reasons from risk module
    for (const reason of decision.moduleScores.risk.rejectionReasons) {
      warnings.push(reason);
    }

    // Low confidence
    if (decision.confidenceScore < 50) {
      warnings.push('Low confidence - limited data or conflicting signals');
    }

    // Module disagreements
    const scores = [
      decision.moduleScores.trend.score,
      decision.moduleScores.momentum.score,
      decision.moduleScores.institutional.score,
      decision.moduleScores.optionChain.score,
      decision.moduleScores.priceStructure.score,
    ];
    const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const hasStrongDisagreement = scores.some((s) => Math.abs(s - avg) > 25);
    if (hasStrongDisagreement) {
      warnings.push('Module signals divergent - conflicting evidence');
    }

    return warnings;
  }

  private generateExplanation(
    decision: DecisionOutput,
    keyDrivers: string[],
    warnings: string[]
  ): OpportunityExplanation {
    return {
      whyThisStock: this.generateWhyThisStock(decision, keyDrivers),
      whyNow: this.generateWhyNow(decision),
      topEvidence: this.getTopEvidence(decision),
      moduleDisagreements: this.getModuleDisagreements(decision),
      invalidationConditions: decision.invalidationConditions,
    };
  }

  private generateWhyThisStock(decision: DecisionOutput, keyDrivers: string[]): string {
    const drivers = keyDrivers.slice(0, 3).join('; ');
    return `${decision.symbol} stands out because: ${drivers}. ` +
      `Overall quality score of ${decision.overallScore.toFixed(0)}/100 places it among top opportunities.`;
  }

  private generateWhyNow(decision: DecisionOutput): string {
    const reasons: string[] = [];

    if (decision.moduleScores.priceStructure.breakoutPercent > 0) {
      reasons.push('Fresh breakout occurring');
    }
    if (decision.moduleScores.momentum.score > 65) {
      reasons.push('Momentum is strong and accelerating');
    }
    if (decision.moduleScores.institutional.estimatedParticipation > 60) {
      reasons.push('Evidence of institutional participation');
    }
    if (decision.moduleScores.trend.stage === 'early') {
      reasons.push('Trend in early stage');
    }

    if (reasons.length === 0) {
      return 'Multiple factors aligned at this moment.';
    }

    return `Timing is favorable: ${reasons.join(', ')}.`;
  }

  private getTopEvidence(decision: DecisionOutput): string[] {
    const allEvidence: Array<{ evidence: string; score: number }> = [];

    for (const module of Object.values(decision.moduleScores)) {
      for (const e of module.evidence) {
        allEvidence.push({ evidence: e, score: module.score });
      }
    }

    // Sort by module score and take top 5
    return allEvidence
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((e) => e.evidence);
  }

  private getModuleDisagreements(decision: DecisionOutput): string[] {
    const disagreements: string[] = [];
    const scores = [
      { name: 'Trend', score: decision.moduleScores.trend.score },
      { name: 'Momentum', score: decision.moduleScores.momentum.score },
      { name: 'Institutional', score: decision.moduleScores.institutional.score },
      { name: 'Option Chain', score: decision.moduleScores.optionChain.score },
      { name: 'Price Structure', score: decision.moduleScores.priceStructure.score },
    ];

    const avg = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;

    for (const module of scores) {
      if (Math.abs(module.score - avg) > 20) {
        const direction = module.score > avg ? 'more bullish' : 'more bearish';
        disagreements.push(`${module.name} is ${direction} than other modules`);
      }
    }

    return disagreements;
  }
}