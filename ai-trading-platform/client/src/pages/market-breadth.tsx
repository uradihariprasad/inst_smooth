/**
 * Market Breadth Page
 * Shows advance/decline, new highs/lows, and sector rotation
 */

import React from 'react';
import { useAppStore } from '../store/app-store';

export function MarketBreadthPage() {
  const { lastResults } = useAppStore();

  const breadth = lastResults?.marketContext.marketBreadth;
  const total = (breadth?.advancers ?? 0) + (breadth?.decliners ?? 0) + (breadth?.unchanged ?? 0);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Market Breadth</h1>
        <p className="text-gray-400">Advance/Decline analysis and market internals</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="trading-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-green-600 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-400">Advancers</p>
              <p className="text-2xl font-bold text-green-400">{breadth?.advancers ?? 0}</p>
            </div>
          </div>
          <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full"
              style={{ width: `${total > 0 ? ((breadth?.advancers ?? 0) / total) * 100 : 0}%` }}
            />
          </div>
        </div>

        <div className="trading-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-red-600 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-400">Decliners</p>
              <p className="text-2xl font-bold text-red-400">{breadth?.decliners ?? 0}</p>
            </div>
          </div>
          <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-500 rounded-full"
              style={{ width: `${total > 0 ? ((breadth?.decliners ?? 0) / total) * 100 : 0}%` }}
            />
          </div>
        </div>

        <div className="trading-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-gray-600 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-400">Unchanged</p>
              <p className="text-2xl font-bold text-gray-400">{breadth?.unchanged ?? 0}</p>
            </div>
          </div>
          <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gray-500 rounded-full"
              style={{ width: `${total > 0 ? ((breadth?.unchanged ?? 0) / total) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Advance/Decline Ratio */}
      <div className="trading-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Advance/Decline Ratio</h2>
        <div className="flex items-center justify-center">
          <div className="text-center">
            <p className="text-5xl font-bold text-white">
              {breadth && breadth.decliners > 0
                ? (breadth.advancers / breadth.decliners).toFixed(2)
                : breadth && breadth.advancers > 0
                  ? '∞'
                  : '0.00'}
            </p>
            <p className="text-sm text-gray-400 mt-2">A/D Ratio</p>
            <p className={`text-lg font-semibold mt-2 ${
              breadth && breadth.advancers > breadth.decliners * 1.5
                ? 'text-green-400'
                : breadth && breadth.decliners > breadth.advancers * 1.5
                  ? 'text-red-400'
                  : 'text-yellow-400'
            }`}>
              {breadth && breadth.advancers > breadth.decliners * 1.5
                ? 'Bullish'
                : breadth && breadth.decliners > breadth.advancers * 1.5
                  ? 'Bearish'
                  : 'Neutral'}
            </p>
          </div>
        </div>
      </div>

      {/* Breadth Visualization */}
      <div className="trading-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Breadth Visualization</h2>
        <div className="flex items-center gap-4 h-32">
          {/* Advancers */}
          <div className="flex-1 flex items-end justify-center">
            <div
              className="w-full bg-green-500 rounded-t-lg transition-all duration-500"
              style={{
                height: `${total > 0 ? ((breadth?.advancers ?? 0) / total) * 100 : 0}%`,
                minHeight: '4px',
              }}
            />
          </div>
          {/* Separator */}
          <div className="w-px h-full bg-gray-700" />
          {/* Decliners */}
          <div className="flex-1 flex items-end justify-center">
            <div
              className="w-full bg-red-500 rounded-t-lg transition-all duration-500"
              style={{
                height: `${total > 0 ? ((breadth?.decliners ?? 0) / total) * 100 : 0}%`,
                minHeight: '4px',
              }}
            />
          </div>
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-sm text-green-400">Advancers</span>
          <span className="text-sm text-red-400">Decliners</span>
        </div>
      </div>

      {/* Market Sentiment */}
      <div className="trading-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Market Sentiment</h2>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-3">Breadth Strength</h3>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="w-full h-4 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      breadth && breadth.advancers > breadth.decliners * 1.5
                        ? 'bg-green-500'
                        : breadth && breadth.decliners > breadth.advancers * 1.5
                          ? 'bg-red-500'
                          : 'bg-yellow-500'
                    }`}
                    style={{
                      width: `${
                        breadth
                          ? Math.min(
                              (Math.max(breadth.advancers, breadth.decliners) /
                                (breadth.advancers + breadth.decliners + breadth.unchanged)) *
                                100,
                              100
                            )
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
              <span className="text-sm font-medium text-white">
                {breadth
                  ? Math.round(
                      (Math.max(breadth.advancers, breadth.decliners) /
                        (breadth.advancers + breadth.decliners + breadth.unchanged)) *
                        100
                    )
                  : 0}
                %
              </span>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-3">Participation</h3>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="w-full h-4 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{
                      width: `${
                        total > 0
                          ? (((breadth?.advancers ?? 0) + (breadth?.decliners ?? 0)) / total) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
              <span className="text-sm font-medium text-white">
                {total > 0
                  ? Math.round((((breadth?.advancers ?? 0) + (breadth?.decliners ?? 0)) / total) * 100)
                  : 0}
                %
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}