export type InsightPriority = 'high' | 'medium' | 'low';

export type InsightCategory =
  | 'inventory'
  | 'revenue'
  | 'products'
  | 'marketing'
  | 'operations'
  | 'growth';

export interface Insight {
  category: InsightCategory | string;
  title: string;
  finding: string;
  recommendation: string;
  priority: InsightPriority;
}

export interface StoreAnalysis {
  overallScore: number;
  summary: string;
  insights: Insight[];
  quickWins: string[];
}
