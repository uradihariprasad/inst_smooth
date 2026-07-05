/**
 * Risk Dashboard Page
 * Shows risk assessment for all opportunities
 */

import React from 'react';
import { useAppStore } from '../store/app-store';
import type { RankedOpportunity } from '../../../shared/types/analysis';

export function RiskDashboard() {
  const { lastResults, setSelectedOpportunity } = useAppStore();

  const opportunities = lastResults?.opportunities ?? [];

  // Calculate risk statistics
  const riskStats = {
    low: opportunities.filter((o) => o.riskLevel === 'low').length,
    medium: opportunities.filter((o) => o.riskLevel === 'medium').length,
    high: opportunities.filter((o) => o.riskLevel === 'high').length,
    extreme: opportunities.filter((o) => o.riskLevel === 'extreme').length,
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Risk Dashboard</h1>
        <p className="text-gray-400">Risk assessment and rejection analysis</p>
      </div>

      {/* Risk Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <RiskCard label="Low Risk" count={riskStats.low} color="bg-green-600" textColor="text-green-400" />
        <RiskCard label="Medium Risk" count={riskStats.medium} color="bg-yellow-600" textColor="text-yellow-400" />
        <RiskCard label="High Risk" count={riskStats.high} color="bg-orange-600" textColor="text-orange-400" />
        <RiskCard label="Extreme Risk" count={riskStats.extreme} color="bg-red-600" textColor="text-red-400" />
      </div>

      {/* Risk Details */}
      <div className="trading-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Risk Assessment Details</h2>

        {opportunities.length === 0 ? (
          <div className="text-center py-8">
            <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-gray-400">No opportunities to assess</p>
          </div>
        ) : (
          <div className="space-y-3">
            {opportunities.map((opp) => (
              <RiskRow
                key={opp.instrumentKey}
                opportunity={opp}
                onClick={() => setSelectedOpportunity(opp)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Risk Factors */}
      {opportunities.length > 0 && (
        <div className="trading-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Risk Factors Analysis</h2>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">Liquidity Scores</h3>
              <div className="space-y-2">
                {opportunities.slice(0, 5).map((opp) => (
                  <div key={opp.instrumentKey} className="flex items-center gap-3">
                    <span className="text-sm text-gray-300 w-20">{opp.symbol}</span>
                    <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          opp.moduleScores.risk.liquidityScore > 70
                            ? 'bg-green-500'
                            : opp.moduleScores.risk.liquidityScore > 50
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                        }`}
                        style={{ width: `${opp.moduleScores.risk.liquidityScore}%` }}
                      />
                    </div>
                    <span className="text-sm text-white w-10 text-right">
                      {opp.moduleScores.risk.liquidityScore.toFixed(0)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">Reward/Risk Ratios</h3>
              <div className="space-y-2">
                {opportunities.slice(0, 5).map((opp) => (
                  <div key={opp.instrumentKey} className="flex items-center gap-3">
                    <span className="text-sm text-gray-300 w-20">{opp.symbol}</span>
                    <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          opp.moduleScores.risk.rewardRiskRatio > 2
                            ? 'bg-green-500'
                            : opp.moduleScores.risk.rewardRiskRatio > 1
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(opp.moduleScores.risk.rewardRiskRatio * 25, 100)}%` }}
                      />
                    </div>
                    <span className="text-sm text-white w-10 text-right">
                      {opp.moduleScores.risk.rewardRiskRatio.toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Common Rejection Reasons */}
      {opportunities.length > 0 && (
        <div className="trading-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Common Risk Concerns</h2>
          <div className="flex flex-wrap gap-2">
            {getUniqueRejectionReasons(opportunities).map((reason, i) => (
              <span
                key={i}
                className="px-3 py-1.5 bg-red-900/30 text-red-300 rounded-lg text-sm border border-red-800"
              >
                {reason}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RiskCard({
  label,
  count,
  color,
  textColor,
}: {
  label: string;
  count: number;
  color: string;
  textColor: string;
}) {
  return (
    <div className="trading-card p-4">
      <div className="flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${color}`} />
        <span className="text-sm text-gray-400">{label}</span>
      </div>
      <p className={`text-3xl font-bold mt-2 ${textColor}`}>{count}</p>
    </div>
  );
}

function RiskRow({
  opportunity,
  onClick,
}: {
  opportunity: RankedOpportunity;
  onClick: () => void;
}) {
  const riskColor =
    opportunity.riskLevel === 'low'
      ? 'text-green-400 bg-green-900/20'
      : opportunity.riskLevel === 'medium'
        ? 'text-yellow-400 bg-yellow-900/20'
        : opportunity.riskLevel === 'high'
          ? 'text-orange-400 bg-orange-900/20'
          : 'text-red-400 bg-red-900/20';

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors text-left"
    >
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-white">{opportunity.symbol}</span>
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${riskColor}`}>
          {opportunity.riskLevel}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-xs text-gray-400">Risk Score</p>
          <p className="text-sm font-medium text-white">
            {opportunity.moduleScores.risk.score.toFixed(0)}/100
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">R/R Ratio</p>
          <p className="text-sm font-medium text-white">
            {opportunity.moduleScores.risk.rewardRiskRatio.toFixed(1)}
          </p>
        </div>
      </div>
    </button>
  );
}

function getUniqueRejectionReasons(opportunities: RankedOpportunity[]): string[] {
  const reasons = new Set<string>();
  for (const opp of opportunities) {
    for (const reason of opp.moduleScores.risk.rejectionReasons) {
      reasons.add(reason);
    }
  }
  return Array.from(reasons);
}