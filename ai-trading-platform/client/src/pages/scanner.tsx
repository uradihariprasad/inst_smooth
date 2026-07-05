/**
 * Scanner Page
 * Live scanning interface with real-time progress
 */

import React from 'react';
import { useAppStore } from '../store/app-store';
import { useWebSocket } from '../hooks/use-websocket';

export function Scanner() {
  const { isScanning, scanProgress, lastResults } = useAppStore();
  const { startScan, stopScan } = useWebSocket();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Live Scanner</h1>
          <p className="text-gray-400">Continuous scanning of NSE F&O stocks</p>
        </div>
        <button
          onClick={isScanning ? stopScan : startScan}
          className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
            isScanning
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {isScanning ? 'Stop Scanner' : 'Start Scanner'}
        </button>
      </div>

      {/* Scanner Status */}
      <div className="trading-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className={`w-4 h-4 rounded-full ${isScanning ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`} />
          <span className="text-lg font-semibold text-white">
            {isScanning ? 'Scanner Active' : 'Scanner Idle'}
          </span>
        </div>

        {scanProgress && (
          <div className="space-y-6">
            {/* Progress Bar */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Progress</span>
                <span className="text-white">
                  {scanProgress.processed} / {scanProgress.total}
                </span>
              </div>
              <div className="w-full h-4 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 to-purple-600 rounded-full transition-all duration-500"
                  style={{
                    width: `${
                      scanProgress.total > 0
                        ? (scanProgress.processed / scanProgress.total) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* Phase */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Phase:</span>
              <span className="text-sm font-medium text-blue-400 capitalize">
                {scanProgress.phase}
              </span>
            </div>

            {/* Current Symbol */}
            {scanProgress.currentSymbol && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Processing:</span>
                <span className="text-sm font-medium text-white">
                  {scanProgress.currentSymbol}
                </span>
              </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-4">
              <StatCard
                label="Processed"
                value={scanProgress.processed}
                color="text-blue-400"
              />
              <StatCard
                label="Analyzed"
                value={scanProgress.analyzed}
                color="text-green-400"
              />
              <StatCard
                label="Rejected"
                value={scanProgress.rejected}
                color="text-red-400"
              />
              <StatCard
                label="Ranked"
                value={scanProgress.ranked}
                color="text-purple-400"
              />
            </div>

            {/* Errors */}
            {scanProgress.errors.length > 0 && (
              <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg">
                <h4 className="text-sm font-semibold text-red-400 mb-2">
                  Errors ({scanProgress.errors.length})
                </h4>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {scanProgress.errors.slice(-5).map((error, i) => (
                    <p key={i} className="text-xs text-red-300">{error}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!isScanning && !scanProgress && (
          <div className="text-center py-8">
            <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p className="text-gray-400">Scanner is not running</p>
            <p className="text-sm text-gray-500 mt-1">
              Click &quot;Start Scanner&quot; to begin analyzing NSE F&O stocks
            </p>
          </div>
        )}
      </div>

      {/* Last Scan Results Summary */}
      {lastResults && (
        <div className="trading-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Last Scan Results</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-400">
                {lastResults.opportunities.length}
              </p>
              <p className="text-sm text-gray-400">Opportunities Found</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-400">
                {lastResults.scanProgress.analyzed}
              </p>
              <p className="text-sm text-gray-400">Stocks Analyzed</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-red-400">
                {lastResults.scanProgress.rejected}
              </p>
              <p className="text-sm text-gray-400">Rejected</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-4 text-center">
            Last scan: {new Date(lastResults.timestamp).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-gray-800/50 rounded-lg p-4 text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-1">{label}</p>
    </div>
  );
}