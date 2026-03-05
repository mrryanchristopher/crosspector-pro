
export enum AutomationStatus {
  IDLE = 'IDLE',
  TRIGGERED = 'TRIGGERED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export type RiskLevel = 'Low' | 'Medium' | 'High';
export type Sentiment = 'Bullish' | 'Neutral' | 'Bearish';
export type OpportunityType = 'IMMEDIATE_FLIP' | 'STRATEGIC_ASSET' | 'LOCAL_GEM';
export type StrategyType = 
  | 'Kit Builder' 
  | 'Repair/Restore' 
  | 'Niche Arbitrage' 
  | 'Volume Play' 
  | 'Asset Breakout'
  | 'Cross-Exchange Arb'
  | 'Inter-Asset Arb'
  | 'Local Arbitrage';

export interface Opportunity {
  id: string;
  category: string;
  name: string;
  predictedProfitPercent: number;
  riskLevel: RiskLevel;
  profitPer1000: number;
  minInvestment: number;
  confidenceScore: number;
  sourceUrl: string; 
  sourceName: string;
  instructions: string[];
  lastUpdated: string;
  sentiment: Sentiment;
  trendReasoning: string;
  marketDataPoint?: string; 
  buyPrice: number | string;
  sellPrice: number | string;
  type: OpportunityType;
  timeToProfit: string;
  strategyType: StrategyType;
  secretSauce: string; // The "trick" to the flip
}

export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export type MarketCategory = 
  | 'Crypto' 
  | 'Stocks' 
  | 'Precious Metals'
  | 'Creative Schemes'
  | 'Thrift/Resale' 
  | 'Retail Arbitrage'
  | 'Liquidation'
  | 'Local Listings';
