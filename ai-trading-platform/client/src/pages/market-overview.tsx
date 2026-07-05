/**
 * Market Overview Page
 * Shows Nifty, BankNifty, VIX, sector performance, and market breadth
 */

import React from 'react';
import { useAppStore } from '../store/app-store';

export function MarketOverview() {
  const { lastResults } = useAppStore();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Market Overview</h1>
        <p className="text-gray-400">Real-time market context and indices</p>
      </div>

      {/* Index Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <IndexCard
          title="Nifty 50"
          value={lastResults?.marketContext.nifty ?? 0}
          change={lastResults?.marketContext.niftyChange ?? 0}
          icon="N"
        />
        <IndexCard
          title="Bank Nifty"
          value={lastResults?.marketContext.bankNifty ?? 0}
          change={lastResults?.marketContext.bankNiftyChange ?? 0}
          icon="B"
        />
        <IndexCard
          title="India VIX"
          value={lastResults?.marketContext.indiaVix ?? 0}
          change={0}
          icon="V"
          isVix
        />
      </div>

      {/* Market Breadth */}
      <div className="trading-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Market Breadth</h2>
        {lastResults ? (
          <div className="space-y-4">
            <BreadthBar
              label="Advancers"
              value={lastResults.marketContext.marketBreadth.advancers}
              total={
                lastResults.marketContext.marketBreadth.advancers +
                lastResults.marketContext.marketBreadth.decliners +
                lastResults.marketContext.marketBreadth.unchanged
              }
              color="bg-green-500"
            />
            <BreadthBar
              label="Decliners"
              value={lastResults.marketContext.marketBreadth.decliners}
              total={
                lastResults.marketContext.marketBreadth.advancers +
                lastResults.marketContext.marketBreadth.decliners +
                lastResults.marketContext.marketBreadth.unchanged
              }
              color="bg-red-500"
            />
            <BreadthBar
              label="Unchanged"
              value={lastResults.marketContext.marketBreadth.unchanged}
              total={
                lastResults.marketContext.marketBreadth.advancers +
                lastResults.marketContext.marketBreadth.decliners +
                lastResults.marketContext.marketBreadth.unchanged
              }
              color="bg-gray-500"
            />
          </div>
        ) : (
          <p className="text-gray-400">No market data available</p>
        )}
      </div>

      {/* VIX Analysis */}
      <div className="trading-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Volatility Analysis</h2>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-2">India VIX Level</h3>
            <div className="flex items-end gap-4">
              <span className="text-4xl font-bold text-white">
                {(lastResults?.marketContext.indiaVix ?? 0).toFixed(2)}
              </span>
              <span className={`text-sm font-medium mb-1 ${
                (lastResults?.marketContext.indiaVix ?? 0) > 20 ? 'text-red-400' :
                (lastResults?.marketContext.indiaVix ?? 0) > 15 ? 'text-yellow-400' : 'text-green-400'
              }`}>
                {(lastResults?.marketContext.indiaVix ?? 0) > 20 ? 'High Fear' :
                 (lastResults?.marketContext.indiaVix ?? 0) > 15 ? 'Elevated' :
                 (lastResults?.marketContext.indiaVix ?? 0) > 12 ? 'Normal' : 'Low'}
              </span>
            </div>
            <div className="mt-4 h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  (lastResults?.marketContext.indiaVix ?? 0) > 20 ? 'bg-red-500' :
                  (lastResults?.marketContext.indiaVix ?? 0) > 15 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(((lastResults?.marketContext.indiaVix ?? 0) / 30) * 100, 100)}%` }}
              />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-2">Market Sentiment</h3>
            <div className="space-y-2">
              <SentimentIndicator
                label="Fear/Greed"
                value={(lastResults?.marketContext.indiaVix ?? 0) > 20 ? 'Fear' :
                       (lastResults?.marketContext.indiaVix ?? 0) > 15 ? 'Neutral' : 'Greed'}
                color={(lastResults?.marketContext.indiaVix ?? 0) > 20 ? 'text-red-400' :
                       (lastResults?.marketContext.indiaVix ?? 0) > 15 ? 'text-yellow-400' : 'text-green-400'}
              />
              <SentimentIndicator
                label="Breadth"
                value={
                  lastResults
                    ? lastResults.marketContext.marketBreadth.advancers > lastResults.marketContext.marketBreadth.decliners * 1.5
                      ? 'Bullish'
                      : lastResults.marketContext.marketBreadth.decliners > lastResults.marketContext.marketBreadth.advancers * 1.5
                        ? 'Bearish'
                        : 'Neutral'
                    : 'Unknown'
                }
                color={
                  lastResults
                    ? lastResults.marketContext.marketBreadth.advancers > lastResults.marketContext.marketBreadth.decliners * 1.5
                      ? 'text-green-400'
                      : lastResults.marketContext.marketBreadth.decliners > lastResults.marketContext.marketBreadth.advancers * 1.5
                        ? 'text-red-400'
                        : 'text-yellow-400'
                    : 'text-gray-400'
                }
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function IndexCard({
  title,
  value,
  change,
  icon,
  isVix = false,
}: {
  title: string;
  value: number;
  change: number;
  icon: string;
  isVix?: boolean;
}) {
  const isPositive = change >= 0;

  return (
    <div className="trading-card p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white ${
          isVix ? 'bg-purple-600' : isPositive ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-400">{title}</h3>
          <p className="text-xs text-gray-500">Live</p>
        </div>
      </div>
      <p className="text-3xl font-bold text-white">{value.toFixed(2)}</p>
      {!isVix && (
        <div className="flex items-center gap-2 mt-2">
          <span className={`text-sm font-semibold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {isPositive ? '+' : ''}{change.toFixed(2)}%
          </span>
          <svg
            className={`w-4 h-4 ${isPositive ? 'text-green-400 rotate-0' : 'text-red-400 rotate-180'}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </div>
      )}
    </div>
  );
}

function BreadthBar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const percentage = total > 0 ? (value / total) * 100 : 0;

  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-sm text-gray-400">{label}</span>
        <span className="text-sm font-medium text-white">{value}</span>
      </div>
      <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function SentimentIndicator({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-400">{label}</span>
      <span className={`text-sm font-semibold ${color}`}>{value}</span>
    </div>
  );
}