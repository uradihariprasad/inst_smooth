/**
 * Stock Detail Page
 * Comprehensive view of a single opportunity with all intelligence modules
 */

import React, { useState } from 'react';
import type { RankedOpportunity } from '../../../shared/types/analysis';

interface StockDetailProps {
  opportunity: RankedOpportunity;
}

export function StockDetail({ opportunity }: StockDetailProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'trend' | 'momentum' | 'institutional' | 'options' | 'structure' | 'risk'>('overview');

  const tabs = [
    { id: 'overview' as const, label: 'Overview' },
    { id: 'trend' as const, label: 'Trend' },
    { id: 'momentum' as const, label: 'Momentum' },
    { id: 'institutional' as const, label: 'Institutional' },
    { id: 'options' as const, label: 'Options' },
    { id: 'structure' as const, label: 'Structure' },
    { id: 'risk' as const, label: 'Risk' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{opportunity.symbol}</h1>
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
              opportunity.tradeBias === 'bullish'
                ? 'bg-green-900/30 text-green-400 border border-green-800'
                : opportunity.tradeBias === 'bearish'
                  ? 'bg-red-900/30 text-red-400 border border-red-800'
                  : 'bg-gray-800 text-gray-400 border border-gray-700'
            }`}>
              {opportunity.tradeBias.toUpperCase()}
            </span>
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              opportunity.riskLevel === 'low' ? 'bg-green-900/50 text-green-400' :
              opportunity.riskLevel === 'medium' ? 'bg-yellow-900/50 text-yellow-400' :
              opportunity.riskLevel === 'high' ? 'bg-orange-900/50 text-orange-400' :
              'bg-red-900/50 text-red-400'
            }`}>
              {opportunity.riskLevel} risk
            </span>
          </div>
          <p className="text-gray-400 mt-1">Rank #{opportunity.rank}</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-white">{opportunity.overallScore.toFixed(0)}/100</p>
          <p className="text-sm text-gray-400">Overall Score</p>
        </div>
      </div>

      {/* Score Cards */}
      <div className="grid grid-cols-4 gap-4">
        <ScoreCard label="Confidence" value={opportunity.confidenceScore} suffix="%" />
        <ScoreCard label="Entry Low" value={opportunity.suggestedEntryZone[0]} prefix="₹" />
        <ScoreCard label="Entry High" value={opportunity.suggestedEntryZone[1]} prefix="₹" />
        <ScoreCard label="Stop Loss" value={opportunity.suggestedStopLoss} prefix="₹" isNegative />
      </div>

      {/* Targets */}
      <div className="trading-card p-4">
        <h3 className="text-sm font-medium text-gray-400 mb-3">Profit Targets</h3>
        <div className="flex gap-4">
          {opportunity.suggestedTargets.map((target, i) => (
            <div key={i} className="flex-1 bg-green-900/20 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-400">T{i + 1}</p>
              <p className="text-lg font-bold text-green-400">₹{target.toFixed(2)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-800">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && <OverviewTab opportunity={opportunity} />}
      {activeTab === 'trend' && <ModuleTab
        name="Trend Intelligence"
        score={opportunity.moduleScores.trend.score}
        confidence={opportunity.moduleScores.trend.confidence}
        reason={opportunity.moduleScores.trend.reason}
        evidence={opportunity.moduleScores.trend.evidence}
        metrics={[
          { label: 'Direction', value: opportunity.moduleScores.trend.direction },
          { label: 'Strength', value: opportunity.moduleScores.trend.strength },
          { label: 'Quality', value: opportunity.moduleScores.trend.quality },
          { label: 'Stage', value: opportunity.moduleScores.trend.stage },
          { label: 'Persistence', value: `${opportunity.moduleScores.trend.persistence.toFixed(1)}%` },
          { label: 'Slope', value: `${opportunity.moduleScores.trend.slope.toFixed(2)}%` },
        ]}
      />}
      {activeTab === 'momentum' && <ModuleTab
        name="Momentum Intelligence"
        score={opportunity.moduleScores.momentum.score}
        confidence={opportunity.moduleScores.momentum.confidence}
        reason={opportunity.moduleScores.momentum.reason}
        evidence={opportunity.moduleScores.momentum.evidence}
        metrics={[
          { label: 'Strength', value: opportunity.moduleScores.momentum.momentumStrength.toFixed(1) },
          { label: 'Acceleration', value: opportunity.moduleScores.momentum.acceleration.toFixed(2) },
          { label: 'Volume Expansion', value: `${opportunity.moduleScores.momentum.volumeExpansion.toFixed(2)}x` },
          { label: 'Range Expansion', value: `${opportunity.moduleScores.momentum.rangeExpansion.toFixed(2)}x` },
        ]}
      />}
      {activeTab === 'institutional' && <ModuleTab
        name="Institutional Intelligence"
        score={opportunity.moduleScores.institutional.score}
        confidence={opportunity.moduleScores.institutional.confidence}
        reason={opportunity.moduleScores.institutional.reason}
        evidence={opportunity.moduleScores.institutional.evidence}
        metrics={[
          { label: 'Est. Participation', value: `${opportunity.moduleScores.institutional.estimatedParticipation.toFixed(0)}%` },
          { label: 'Relative Volume', value: opportunity.moduleScores.institutional.relativeVolume.toFixed(1) },
          { label: 'VWAP Holding', value: opportunity.moduleScores.institutional.vwapHolding.toFixed(0) },
          { label: 'Sustained Movement', value: opportunity.moduleScores.institutional.sustainedMovement.toFixed(0) },
        ]}
      />}
      {activeTab === 'options' && <ModuleTab
        name="Option Chain Intelligence"
        score={opportunity.moduleScores.optionChain.score}
        confidence={opportunity.moduleScores.optionChain.confidence}
        reason={opportunity.moduleScores.optionChain.reason}
        evidence={opportunity.moduleScores.optionChain.evidence}
        metrics={[
          { label: 'PCR', value: opportunity.moduleScores.optionChain.pcr.toFixed(2) },
          { label: 'Call Writing', value: opportunity.moduleScores.optionChain.callWriting.toFixed(0) },
          { label: 'Put Writing', value: opportunity.moduleScores.optionChain.putWriting.toFixed(0) },
          { label: 'IV Rank', value: `${opportunity.moduleScores.optionChain.ivRank.toFixed(0)}%` },
        ]}
      />}
      {activeTab === 'structure' && <ModuleTab
        name="Price Structure Intelligence"
        score={opportunity.moduleScores.priceStructure.score}
        confidence={opportunity.moduleScores.priceStructure.confidence}
        reason={opportunity.moduleScores.priceStructure.reason}
        evidence={opportunity.moduleScores.priceStructure.evidence}
        metrics={[
          { label: 'Breakout %', value: opportunity.moduleScores.priceStructure.breakoutPercent.toFixed(2) },
          { label: 'Breakdown %', value: opportunity.moduleScores.priceStructure.breakdownPercent.toFixed(2) },
          { label: 'Compression', value: opportunity.moduleScores.priceStructure.compressionLevel.toFixed(0) },
          { label: 'Expansion', value: opportunity.moduleScores.priceStructure.expansionLevel.toFixed(0) },
        ]}
      />}
      {activeTab === 'risk' && <ModuleTab
        name="Risk Intelligence"
        score={opportunity.moduleScores.risk.score}
        confidence={opportunity.moduleScores.risk.confidence}
        reason={opportunity.moduleScores.risk.reason}
        evidence={opportunity.moduleScores.risk.evidence}
        metrics={[
          { label: 'Liquidity', value: opportunity.moduleScores.risk.liquidityScore.toFixed(0) },
          { label: 'Spread Quality', value: opportunity.moduleScores.risk.spreadQuality.toFixed(0) },
          { label: 'Reward/Risk', value: opportunity.moduleScores.risk.rewardRiskRatio.toFixed(1) },
          { label: 'False Breakout Risk', value: opportunity.moduleScores.risk.falseBreakoutRisk.toFixed(0) },
        ]}
      />}

      {/* Explanation */}
      <div className="trading-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">AI Explanation</h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-1">Why This Stock?</h3>
            <p className="text-sm text-gray-300">{opportunity.explanation.whyThisStock}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-1">Why Now?</h3>
            <p className="text-sm text-gray-300">{opportunity.explanation.whyNow}</p>
          </div>
          {opportunity.explanation.moduleDisagreements.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-yellow-400 mb-1">Module Disagreements</h3>
              <ul className="space-y-1">
                {opportunity.explanation.moduleDisagreements.map((d, i) => (
                  <li key={i} className="text-sm text-yellow-300">⚠ {d}</li>
                ))}
              </ul>
            </div>
          )}
          {opportunity.invalidationConditions.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-red-400 mb-1">Invalidation Conditions</h3>
              <ul className="space-y-1">
                {opportunity.invalidationConditions.map((c, i) => (
                  <li key={i} className="text-sm text-red-300">✕ {c}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ScoreCard({
  label,
  value,
  prefix = '',
  suffix = '',
  isNegative = false,
}: {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  isNegative?: boolean;
}) {
  return (
    <div className="trading-card p-4 text-center">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-xl font-bold ${isNegative ? 'text-red-400' : 'text-white'}`}>
        {prefix}{value.toFixed(2)}{suffix}
      </p>
    </div>
  );
}

function OverviewTab({ opportunity }: { opportunity: RankedOpportunity }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="trading-card p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Module Scores</h3>
          <div className="space-y-3">
            <ModuleBar name="Trend" score={opportunity.moduleScores.trend.score} />
            <ModuleBar name="Momentum" score={opportunity.moduleScores.momentum.score} />
            <ModuleBar name="Institutional" score={opportunity.moduleScores.institutional.score} />
            <ModuleBar name="Option Chain" score={opportunity.moduleScores.optionChain.score} />
            <ModuleBar name="Price Structure" score={opportunity.moduleScores.priceStructure.score} />
            <ModuleBar name="Market Context" score={opportunity.moduleScores.marketContext.score} />
            <ModuleBar name="Risk" score={opportunity.moduleScores.risk.score} />
          </div>
        </div>
        <div className="trading-card p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Key Drivers</h3>
          <div className="space-y-2">
            {opportunity.keyDrivers.map((driver, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span className="text-sm text-gray-300">{driver}</span>
              </div>
            ))}
          </div>
          {opportunity.warnings.length > 0 && (
            <>
              <h3 className="text-sm font-medium text-yellow-400 mt-4 mb-2">Warnings</h3>
              <div className="space-y-2">
                {opportunity.warnings.map((warning, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-yellow-400 mt-1">⚠</span>
                    <span className="text-sm text-yellow-300">{warning}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ModuleBar({ name, score }: { name: string; score: number }) {
  const color = score >= 60 ? 'bg-green-500' : score >= 40 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-400">{name}</span>
        <span className="text-white">{score.toFixed(0)}</span>
      </div>
      <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

function ModuleTab({
  name,
  score,
  confidence,
  reason,
  evidence,
  metrics,
}: {
  name: string;
  score: number;
  confidence: number;
  reason: string;
  evidence: string[];
  metrics: Array<{ label: string; value: string }>;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="trading-card p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-2">{name} Score</h3>
          <p className="text-4xl font-bold text-white">{score.toFixed(0)}</p>
          <p className="text-sm text-gray-400 mt-1">Confidence: {confidence.toFixed(0)}%</p>
        </div>
        <div className="trading-card p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Key Metrics</h3>
          <div className="space-y-2">
            {metrics.map((metric, i) => (
              <div key={i} className="flex justify-between">
                <span className="text-sm text-gray-400">{metric.label}</span>
                <span className="text-sm font-medium text-white">{metric.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="trading-card p-4">
        <h3 className="text-sm font-medium text-gray-400 mb-2">Analysis</h3>
        <p className="text-sm text-gray-300">{reason}</p>
      </div>
      <div className="trading-card p-4">
        <h3 className="text-sm font-medium text-gray-400 mb-3">Evidence</h3>
        <ul className="space-y-2">
          {evidence.map((e, i) => (
            <li key={i} className="text-sm text-gray-400 flex items-start gap-2">
              <span className="text-blue-400 mt-1">•</span>
              {e}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}