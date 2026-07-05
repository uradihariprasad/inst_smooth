/**
 * Analysis and Intelligence Types
 * All types strictly typed - no 'any' allowed
 */

import type {
  TradeBias,
  RiskLevel,
  TrendDirection,
  TrendStage,
  TrendStrength,
  TrendQuality,
} from './market';

export interface ModuleOutput {
  score: number;
  confidence: number;
  reason: string;
  evidence: string[];
  metadata: Record<string, number | string | boolean>;
}

export interface TrendOutput extends ModuleOutput {
  direction: TrendDirection;
  strength: TrendStrength;
  quality: TrendQuality;
  stage: TrendStage;
  persistence: number;
  slope: number;
  vwapDistance: number;
  swingStructure: string;
  higherHighs: number;
  higherLows: number;
  lowerHighs: number;
  lowerLows: number;
}

export interface MomentumOutput extends ModuleOutput {
  momentumStrength: number;
  acceleration: number;
  deceleration: number;
  breakoutStrength: number;
  volumeExpansion: number;
  atrExpansion: number;
  bollingerExpansion: number;
  candleStrength: number;
  bodySize: number;
  velocity: number;
  rangeExpansion: number;
}

export interface InstitutionalOutput extends ModuleOutput {
  estimatedParticipation: number;
  relativeVolume: number;
  priceAcceptance: number;
  repeatedBuying: number;
  repeatedSelling: number;
  vwapHolding: number;
  oiBuildUp: number;
  depthImbalance: number;
  volumeCharacteristics: string;
  sustainedMovement: number;
}

export interface OptionChainOutput extends ModuleOutput {
  callWriting: number;
  putWriting: number;
  callUnwinding: number;
  putUnwinding: number;
  atmActivity: number;
  pcr: number;
  ivRank: number;
  maxPainDistance: number;
  dynamicSupport: number[];
  dynamicResistance: number[];
  strikeStrength: Record<number, number>;
}

export interface PriceStructureOutput extends ModuleOutput {
  breakoutPercent: number;
  breakdownPercent: number;
  retestQuality: number;
  consolidationScore: number;
  compressionLevel: number;
  expansionLevel: number;
  supportZones: SupportResistanceZoneAnalysis[];
  resistanceZones: SupportResistanceZoneAnalysis[];
  previousDayBreakout: boolean;
  openingRangeBreakout: boolean;
}

export interface SupportResistanceZoneAnalysis {
  level: number;
  zone: 'support' | 'resistance';
  strength: number;
  touches: number;
  type: string;
  distance: number;
}

export interface MarketContextOutput extends ModuleOutput {
  niftyTrend: TrendDirection;
  niftyStrength: number;
  bankNiftyTrend: TrendDirection;
  bankNiftyStrength: number;
  sectorStrength: number;
  sectorRotation: number;
  advanceDeclineRatio: number;
  vixLevel: number;
  vixSignal: string;
  breadthStrength: number;
  indexMomentum: number;
}

export interface RiskOutput extends ModuleOutput {
  liquidityScore: number;
  spreadQuality: number;
  trendConfidence: number;
  momentumConfidence: number;
  optionConfirmation: number;
  volatilityRisk: number;
  nearbyResistance: boolean;
  rewardRiskRatio: number;
  falseBreakoutRisk: number;
  rejectionReasons: string[];
}

export interface DecisionOutput {
  instrumentKey: string;
  symbol: string;
  overallScore: number;
  confidenceScore: number;
  tradeBias: TradeBias;
  riskLevel: RiskLevel;
  suggestedEntryZone: [number, number];
  suggestedStopLoss: number;
  suggestedTargets: number[];
  invalidationConditions: string[];
  evidenceSummary: string;
  moduleScores: {
    trend: TrendOutput;
    momentum: MomentumOutput;
    institutional: InstitutionalOutput;
    optionChain: OptionChainOutput;
    priceStructure: PriceStructureOutput;
    marketContext: MarketContextOutput;
    risk: RiskOutput;
  };
  timestamp: number;
}

export interface RankedOpportunity extends DecisionOutput {
  rank: number;
  rankReason: string;
  keyDrivers: string[];
  warnings: string[];
  explanation: OpportunityExplanation;
}

export interface OpportunityExplanation {
  whyThisStock: string;
  whyNow: string;
  topEvidence: string[];
  moduleDisagreements: string[];
  invalidationConditions: string[];
}

export interface FeatureSet {
  instrumentKey: string;
  symbol: string;
  // Price features
  vwapDistance: number;
  priceAcceleration: number;
  volumeRatio: number;
  relativeVolume: number;
  atr: number;
  atrPercent: number;
  rsi: number;
  rsiSlope: number;
  bollingerUpper: number;
  bollingerLower: number;
  bollingerWidth: number;
  bollingerPercent: number;
  maSlope: number;
  ema9: number;
  ema21: number;
  ema50: number;
  // Trend features
  trendPersistence: number;
  swingStructure: string;
  higherHighs: number;
  higherLows: number;
  lowerHighs: number;
  lowerLows: number;
  // Breakout features
  breakoutPercent: number;
  breakdownPercent: number;
  volatilityExpansion: number;
  momentumPersistence: number;
  rangeExpansion: number;
  // Opening features
  openingRangeBreakout: boolean;
  openingRangeDirection: 'up' | 'down' | null;
  previousDayBreakout: boolean;
  gapPercent: number;
  // Zone features
  supportZones: SupportResistanceZoneAnalysis[];
  resistanceZones: SupportResistanceZoneAnalysis[];
  // Liquidity features
  liquidityScore: number;
  spreadAnalysis: number;
  // Risk features
  rewardRiskEstimation: number;
  timestamp: number;
}

export interface ScanProgress {
  total: number;
  processed: number;
  analyzed: number;
  rejected: number;
  ranked: number;
  phase: 'collecting' | 'processing' | 'analyzing' | 'ranking' | 'complete';
  currentSymbol: string;
  errors: string[];
  startTime: number;
  estimatedCompletion: number;
}

export interface MarketScanResult {
  opportunities: RankedOpportunity[];
  scanProgress: ScanProgress;
  marketContext: {
    nifty: number;
    niftyChange: number;
    bankNifty: number;
    bankNiftyChange: number;
    indiaVix: number;
    marketBreadth: {
      advancers: number;
      decliners: number;
      unchanged: number;
    };
  };
  timestamp: number;
}