/**
 * Settings Page
 * Configure decision weights, ranking criteria, and scanner settings
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../store/app-store';
import { apiService } from '../services/api';

export function Settings() {
  const { weights, criteria, setWeights, setCriteria } = useAppStore();
  const [localWeights, setLocalWeights] = useState(weights);
  const [localCriteria, setLocalCriteria] = useState(criteria);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Fetch current settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const [currentWeights, currentCriteria] = await Promise.all([
          apiService.getWeights(),
          apiService.getCriteria(),
        ]);
        setLocalWeights(currentWeights);
        setLocalCriteria(currentCriteria);
        setWeights(currentWeights);
        setCriteria(currentCriteria);
      } catch {
        // Use defaults
      }
    };
    fetchSettings();
  }, [setWeights, setCriteria]);

  const handleSaveWeights = useCallback(async () => {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const result = await apiService.updateWeights(localWeights);
      setWeights(result.weights);
      setSaveMessage('Weights saved successfully');
    } catch (error) {
      setSaveMessage(`Error: ${error instanceof Error ? error.message : 'Failed to save'}`);
    } finally {
      setIsSaving(false);
    }
  }, [localWeights, setWeights]);

  const handleSaveCriteria = useCallback(async () => {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const result = await apiService.updateCriteria(localCriteria);
      setCriteria(result.criteria);
      setSaveMessage('Criteria saved successfully');
    } catch (error) {
      setSaveMessage(`Error: ${error instanceof Error ? error.message : 'Failed to save'}`);
    } finally {
      setIsSaving(false);
    }
  }, [localCriteria, setCriteria]);

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-gray-400">Configure intelligence modules and ranking criteria</p>
      </div>

      {saveMessage && (
        <div className={`p-3 rounded-lg ${
          saveMessage.startsWith('Error') ? 'bg-red-900/30 text-red-400' : 'bg-green-900/30 text-green-400'
        }`}>
          {saveMessage}
        </div>
      )}

      {/* Decision Weights */}
      <div className="trading-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Decision Weights</h2>
            <p className="text-sm text-gray-400">Adjust the weight of each intelligence module</p>
          </div>
          <button
            onClick={handleSaveWeights}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Weights'}
          </button>
        </div>

        <div className="space-y-4">
          <WeightSlider
            label="Trend Intelligence"
            value={localWeights.trend}
            onChange={(v) => setLocalWeights({ ...localWeights, trend: v })}
          />
          <WeightSlider
            label="Momentum Intelligence"
            value={localWeights.momentum}
            onChange={(v) => setLocalWeights({ ...localWeights, momentum: v })}
          />
          <WeightSlider
            label="Institutional Intelligence"
            value={localWeights.institutional}
            onChange={(v) => setLocalWeights({ ...localWeights, institutional: v })}
          />
          <WeightSlider
            label="Option Chain Intelligence"
            value={localWeights.optionChain}
            onChange={(v) => setLocalWeights({ ...localWeights, optionChain: v })}
          />
          <WeightSlider
            label="Price Structure Intelligence"
            value={localWeights.priceStructure}
            onChange={(v) => setLocalWeights({ ...localWeights, priceStructure: v })}
          />
          <WeightSlider
            label="Market Context Intelligence"
            value={localWeights.marketContext}
            onChange={(v) => setLocalWeights({ ...localWeights, marketContext: v })}
          />
          <WeightSlider
            label="Risk Intelligence"
            value={localWeights.risk}
            onChange={(v) => setLocalWeights({ ...localWeights, risk: v })}
          />
        </div>

        <div className="mt-4 p-3 bg-gray-800/50 rounded-lg">
          <p className="text-xs text-gray-400">
            Total: {Object.values(localWeights).reduce((sum, w) => sum + w, 0).toFixed(2)} (should be ~1.0)
          </p>
        </div>
      </div>

      {/* Ranking Criteria */}
      <div className="trading-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Ranking Criteria</h2>
            <p className="text-sm text-gray-400">Set minimum thresholds for opportunity selection</p>
          </div>
          <button
            onClick={handleSaveCriteria}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Criteria'}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Min Overall Score</label>
            <input
              type="number"
              value={localCriteria.minOverallScore}
              onChange={(e) => setLocalCriteria({ ...localCriteria, minOverallScore: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              min={0}
              max={100}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Min Confidence</label>
            <input
              type="number"
              value={localCriteria.minConfidence}
              onChange={(e) => setLocalCriteria({ ...localCriteria, minConfidence: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              min={0}
              max={100}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Max Risk Level</label>
            <select
              value={localCriteria.maxRiskLevel}
              onChange={(e) => setLocalCriteria({ ...localCriteria, maxRiskLevel: e.target.value as 'low' | 'medium' | 'high' | 'extreme' })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="extreme">Extreme</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Required Bias</label>
            <select
              value={localCriteria.requiredBias}
              onChange={(e) => setLocalCriteria({ ...localCriteria, requiredBias: e.target.value as 'any' | 'bullish' | 'bearish' | 'neutral' })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
            >
              <option value="any">Any</option>
              <option value="bullish">Bullish Only</option>
              <option value="bearish">Bearish Only</option>
              <option value="neutral">Neutral Only</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Min Reward/Risk</label>
            <input
              type="number"
              value={localCriteria.minRewardRisk}
              onChange={(e) => setLocalCriteria({ ...localCriteria, minRewardRisk: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              min={0}
              step={0.1}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Min Liquidity Score</label>
            <input
              type="number"
              value={localCriteria.minLiquidity}
              onChange={(e) => setLocalCriteria({ ...localCriteria, minLiquidity: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              min={0}
              max={100}
            />
          </div>
        </div>
      </div>

      {/* About */}
      <div className="trading-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">About</h2>
        <div className="space-y-2 text-sm text-gray-400">
          <p>AI Institutional Intraday Intelligence Platform</p>
          <p>Version 1.0.0</p>
          <p>This platform uses 7 independent intelligence modules to analyze NSE F&O stocks.</p>
          <p>All data comes from live Upstox APIs - no mock data or simulations.</p>
        </div>
      </div>
    </div>
  );
}

function WeightSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-sm text-gray-400">{label}</span>
        <span className="text-sm font-medium text-white">{value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={0}
        max={0.5}
        step={0.01}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-gray-800 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
      />
    </div>
  );
}