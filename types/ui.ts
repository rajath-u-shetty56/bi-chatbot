import { Dataset, DatasetSummary, QueryResult, AnalyticsData } from "./chat";

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

export type UIComponentData = 
  | AnalyticsUIData 
  | DatasetUploadUIData 
  | DatasetListUIData 
  | DatasetSummaryUIData 
  | DataVisualizerUIData 
  | ErrorUIData 
  | ReportUIData; 