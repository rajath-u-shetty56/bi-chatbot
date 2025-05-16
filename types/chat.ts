import { ReactNode } from 'react';
import { CoreMessage } from 'ai';

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
  data: any;
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
  data: {
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
      topIssueTypes: Array<{name: string, count: number}>;
      priorityDistribution: Record<string, number>;
    };
  };
}

export interface DataVisualizerUIData extends BaseUIData {
  type: 'data-visualization';
  data: {
    chartType?: "bar" | "line" | "pie" | "table";
    data: any[];
    summary: string;
    insights: Array<string>;
  };
}

export interface ErrorUIData extends BaseUIData {
  type: 'error';
  message: string;
  showDetails?: boolean;
  details?: string;
}

export interface ReportUIData extends BaseUIData {
  type: 'report';
  data: {
    datasetId: string;
    reportType: string;
    metrics: string[];
    generated: string;
    sections: Array<{
      title: string;
      content: string;
    }>;
  };
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

export interface QueryResult {
  chartType?: "bar" | "line" | "pie" | "table";
  data: any[];
  summary: string;
  insights: Array<string>;
}

export interface ReportData {
  datasetId: string;
  reportType: string;
  metrics: string[];
  generated: string;
  sections: Array<{
    title: string;
    content: string;
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

// Component specific types
export interface StockDataProps {
  symbol: string;
  timeframe?: 'recent' | 'full' | 'historical';
  startDate?: Date;
  endDate?: Date;
}

export interface RecommendationData {
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
  period: string;
}

export interface StockRecommendationProps {
  symbol: string;
  data: RecommendationData[];
  loading?: boolean;
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