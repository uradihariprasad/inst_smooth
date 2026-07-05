/**
 * Opportunities Page
 * Detailed view of all ranked opportunities
 */

import React, { useState } from 'react';
import { useAppStore } from '../store/app-store';
import type { RankedOpportunity } from '../../../shared/types/analysis';

export function Opportunities() {
  const { lastResults, setSelectedOpportunity } = useAppStore();
  const [filter, setFilter] = useState<'all' | 'bullish' | 'bearish' | 'neutral'>('all');
  const [sortBy, setSortBy] = useState<'rank' | 'score' | 'confidence'>('rank');

  const opportunities = lastResults?.opportunities ?? [];

  const filtered = opportunities.filter((opp) => {
    if (filter === 'all') return true;
    return opp.tradeBias === filter;
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'score':
        return b.overallScore - a.overallScore;
      case 'confidence':
        return b.confidenceScore - a.confidenceScore;
      default:
        return a.rank - b.rank;
    }
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Top Opportunities</h1>
          <p className="text-gray-400">AI-ranked institutional intraday opportunities</p>
        </div>
        <div className="flex gap-2">
          {(['all', 'bullish', 'bearish', 'neutral'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'rank' | 'score' | 'confidence')}
          className="bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700"
        >
          <option value="rank">Sort by Rank</option>
          <option value="score">Sort by Score</option>
          <option value="confidence">Sort by Confidence</option>
        </select>
      </div>

      {sorted.length === 0 ? (
        <div className="trading-card p-12 text-center">
          <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-400 text-lg">No opportunities match your filters</p>
          <p className="text-gray-500 text-sm mt-2">Try adjusting filters or run a new scan</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sorted.map((opp) => (
            <OpportunityDetailCard
              key={opp.instrumentKey}
              opportunity={opp}
              onClick={() => setSelectedOpportunity(opp)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function OpportunityDetailCard({
  opportunity,
  onClick,
}: {
  opportunity: RankedOpportunity;
  onClick: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const biasColor =
    opportunity.tradeBias === 'bullish'
      ? 'text-green-400 bg-green-900/20 border-green-800'
      : opportunity.tradeBias === 'bearish'
        ? 'text-red-400 bg-red-900/20 border-red-800'
        : 'text-gray-400 bg-gray-800 border-gray-700';

  return (
    <div className="trading-card overflow-hidden">
      <button
        onClick={onClick}
        className="w-full p-4 text-left hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
              #{opportunity.rank}
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">{opportunity.symbol}</h3>
              <p className="text-sm text-gray-400">{opportunity.explanation.whyNow}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${biasColor}`}>
              {opportunity.tradeBias.toUpperCase()}
            </span>
            <span className={`text-sm px-2 py-1 rounded ${
              opportunity.riskLevel === 'low' ? 'bg-green-900/50 text-green-400' :
              opportunity.riskLevel === 'medium' ? 'bg-yellow-900/50 text-yellow-400' :
              opportunity.riskLevel === 'high' ? 'bg-orange-900/50 text-orange-400' :
              'bg-red-900/50 text-red-400'
            }`}>
              {opportunity.riskLevel}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-4">
          <div className="text-center">
            <p className="text-xs text-gray-400">Overall Score</p>
            <p className="text-2xl font-bold text-white">{opportunity.overallScore.toFixed(0)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400">Confidence</p>
            <p className="text-2xl font-bold text-blue-400">{opportunity.confidenceScore.toFixed(0)}%</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400">Entry Zone</p>
            <p className="text-sm font-medium text-white">
              {opportunity.suggestedEntryZone[0].toFixed(2)}
              <br />
              {opportunity.suggestedEntryZone[1].toFixed(2)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400">Stop Loss</p>
            <p className="text-sm font-medium text-red-400">{opportunity.suggestedStopLoss.toFixed(2)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400">Targets</p>
            <div className="text-sm font-medium text-green-400">
              {opportunity.suggestedTargets.slice(0, 2).map((t, i) => (
                <div key={i}>{t.toFixed(2)}</div>
              ))}
            </div>
          </div>
        </div>

        {opportunity.keyDrivers.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {opportunity.keyDrivers.map((driver, i) => (
              <span key={i} className="text-xs px-2 py-1 bg-blue-900/30 text-blue-300 rounded border border-blue-800">
                {driver}
              </span>
            ))}
          </div>
        )}
      </button>

      {/* Expandable Details */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-2 bg-gray-800/50 text-sm text-gray-400 hover:text-white flex items-center justify-center gap-2"
      >
        {isExpanded ? 'Hide Details' : 'Show Details'}
        <svg
          className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="p-4 border-t border-gray-800 space-y-4">
          {/* Why this stock */}
          <div>
            <h4 className="text-sm font-semibold text-gray-300 mb-1">Why This Stock?</h4>
            <p className="text-sm text-gray-400">{opportunity.explanation.whyThisStock}</p>
          </div>

          {/* Module Scores */}
          <div>
            <h4 className="text-sm font-semibold text-gray-300 mb-2">Module Scores</h4>
            <div className="grid grid-cols-4 gap-2">
              <ModuleScore name="Trend" score={opportunity.moduleScores.trend.score} />
              <ModuleScore name="Momentum" score={opportunity.moduleScores.momentum.score} />
              <ModuleScore name="Institutional" score={opportunity.moduleScores.institutional.score} />
              <ModuleScore name="Option Chain" score={opportunity.moduleScores.optionChain.score} />
              <ModuleScore name="Price Structure" score={opportunity.moduleScores.priceStructure.score} />
              <ModuleScore name="Market Context" score={opportunity.moduleScores.marketContext.score} />
              <ModuleScore name="Risk" score={opportunity.moduleScores.risk.score} />
            </div>
          </div>

          {/* Top Evidence */}
          {opportunity.explanation.topEvidence.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-300 mb-2">Top Evidence</h4>
              <ul className="space-y-1">
                {opportunity.explanation.topEvidence.map((evidence, i) => (
                  <li key={i} className="text-sm text-gray-400 flex items-start gap-2">
                    <span className="text-blue-400 mt-1">•</span>
                    {evidence}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings */}
          {opportunity.warnings.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-yellow-400 mb-2">Warnings</h4>
              <ul className="space-y-1">
                {opportunity.warnings.map((warning, i) => (
                  <li key={i} className="text-sm text-yellow-300 flex items-start gap-2">
                    <span className="text-yellow-400 mt-1">⚠</span>
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Invalidation Conditions */}
          {opportunity.invalidationConditions.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-red-400 mb-2">Invalidation Conditions</h4>
              <ul className="space-y-1">
                {opportunity.invalidationConditions.map((condition, i) => (
                  <li key={i} className="text-sm text-red-300 flex items-start gap-2">
                    <span className="text-red-400 mt-1">✕</span>
                    {condition}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ModuleScore({ name, score }: { name: string; score: number }) {
  const color = score >= 60 ? 'text-green-400' : score >= 40 ? 'text-yellow-400' : 'text-red-400';
  const bgColor = score >= 60 ? 'bg-green-900/30' : score >= 40 ? 'bg-yellow-900/30' : 'bg-red-900/30';

  return (
    <div className={`p-2 rounded ${bgColor}`}>
      <p className="text-xs text-gray-400">{name}</p>
      <p className={`text-lg font-bold ${color}`}>{score.toFixed(0)}</p>
    </div>
  );
}