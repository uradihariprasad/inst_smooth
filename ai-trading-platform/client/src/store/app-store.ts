/**
 * Application State Store using Zustand
 * Manages authentication, scanner state, and UI state
 */

import { create } from 'zustand';
import type {
  RankedOpportunity,
  ScanProgress,
  MarketScanResult,
} from '../../../shared/types/analysis';
import type { DecisionWeights } from '../../../server/src/services/decision-engine';
import type { RankingCriteria } from '../../../server/src/services/ranking-engine';

export type AppView =
  | 'dashboard'
  | 'opportunities'
  | 'market-overview'
  | 'scanner'
  | 'option-chain'
  | 'market-breadth'
  | 'risk-dashboard'
  | 'settings';

interface AppState {
  // Auth state
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  authError: string | null;

  // Scanner state
  isScanning: boolean;
  scanProgress: ScanProgress | null;
  lastResults: MarketScanResult | null;

  // UI state
  currentView: AppView;
  selectedOpportunity: RankedOpportunity | null;
  isSettingsOpen: boolean;

  // Config
  weights: DecisionWeights;
  criteria: RankingCriteria;

  // Actions
  setAuthenticated: (value: boolean) => void;
  setAuthenticating: (value: boolean) => void;
  setAuthError: (error: string | null) => void;
  setScanning: (value: boolean) => void;
  setScanProgress: (progress: ScanProgress | null) => void;
  setLastResults: (results: MarketScanResult | null) => void;
  setCurrentView: (view: AppView) => void;
  setSelectedOpportunity: (opportunity: RankedOpportunity | null) => void;
  setSettingsOpen: (value: boolean) => void;
  setWeights: (weights: DecisionWeights) => void;
  setCriteria: (criteria: RankingCriteria) => void;
  logout: () => void;
}

const defaultWeights: DecisionWeights = {
  trend: 0.2,
  momentum: 0.2,
  institutional: 0.15,
  optionChain: 0.15,
  priceStructure: 0.1,
  marketContext: 0.1,
  risk: 0.1,
};

const defaultCriteria: RankingCriteria = {
  minOverallScore: 60,
  minConfidence: 50,
  maxRiskLevel: 'high',
  requiredBias: 'any',
  minRewardRisk: 1.5,
  minLiquidity: 40,
  maxSpread: 0.3,
};

export const useAppStore = create<AppState>((set) => ({
  // Initial state
  isAuthenticated: false,
  isAuthenticating: false,
  authError: null,
  isScanning: false,
  scanProgress: null,
  lastResults: null,
  currentView: 'dashboard',
  selectedOpportunity: null,
  isSettingsOpen: false,
  weights: defaultWeights,
  criteria: defaultCriteria,

  // Actions
  setAuthenticated: (value) => set({ isAuthenticated: value, authError: null }),
  setAuthenticating: (value) => set({ isAuthenticating: value }),
  setAuthError: (error) => set({ authError: error }),
  setScanning: (value) => set({ isScanning: value }),
  setScanProgress: (progress) => set({ scanProgress: progress }),
  setLastResults: (results) => set({ lastResults: results }),
  setCurrentView: (view) => set({ currentView: view, selectedOpportunity: null }),
  setSelectedOpportunity: (opportunity) => set({ selectedOpportunity: opportunity }),
  setSettingsOpen: (value) => set({ isSettingsOpen: value }),
  setWeights: (weights) => set({ weights }),
  setCriteria: (criteria) => set({ criteria }),
  logout: () =>
    set({
      isAuthenticated: false,
      isScanning: false,
      scanProgress: null,
      lastResults: null,
      selectedOpportunity: null,
      authError: null,
    }),
}));