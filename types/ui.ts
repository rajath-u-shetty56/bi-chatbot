import { Dataset, DatasetSummary, QueryResult, AnalyticsData, ChartType } from "./chat";

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

export interface ReportSection {
  title: string;
  metrics: Array<{ label: string; value: string }>;
  insights: string[];
  data: any[];
  aiExplanation?: string;
  chartType: ChartType;
}

export interface ReportData {
  title: string;
  description: string;
  sections: ReportSection[];
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