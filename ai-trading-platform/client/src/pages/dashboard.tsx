/**
 * Dashboard Page
 * Main overview with market context, top opportunities, and scanner status
 */

import React from 'react';
import { useAppStore } from '../store/app-store';
import { useWebSocket } from '../hooks/use-websocket';
import type { RankedOpportunity } from '../../../shared/types/analysis';

export function Dashboard() {
  const { lastResults, isScanning, scanProgress, setSelectedOpportunity } = useAppStore();
  const { startScan } = useWebSocket();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400">AI-powered institutional intraday intelligence</p>
        </div>
        <button
          onClick={startScan}
          disabled={isScanning}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
        >
          {isScanning ? 'Scanning...' : 'Run Scan'}
        </button>
      </div>

      {/* Market Context */}
      {lastResults && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MarketCard
            title="Nifty 50"
            value={lastResults.marketContext.nifty}
            change={lastResults.marketContext.niftyChange}
          />
          <MarketCard
            title="Bank Nifty"
            value={lastResults.marketContext.bankNifty}
            change={lastResults.marketContext.bankNiftyChange}
          />
          <MarketCard
            title="India VIX"
            value={lastResults.marketContext.indiaVix}
            change={0}
            isVix
          />
        </div>
      )}

      {/* Scanner Status */}
      {isScanning && scanProgress && (
        <div className="trading-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              <span className="text-white font-medium">Scanner Active</span>
            </div>
            <span className="text-sm text-gray-400">
              {scanProgress.currentSymbol}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-white">{scanProgress.processed}</p>
              <p className="text-xs text-gray-400">Processed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-400">{scanProgress.analyzed}</p>
              <p className="text-xs text-gray-400">Analyzed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-400">{scanProgress.rejected}</p>
              <p className="text-xs text-gray-400">Rejected</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-400">{scanProgress.ranked}</p>
              <p className="text-xs text-gray-400">Ranked</p>
            </div>
          </div>
          <div className="mt-3">
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-500"
                style={{
                  width: `${scanProgress.total > 0 ? (scanProgress.processed / scanProgress.total) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Market Breadth */}
      {lastResults && (
        <div className="trading-card p-4">
          <h2 className="text-lg font-semibold text-white mb-3">Market Breadth</h2>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-gray-400">Advancers</span>
                <span className="text-sm font-semibold text-green-400">
                  {lastResults.marketContext.marketBreadth.advancers}
                </span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{
                    width: `${
                      lastResults.marketContext.marketBreadth.advancers + lastResults.marketContext.marketBreadth.decliners > 0
                        ? (lastResults.marketContext.marketBreadth.advancers /
                            (lastResults.marketContext.marketBreadth.advancers + lastResults.marketContext.marketBreadth.decliners)) *
                          100
                        : 50
                    }%`,
                  }}
                />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-gray-400">Decliners</span>
                <span className="text-sm font-semibold text-red-400">
                  {lastResults.marketContext.marketBreadth.decliners}
                </span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div
                  className="bg-red-500 h-2 rounded-full"
                  style={{
                    width: `${
                      lastResults.marketContext.marketBreadth.advancers + lastResults.marketContext.marketBreadth.decliners > 0
                        ? (lastResults.marketContext.marketBreadth.decliners /
                            (lastResults.marketContext.marketBreadth.advancers + lastResults.marketContext.marketBreadth.decliners)) *
                          100
                        : 50
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Opportunities */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">
          Top Opportunities
          {lastResults && (
            <span className="ml-2 text-sm text-gray-400">
              ({lastResults.opportunities.length} found)
            </span>
          )}
        </h2>

        {lastResults && lastResults.opportunities.length > 0 ? (
          <div className="space-y-3">
            {lastResults.opportunities.map((opp) => (
              <OpportunityCard
                key={opp.instrumentKey}
                opportunity={opp}
                onClick={() => setSelectedOpportunity(opp)}
              />
            ))}
          </div>
        ) : (
          <div className="trading-card p-8 text-center">
            <svg className="w-12 h-12 text-gray-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p className="text-gray-400">No opportunities found</p>
            <p className="text-sm text-gray-500 mt-1">Start a scan to analyze the market</p>
          </div>
        )}
      </div>
    </div>
  );
}

function MarketCard({
  title,
  value,
  change,
  isVix = false,
}: {
  title: string;
  value: number;
  change: number;
  isVix?: boolean;
}) {
  const isPositive = change >= 0;
  const colorClass = isVix
    ? value > 20
      ? 'text-red-400'
      : value > 15
        ? 'text-yellow-400'
        : 'text-green-400'
    : isPositive
      ? 'text-green-400'
      : 'text-red-400';

  return (
    <div className="trading-card p-4">
      <p className="text-sm text-gray-400 mb-1">{title}</p>
      <p className={`text-2xl font-bold ${colorClass}`}>
        {value.toFixed(2)}
      </p>
      {!isVix && (
        <p className={`text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
          {isPositive ? '+' : ''}{change.toFixed(2)}%
        </p>
      )}
    </div>
  );
}

function OpportunityCard({
  opportunity,
  onClick,
}: {
  opportunity: RankedOpportunity;
  onClick: () => void;
}) {
  const biasColor =
    opportunity.tradeBias === 'bullish'
      ? 'text-green-400'
      : opportunity.tradeBias === 'bearish'
        ? 'text-red-400'
        : 'text-gray-400';

  const biasBg =
    opportunity.tradeBias === 'bullish'
      ? 'bg-green-900/30 border-green-700'
      : opportunity.tradeBias === 'bearish'
        ? 'bg-red-900/30 border-red-700'
        : 'bg-gray-800 border-gray-700';

  const riskColor =
    opportunity.riskLevel === 'low'
      ? 'text-green-400'
      : opportunity.riskLevel === 'medium'
        ? 'text-yellow-400'
        : 'text-red-400';

  return (
    <button
      onClick={onClick}
      className={`w-full trading-card p-4 hover:border-blue-600 transition-colors text-left ${biasBg}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-white">#{opportunity.rank}</span>
          <div>
            <h3 className="text-lg font-semibold text-white">{opportunity.symbol}</h3>
            <p className="text-xs text-gray-400">{opportunity.explanation.whyNow}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold uppercase ${biasColor}`}>
              {opportunity.tradeBias}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded ${
              opportunity.riskLevel === 'low' ? 'bg-green-900/50 text-green-400' :
              opportunity.riskLevel === 'medium' ? 'bg-yellow-900/50 text-yellow-400' :
              'bg-red-900/50 text-red-400'
            }`}>
              {opportunity.riskLevel}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div>
          <p className="text-xs text-gray-400">Score</p>
          <p className="text-lg font-bold text-white">{opportunity.overallScore.toFixed(0)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Confidence</p>
          <p className="text-lg font-bold text-blue-400">{opportunity.confidenceScore.toFixed(0)}%</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Entry Zone</p>
          <p className="text-sm font-medium text-white">
            {opportunity.suggestedEntryZone[0].toFixed(2)} - {opportunity.suggestedEntryZone[1].toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Stop Loss</p>
          <p className="text-sm font-medium text-red-400">{opportunity.suggestedStopLoss.toFixed(2)}</p>
        </div>
      </div>

      {opportunity.keyDrivers.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {opportunity.keyDrivers.slice(0, 3).map((driver, i) => (
            <span key={i} className="text-xs px-2 py-1 bg-gray-800 text-gray-300 rounded">
              {driver}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}