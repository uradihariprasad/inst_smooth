/**
 * Main Application Component
 * Handles routing, authentication, and layout
 */

import React, { useEffect, useCallback } from 'react';
import { useAppStore } from './store/app-store';
import { apiService } from './services/api';
import { useWebSocket } from './hooks/use-websocket';
import { AuthScreen } from './components/auth-screen';
import { AppLayout } from './components/layout/app-layout';
import { Dashboard } from './pages/dashboard';
import { Opportunities } from './pages/opportunities';
import { MarketOverview } from './pages/market-overview';
import { Scanner } from './pages/scanner';
import { OptionChainPage } from './pages/option-chain';
import { MarketBreadthPage } from './pages/market-breadth';
import { RiskDashboard } from './pages/risk-dashboard';
import { StockDetail } from './pages/stock-detail';
import { Settings } from './pages/settings';

export default function App() {
  const {
    isAuthenticated,
    currentView,
    selectedOpportunity,
    setAuthenticated,
    setAuthError,
    setLastResults,
    setScanning,
    setScanProgress,
  } = useAppStore();

  const { isConnected } = useWebSocket();

  // Check auth status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const status = await apiService.getAuthStatus();
        setAuthenticated(status.authenticated);
      } catch {
        setAuthenticated(false);
      }
    };
    checkAuth();
  }, [setAuthenticated]);

  // Fetch initial results if authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchResults = async () => {
      try {
        const [results, status] = await Promise.all([
          apiService.getScannerResults().catch(() => null),
          apiService.getScannerStatus(),
        ]);

        if (results) {
          setLastResults(results);
        }
        setScanProgress(status.progress);
        setScanning(status.isScanning);
      } catch {
        // Silently handle - scanner may not have run yet
      }
    };

    fetchResults();
  }, [isAuthenticated, setLastResults, setScanProgress, setScanning]);

  const renderCurrentView = useCallback(() => {
    if (selectedOpportunity) {
      return <StockDetail opportunity={selectedOpportunity} />;
    }

    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'opportunities':
        return <Opportunities />;
      case 'market-overview':
        return <MarketOverview />;
      case 'scanner':
        return <Scanner />;
      case 'option-chain':
        return <OptionChainPage />;
      case 'market-breadth':
        return <MarketBreadthPage />;
      case 'risk-dashboard':
        return <RiskDashboard />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  }, [currentView, selectedOpportunity]);

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  return (
    <AppLayout isConnected={isConnected}>
      {renderCurrentView()}
    </AppLayout>
  );
}