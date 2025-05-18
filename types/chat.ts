import { ReactNode } from 'react';
import { CoreMessage } from 'ai';
import { ANALYTICS_METRICS } from '@/app/(preview)/actions';

// Dataset types
export interface Dataset {
  id: string;
  name: string;
  recordCount: number;
  createdAt: string;
}

// Base interface for all UI component data
export interface BaseUIData {
  type: string;
}

export interface AnalyticsUIData extends BaseUIData {
  type: 'analytics';
  data: AnalyticsData;
  metric: string;
}

export interface DatasetUploadUIData extends BaseUIData {
  type: 'dataset-upload';
}

export interface DatasetListUIData extends BaseUIData {
  type: 'dataset-list';
  data: Dataset[];
}

export interface DatasetSummaryUIData extends BaseUIData {
  type: 'dataset-summary';
  data: DatasetSummary;
}

export interface DataVisualizerUIData extends BaseUIData {
  type: 'data-visualization';
  data: QueryResult;
}

export interface ErrorUIData extends BaseUIData {
  type: 'error';
  message: string;
}

export interface ReportUIData extends BaseUIData {
  type: 'report';
  data: ReportData;
}

export type UIComponentData = 
  | AnalyticsUIData 
  | DatasetUploadUIData 
  | DatasetListUIData 
  | DatasetSummaryUIData 
  | DataVisualizerUIData 
  | ErrorUIData 
  | ReportUIData;

export interface UIMessage {
  id: string;
  content: string;
  role: "user" | "assistant";
  ui?: UIComponentData;
}

export interface UIState {
  messages: UIMessage[];
}

export interface AIState {
  chatId: string;
  messages: CoreMessage[];
  uiState: UIState;
}

export interface AnalyticsData {
  title: string;
  description: string;
  summaryMetrics: Array<{ label: string; value: string }>;
  insights: Array<string>;
  data: any[];
  aiExplanation?: string;
  chartType?: ChartType;
}

export interface DatasetSummary {
  id: string;
  name: string;
  description?: string;
  recordCount: number;
  dateRange: {
    start: string;
    end: string;
  };
  metrics: {
    avgResolutionTime: number;
    avgSatisfactionRate: number;
    topIssueTypes: Array<{ name: string; count: number }>;
    priorityDistribution: Record<string, number>;
  };
}

export type ChartType = "bar" | "line" | "pie" | "table";

export interface QueryResult {
  chartType?: ChartType;
  data: any[];
  summary: string;
  insights: Array<string>;
  aiExplanation: string;
  analysisPoints?: Array<{
    title: string;
    description: string;
  }>;
  trendAnalysis?: string;
  impactAnalysis?: string;
  recommendations?: string[];
  metadata?: {
    totalCount?: number;
    categories?: number;
    topItems?: Array<{ name: string; count: number; percentage: number }>;
  };
}

export interface ReportData {
  datasetId: string;
  reportType: string;
  metrics: string[];
  generated: string;
  sections: Array<{
    title: string;
    content: string;
    visualization?: {
      chartType?: "bar" | "line" | "pie" | "table";
      data: any[];
      summary: string;
      insights: Array<string>;
    };
  }>;
}

// Message role type
export type MessageRole = 'user' | 'assistant';

// Base message types
export interface ChatBaseMessage {
  id?: string;
  role: MessageRole;
  timestamp?: Date;
}

export interface ChatTextMessage extends ChatBaseMessage {
  content: string;
}

export interface ChatUIMessage extends ChatBaseMessage {
  content: ReactNode;
}

// Streaming types
export interface StreamingState {
  isLoading: boolean;
  progress: number;
  error?: string;
}

export interface StreamingTextMessage extends ChatBaseMessage {
  content: string;
  streaming?: StreamingState;
}

// Chat state types
export type MessageList = Array<ChatTextMessage | ChatUIMessage>;

export interface ChatState {
  messages: MessageList;
  isLoading: boolean;
  error?: string;
}

// Action types
export type SendMessageAction = (message: string) => Promise<ReactNode>;

export interface ChatActions {
  sendMessage: SendMessageAction;
  clearChat: () => void;
  retryLastMessage: () => Promise<void>;
}

// UI Component types
export interface MessageProps {
  role: MessageRole;
  content: ReactNode | string;
}

export interface MessageContainerProps {
  messages: MessageList;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
}

export interface ChatInputProps {
  onSubmit: (message: string) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
  suggestedActions?: Array<{
    title: string;
    label: string;
    action: string;
  }>;
}

// Analytics result types
export interface BaseAnalyticsResult {
  data: any[];
  insights?: string[];
}

export interface ResolutionTimeAnalytics extends BaseAnalyticsResult {
  avgResolutionTime: number;
  fastestResolution: number;
  slowestResolution: number;
  percentageUnderDay: number;
  data: Array<{ date: string; avgResolutionTime: number }>;
}

export interface SatisfactionAnalytics extends BaseAnalyticsResult {
  avgRating: number;
  percentageHigh: number;
  percentageLow: number;
  data: Array<{ rating: number; count: number }>;
  ratingDistribution: Array<{ rating: number; count: number }>;
}

export interface IssueDistributionAnalytics extends BaseAnalyticsResult {
  issueDistribution: Array<{ type: string; count: number }>;
  topIssue: { type: string; count: number };
  categories: Array<{ name: string; count: number }>;
  data: Array<{ type: string; count: number }>;
}

export interface TicketTrendsAnalytics extends BaseAnalyticsResult {
  totalTickets: number;
  avgTicketsPerPeriod: number;
  maxTicketsInPeriod: number;
  data: Array<{ period: string; count: number }>;
}

export type AnalyticsResult =
  | ResolutionTimeAnalytics
  | SatisfactionAnalytics
  | IssueDistributionAnalytics
  | TicketTrendsAnalytics;

// Add types for streamable UI
export interface StreamableUIProps {
  content: string | any[];
  done: boolean;
}

export interface StreamableValue {
  value: string;
}

export interface IntentResult {
  intent: string;
  metric?: keyof typeof ANALYTICS_METRICS;
  query?: string;
  metrics?: Array<keyof typeof ANALYTICS_METRICS>;
  reportType?: string;
} 