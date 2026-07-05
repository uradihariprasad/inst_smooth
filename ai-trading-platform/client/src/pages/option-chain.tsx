/**
 * Option Chain Page
 * Displays option chain analysis for selected instrument
 */

import React, { useState } from 'react';
import { useAppStore } from '../store/app-store';

export function OptionChainPage() {
  const { lastResults, setSelectedOpportunity } = useAppStore();
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

  const opportunities = lastResults?.opportunities ?? [];
  const selectedOpp = opportunities.find((o) => o.symbol === selectedSymbol);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Option Chain Analysis</h1>
        <p className="text-gray-400">OI analysis, PCR, and dynamic support/resistance</p>
      </div>

      {/* Symbol Selector */}
      <div className="trading-card p-4">
        <h2 className="text-sm font-medium text-gray-400 mb-3">Select Instrument</h2>
        <div className="flex flex-wrap gap-2">
          {opportunities.map((opp) => (
            <button
              key={opp.instrumentKey}
              onClick={() => setSelectedSymbol(opp.symbol)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selectedSymbol === opp.symbol
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {opp.symbol}
            </button>
          ))}
        </div>
      </div>

      {selectedOpp ? (
        <div className="space-y-6">
          {/* Option Chain Summary */}
          <div className="trading-card p-6">
            <h2 className="text-lg font-semibold text-white mb-4">
              Option Chain Intelligence - {selectedSymbol}
            </h2>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <MetricCard
                label="PCR"
                value={selectedOpp.moduleScores.optionChain.pcr.toFixed(2)}
                color={
                  selectedOpp.moduleScores.optionChain.pcr > 1.2
                    ? 'text-green-400'
                    : selectedOpp.moduleScores.optionChain.pcr < 0.8
                      ? 'text-red-400'
                      : 'text-yellow-400'
                }
                description={
                  selectedOpp.moduleScores.optionChain.pcr > 1.2
                    ? 'Bullish'
                    : selectedOpp.moduleScores.optionChain.pcr < 0.8
                      ? 'Bearish'
                      : 'Neutral'
                }
              />
              <MetricCard
                label="IV Rank"
                value={`${selectedOpp.moduleScores.optionChain.ivRank.toFixed(0)}%`}
                color={
                  selectedOpp.moduleScores.optionChain.ivRank > 70
                    ? 'text-red-400'
                    : selectedOpp.moduleScores.optionChain.ivRank < 30
                      ? 'text-green-400'
                      : 'text-yellow-400'
                }
                description={
                  selectedOpp.moduleScores.optionChain.ivRank > 70
                    ? 'High IV'
                    : selectedOpp.moduleScores.optionChain.ivRank < 30
                      ? 'Low IV'
                      : 'Normal IV'
                }
              />
              <MetricCard
                label="Option Score"
                value={selectedOpp.moduleScores.optionChain.score.toFixed(0)}
                color={
                  selectedOpp.moduleScores.optionChain.score > 60
                    ? 'text-green-400'
                    : selectedOpp.moduleScores.optionChain.score < 40
                      ? 'text-red-400'
                      : 'text-yellow-400'
                }
                description="Module Score"
              />
            </div>

            {/* Writing/Unwinding */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-800/50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-400 mb-3">Call Side</h3>
                <div className="space-y-2">
                  <BarIndicator
                    label="Call Writing"
                    value={selectedOpp.moduleScores.optionChain.callWriting}
                    color="bg-red-500"
                  />
                  <BarIndicator
                    label="Call Unwinding"
                    value={selectedOpp.moduleScores.optionChain.callUnwinding}
                    color="bg-green-500"
                  />
                </div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-400 mb-3">Put Side</h3>
                <div className="space-y-2">
                  <BarIndicator
                    label="Put Writing"
                    value={selectedOpp.moduleScores.optionChain.putWriting}
                    color="bg-green-500"
                  />
                  <BarIndicator
                    label="Put Unwinding"
                    value={selectedOpp.moduleScores.optionChain.putUnwinding}
                    color="bg-red-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic Support/Resistance */}
          <div className="trading-card p-6">
            <h2 className="text-lg font-semibold text-white mb-4">
              Dynamic Support & Resistance
            </h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-green-400 mb-3">Support Levels</h3>
                {selectedOpp.moduleScores.optionChain.dynamicSupport.length > 0 ? (
                  <div className="space-y-2">
                    {selectedOpp.moduleScores.optionChain.dynamicSupport.map((level, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2 bg-green-900/20 rounded"
                      >
                        <span className="text-sm text-gray-300">Strike {level.toFixed(0)}</span>
                        <span className="text-sm font-medium text-green-400">
                          {i === 0 ? 'Strongest' : `#${i + 1}`}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No data available</p>
                )}
              </div>
              <div>
                <h3 className="text-sm font-medium text-red-400 mb-3">Resistance Levels</h3>
                {selectedOpp.moduleScores.optionChain.dynamicResistance.length > 0 ? (
                  <div className="space-y-2">
                    {selectedOpp.moduleScores.optionChain.dynamicResistance.map((level, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2 bg-red-900/20 rounded"
                      >
                        <span className="text-sm text-gray-300">Strike {level.toFixed(0)}</span>
                        <span className="text-sm font-medium text-red-400">
                          {i === 0 ? 'Strongest' : `#${i + 1}`}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No data available</p>
                )}
              </div>
            </div>
          </div>

          {/* Evidence */}
          <div className="trading-card p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Evidence</h2>
            <ul className="space-y-2">
              {selectedOpp.moduleScores.optionChain.evidence.map((e, i) => (
                <li key={i} className="text-sm text-gray-400 flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5">•</span>
                  {e}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="trading-card p-12 text-center">
          <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-gray-400">Select an instrument to view option chain analysis</p>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  color,
  description,
}: {
  label: string;
  value: string;
  color: string;
  description: string;
}) {
  return (
    <div className="bg-gray-800/50 rounded-lg p-4 text-center">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{description}</p>
    </div>
  );
}

function BarIndicator({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-400">{label}</span>
        <span className="text-white">{value.toFixed(0)}/100</span>
      </div>
      <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  );
}