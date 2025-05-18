"use server";

import { Message, TextStreamMessage } from "@/components/message";
import { generateId, CoreMessage } from "ai";
import { createAI, createStreamableUI, getMutableAIState } from "ai/rsc";
import { openai } from "@ai-sdk/openai";
import { ReactNode } from "react";
import { AnalyticsCard } from "@/components/AnalyticsCard";
import { DatasetSummaryView } from "@/components/DatasetSummaryView";
import { DatasetUploadForm } from "@/components/DatasetUploadForm";
import { DataVisualizer } from "@/components/DataVisualizer";
import {
  getTicketAnalytics,
  getDatasetList,
  getDatasetById,
  getDatasetSummary,
  analyzeDataByQuery,
  db,
} from "@/lib/prisma";
import { ErrorMessage } from "@/components/ErrorMessage";
import { 
  AIState, 
  UIState, 
  UIMessage, 
  MessageRole,
  StreamableUIProps,
  StreamableValue,
  IntentResult,
  ChartType,
  QueryResult,
  AnalyticsData
} from "@/types/chat";

// Initialize OpenAI client
const openaiClient = openai("gpt-3.5-turbo-instruct");

// Add these constants near the top of the file, after the imports
const ANALYTICS_METRICS = {
  agent_performance: "agent_performance",
  ticket_trends: "ticket_trends",
  satisfaction: "satisfaction",
  issue_distribution: "issue_distribution",
  resolution_time: "resolution_time",
} as const;

const ANALYTICS_QUERIES = {
  [ANALYTICS_METRICS.agent_performance]: {
    metric: "resolution_time",
    chartType: "bar",
    groupBy: "agent",
  },
  [ANALYTICS_METRICS.ticket_trends]: {
    metric: "ticket_count",
    chartType: "line",
    groupBy: "month",
  },
  [ANALYTICS_METRICS.satisfaction]: {
    metric: "satisfaction",
    chartType: "bar",
    groupBy: "priority",
  },
  [ANALYTICS_METRICS.issue_distribution]: {
    metric: "issue_distribution",
    chartType: "pie",
    groupBy: "category",
  },
  [ANALYTICS_METRICS.resolution_time]: {
    metric: "resolution_time",
    chartType: "line",
    groupBy: "date",
  },
} as const;

// Update the type definitions
type ChartType = "bar" | "line" | "pie" | "table";

interface AnalyticsData {
  title: string;
  description: string;
  summaryMetrics: Array<{ label: string; value: string }>;
  insights: Array<string>;
  data: any[];
  aiExplanation?: string;
  chartType?: ChartType;
}

// Interface for dataset
interface Dataset {
  id: string;
  name: string;
  recordCount: number;
  createdAt: string;
}

// Interface for dataset summary
interface DatasetSummary {
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

// Interface for query results
interface QueryResult {
  chartType?: ChartType;
  data: any[];
  summary: string;
  insights: Array<string>;
  aiExplanation: string;
}

// Add interface for report data
interface ReportSection {
  title: string;
  content: string;
  visualization?: {
    chartType: "bar" | "line" | "pie" | "table";
    data: any[];
    summary: string;
    insights: string[];
    aiExplanation?: string;
  };
}

interface ReportData {
  datasetId: string;
  reportType: string;
  metrics: string[];
  generated: string;
  sections: ReportSection[];
}

// Define UI component types
type UIComponentType = 
  | "analytics"
  | "dataset-upload"
  | "dataset-list"
  | "dataset-summary"
  | "data-visualization"
  | "error"
  | "report";

interface BaseUIComponent {
  type: UIComponentType;
}

interface AnalyticsUIData extends BaseUIComponent {
  type: "analytics";
  data: AnalyticsData;
  metric: string;
}

interface DatasetUploadUIData extends BaseUIComponent {
  type: "dataset-upload";
}

interface DatasetListUIData extends BaseUIComponent {
  type: "dataset-list";
  data: Dataset[];
}

interface DatasetSummaryUIData extends BaseUIComponent {
  type: "dataset-summary";
  data: DatasetSummary;
}

interface DataVisualizerUIData extends BaseUIComponent {
  type: "data-visualization";
  data: QueryResult;
}

interface ErrorUIData extends BaseUIComponent {
  type: "error";
  message: string;
}

interface ReportUIData extends BaseUIComponent {
  type: "report";
  data: ReportData;
}

type UIComponentData = 
  | AnalyticsUIData 
  | DatasetUploadUIData 
  | DatasetListUIData 
  | DatasetSummaryUIData 
  | DataVisualizerUIData 
  | ErrorUIData 
  | ReportUIData;

// Add these interfaces near the top with other interfaces
interface BaseAnalyticsResult {
  data: any[];
  insights?: string[];
}

interface ResolutionTimeAnalytics extends BaseAnalyticsResult {
  avgResolutionTime: number;
  fastestResolution: number;
  slowestResolution: number;
  percentageUnderDay: number;
  data: Array<{ date: string; avgResolutionTime: number }>;
}

interface SatisfactionAnalytics extends BaseAnalyticsResult {
  avgRating: number;
  percentageHigh: number;
  percentageLow: number;
  data: Array<{ rating: number; count: number }>;
  ratingDistribution: Array<{ rating: number; count: number }>;
}

interface IssueDistributionAnalytics extends BaseAnalyticsResult {
  issueDistribution: Array<{ type: string; count: number }>;
  topIssue: { type: string; count: number };
  categories: Array<{ name: string; count: number }>;
  data: Array<{ type: string; count: number }>;
}

interface TicketTrendsAnalytics extends BaseAnalyticsResult {
  totalTickets: number;
  avgTicketsPerPeriod: number;
  maxTicketsInPeriod: number;
  data: Array<{ period: string; count: number }>;
}

type AnalyticsResult =
  | ResolutionTimeAnalytics
  | SatisfactionAnalytics
  | IssueDistributionAnalytics
  | TicketTrendsAnalytics;

// Add type guard functions
function isResolutionTimeAnalytics(data: AnalyticsResult): data is ResolutionTimeAnalytics {
  return 'avgResolutionTime' in data && 'fastestResolution' in data;
}

function isSatisfactionAnalytics(data: AnalyticsResult): data is SatisfactionAnalytics {
  return 'avgRating' in data && 'ratingDistribution' in data;
}

function isIssueDistributionAnalytics(data: AnalyticsResult): data is IssueDistributionAnalytics {
  return 'issueDistribution' in data && 'topIssue' in data;
}

function isTicketTrendsAnalytics(data: AnalyticsResult): data is TicketTrendsAnalytics {
  return 'totalTickets' in data && 'avgTicketsPerPeriod' in data;
}

// Helper function to get metric title
const getMetricTitle = (metric: string) => {
  switch (metric) {
    case ANALYTICS_METRICS.resolution_time:
      return "Resolution Time Analysis";
    case ANALYTICS_METRICS.satisfaction:
      return "Satisfaction Score Analysis";
    case ANALYTICS_METRICS.issue_distribution:
      return "Issue Type Distribution";
    case ANALYTICS_METRICS.agent_performance:
      return "Agent Performance Analysis";
    case ANALYTICS_METRICS.ticket_trends:
      return "Ticket Volume Trends";
    default:
      return metric;
  }
};

// Helper function for word capitalization
const capitalizeWord = (word: string): string => word.charAt(0).toUpperCase() + word.slice(1);

// Helper function for title case conversion
const toTitleCase = (text: string): string => {
  return text
    .replace(/_/g, " ")
    .split(" ")
    .map(capitalizeWord)
    .join(" ");
};

// Function to handle tool selection and execution
const handleToolExecution = async (toolName: string, args: any): Promise<UIComponentData> => {
  console.log(`Executing tool: ${toolName} with args:`, args);

  switch (toolName) {
    case "uploadDataset":
      return {
        type: "dataset-upload",
      };

    case "listDatasets":
      try {
        const datasets = await getDatasetList();

        if (!Array.isArray(datasets)) {
          throw new Error("Invalid datasets format returned");
        }

        // Validate dataset structure
        const validatedDatasets = datasets.map((dataset) => {
          if (
            !dataset.id ||
            !dataset.name ||
            dataset.recordCount === undefined ||
            !dataset.createdAt
          ) {
            console.warn("Dataset missing required fields:", dataset);
          }
          return {
            ...dataset,
            createdAt: dataset.createdAt.toISOString(),
          } as Dataset;
        });

        return {
          type: "dataset-list",
          data: validatedDatasets,
        };
      } catch (error) {
        console.error("Error retrieving datasets:", error);
        return {
          type: "error",
          message: "Failed to fetch datasets. Please try again later.",
        };
      }

    case "getTicketAnalytics":
      try {
        const { metric, chartType, groupBy } = args;
        if (!metric) {
          throw new Error("Metric is required");
        }

        const validMetrics = Object.values(ANALYTICS_METRICS);
        if (!validMetrics.includes(metric)) {
          throw new Error(
            `Invalid metric: ${metric}. Must be one of: ${validMetrics.join(
              ", "
            )}`
          );
        }

        // Get list of available datasets
        const datasets = await getDatasetList();
        if (!datasets || datasets.length === 0) {
          return {
            type: "error",
            message: "No datasets found. Please upload a dataset first.",
          };
        }

        // Use the first available dataset if none is specified
        const currentDatasetId = datasets[0].id;

        // Map the frontend metric to the backend metric
        const queryConfig =
          ANALYTICS_QUERIES[metric as keyof typeof ANALYTICS_METRICS];
        if (!queryConfig) {
          throw new Error(`No query configuration found for metric: ${metric}`);
        }

        const rawAnalytics = (await getTicketAnalytics(
          currentDatasetId,
          queryConfig.metric,
          queryConfig.groupBy
        )) as AnalyticsResult;

        if (!rawAnalytics || typeof rawAnalytics !== "object") {
          throw new Error("Invalid analytics data returned from server");
        }

        // For satisfaction analytics, the data is in ratingDistribution
        const analyticsData =
          metric === ANALYTICS_METRICS.satisfaction
            ? (rawAnalytics as SatisfactionAnalytics).ratingDistribution
            : metric === ANALYTICS_METRICS.issue_distribution
            ? (rawAnalytics as IssueDistributionAnalytics).issueDistribution
            : rawAnalytics.data;

        // Ensure we have the minimum required data structure
        if (!Array.isArray(analyticsData)) {
          console.error("Invalid data structure received:", rawAnalytics);
          throw new Error("Analytics data is not in the expected format");
        }

        // Create a plain serializable object for the analytics data
        const analytics: AnalyticsData = {
          title: getMetricTitle(metric),
          description: `Analysis of ${metric} grouped by ${queryConfig.groupBy}`,
          summaryMetrics: [],
          insights: [],
          data: analyticsData,
          chartType: queryConfig.chartType,
        };

        // Add metric-specific data and AI explanations
        let aiExplanation = "";
        if (metric === ANALYTICS_METRICS.issue_distribution) {
          const issueData = rawAnalytics as IssueDistributionAnalytics;
          analytics.summaryMetrics = [
            {
              label: "Top Issue",
              value: `${issueData.topIssue.type} (${issueData.topIssue.count})`,
            },
            {
              label: "Total Categories",
              value: issueData.categories.length.toString(),
            },
          ];
          analytics.insights = [
            `Most common issue: ${issueData.topIssue.type} with ${issueData.topIssue.count} tickets`,
            `Top category: ${issueData.categories[0].name} with ${issueData.categories[0].count} tickets`,
          ];
          aiExplanation = `Based on the analysis of issue distribution, the data shows that ${issueData.topIssue.type} is the most common issue type with ${issueData.topIssue.count} tickets. This represents a significant portion of all tickets. The distribution across ${issueData.categories.length} categories suggests ${issueData.categories.length > 5 ? 'a diverse range of issues' : 'a concentrated set of issues'}. Understanding this distribution can help in resource allocation and identifying areas needing immediate attention.`;
        } else if (metric === ANALYTICS_METRICS.resolution_time) {
          const resolutionData = rawAnalytics as ResolutionTimeAnalytics;
          analytics.summaryMetrics = [
            {
              label: "Average Resolution Time",
              value: `${resolutionData.avgResolutionTime.toFixed(1)} days`,
            },
            {
              label: "Fastest Resolution",
              value: `${resolutionData.fastestResolution.toFixed(1)} days`,
            },
            {
              label: "Slowest Resolution",
              value: `${resolutionData.slowestResolution.toFixed(1)} days`,
            },
          ];
          analytics.insights = [
            `Average resolution time: ${resolutionData.avgResolutionTime.toFixed(1)} days`,
            `${resolutionData.percentageUnderDay.toFixed(1)}% of tickets resolved within 24 hours`,
            `Fastest resolution: ${resolutionData.fastestResolution.toFixed(1)} days`,
            `Slowest resolution: ${resolutionData.slowestResolution.toFixed(1)} days`,
          ];
          aiExplanation = `Analysis of ticket resolution times shows an average resolution time of ${resolutionData.avgResolutionTime.toFixed(1)} days. ${resolutionData.percentageUnderDay.toFixed(1)}% of tickets are resolved within 24 hours, indicating ${resolutionData.percentageUnderDay > 50 ? 'good efficiency in handling most tickets' : 'potential areas for improvement in resolution speed'}. The range from ${resolutionData.fastestResolution.toFixed(1)} to ${resolutionData.slowestResolution.toFixed(1)} days suggests ${(resolutionData.slowestResolution - resolutionData.fastestResolution) > 7 ? 'significant variation in resolution times that may need attention' : 'relatively consistent handling of tickets'}.`;
        } else if (metric === ANALYTICS_METRICS.satisfaction) {
          const satisfactionData = rawAnalytics as SatisfactionAnalytics;
          analytics.summaryMetrics = [
            {
              label: "Average Rating",
              value: `${satisfactionData.avgRating.toFixed(1)}/5`,
            },
            {
              label: "High Satisfaction",
              value: `${satisfactionData.percentageHigh.toFixed(1)}%`,
            },
            {
              label: "Low Satisfaction",
              value: `${satisfactionData.percentageLow.toFixed(1)}%`,
            },
          ];
          analytics.insights = [
            `Average satisfaction rating: ${satisfactionData.avgRating.toFixed(1)}/5`,
            `${satisfactionData.percentageHigh.toFixed(1)}% high satisfaction ratings (4-5)`,
            `${satisfactionData.percentageLow.toFixed(1)}% low satisfaction ratings (1-2)`,
          ];
          aiExplanation = `Customer satisfaction analysis reveals an average rating of ${satisfactionData.avgRating.toFixed(1)}/5. ${satisfactionData.percentageHigh.toFixed(1)}% of customers gave high ratings (4-5), while ${satisfactionData.percentageLow.toFixed(1)}% reported low satisfaction (1-2). This indicates ${satisfactionData.avgRating >= 4 ? 'strong overall customer satisfaction' : satisfactionData.avgRating >= 3 ? 'moderate satisfaction with room for improvement' : 'significant challenges in meeting customer expectations'}. The distribution suggests ${satisfactionData.percentageHigh > 70 ? 'consistently positive customer experiences' : 'areas needing attention to improve customer satisfaction'}.`;
        } else if (metric === ANALYTICS_METRICS.ticket_trends) {
          const trendsData = rawAnalytics as TicketTrendsAnalytics;
          analytics.summaryMetrics = [
            {
              label: "Total Tickets",
              value: trendsData.totalTickets.toString(),
            },
            {
              label: "Average per Period",
              value: trendsData.avgTicketsPerPeriod.toFixed(1),
            },
            {
              label: "Peak Volume",
              value: trendsData.maxTicketsInPeriod.toString(),
            },
          ];
          analytics.insights = [
            `Total tickets: ${trendsData.totalTickets}`,
            `Average ${trendsData.avgTicketsPerPeriod.toFixed(1)} tickets per period`,
            `Peak volume: ${trendsData.maxTicketsInPeriod} tickets`,
          ];
          aiExplanation = `Ticket volume trend analysis shows a total of ${trendsData.totalTickets} tickets, with an average of ${trendsData.avgTicketsPerPeriod.toFixed(1)} tickets per period. Peak volume reached ${trendsData.maxTicketsInPeriod} tickets, which is ${((trendsData.maxTicketsInPeriod / trendsData.avgTicketsPerPeriod - 1) * 100).toFixed(1)}% above average. This pattern indicates ${trendsData.maxTicketsInPeriod > trendsData.avgTicketsPerPeriod * 1.5 ? 'significant volume fluctuations that may require dynamic resource allocation' : 'relatively stable ticket volumes with predictable patterns'}.`;
        } else if (metric === ANALYTICS_METRICS.agent_performance) {
          const performanceData = rawAnalytics as ResolutionTimeAnalytics;
          analytics.summaryMetrics = [
            {
              label: "Average Resolution Time",
              value: `${performanceData.avgResolutionTime.toFixed(1)} days`,
            },
            {
              label: "Best Performance",
              value: `${performanceData.fastestResolution.toFixed(1)} days`,
            },
            {
              label: "Needs Improvement",
              value: `${performanceData.slowestResolution.toFixed(1)} days`,
            },
          ];
          analytics.insights = [
            `Team average resolution time: ${performanceData.avgResolutionTime.toFixed(1)} days`,
            `Best performing agents resolve tickets in ${performanceData.fastestResolution.toFixed(1)} days`,
            `Some tickets take up to ${performanceData.slowestResolution.toFixed(1)} days to resolve`,
            `${performanceData.percentageUnderDay.toFixed(1)}% of tickets resolved within 24 hours`,
          ];
          aiExplanation = `Agent performance analysis shows varying levels of efficiency across the team. The average resolution time is ${performanceData.avgResolutionTime.toFixed(1)} days, with top performers resolving tickets in ${performanceData.fastestResolution.toFixed(1)} days. ${performanceData.percentageUnderDay.toFixed(1)}% of tickets are handled within 24 hours, indicating ${performanceData.percentageUnderDay > 60 ? 'strong overall team performance' : 'opportunities for performance improvement'}. The significant range between fastest (${performanceData.fastestResolution.toFixed(1)} days) and slowest (${performanceData.slowestResolution.toFixed(1)} days) resolutions suggests potential for knowledge sharing and process standardization to improve team-wide efficiency.`;
        }

        // Add the AI explanation to the analytics object
        analytics.aiExplanation = aiExplanation;

        return {
          type: "analytics",
          data: analytics,
          metric,
        };
      } catch (error) {
        console.error(`Error retrieving ticket analytics:`, error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "An unexpected error occurred";
        return {
          type: "error",
          message: `Failed to fetch analytics: ${errorMessage}`,
        };
      }

    case "getDatasetSummary":
      try {
        const { datasetId } = args;
        if (!datasetId) {
          throw new Error("Dataset ID is required");
        }

        const summaryRaw = await getDatasetSummary(datasetId);

        if (
          !summaryRaw ||
          !summaryRaw.id ||
          !summaryRaw.name ||
          summaryRaw.recordCount === undefined
        ) {
          throw new Error("Invalid dataset summary data");
        }

        const summary: DatasetSummary = {
          ...summaryRaw,
          description:
            summaryRaw.description === null
              ? undefined
              : summaryRaw.description,
        };

        return {
          type: "dataset-summary",
          data: summary,
        };
      } catch (error) {
        console.error(`Error retrieving dataset summary:`, error);
        return {
          type: "error",
          message: `Failed to fetch dataset summary. Please verify the dataset exists and try again.`,
        };
      }

    case "visualizeData":
      try {
        const { datasetId, query, chartType } = args;
        if (!datasetId) {
          return {
            type: "error" as const,
            message: "Dataset ID is required",
          };
        }

        if (!query) {
          return {
            type: "error" as const,
            message: "Query is required",
          };
        }

        const result = await analyzeDataByQuery(datasetId, query, chartType);

        if (!result) {
          return {
            type: "error" as const,
            message: "Failed to retrieve visualization data",
          };
        }

        // Validate and ensure result has the expected structure
        const validChartTypes = ["bar", "line", "pie", "table"] as const;
        const validatedResult: QueryResult = {
          chartType: validChartTypes.includes(result.chartType as any)
            ? (result.chartType as "bar" | "line" | "pie" | "table")
            : "table",
          data: Array.isArray(result.data) ? result.data : [],
          summary: result.summary || "No summary available",
          insights: Array.isArray(result.insights) ? result.insights : [],
          aiExplanation: result.aiExplanation || "No AI explanation available"
        };

        console.log("Analysis result with AI explanation:", validatedResult);

        return {
          type: "data-visualization" as const,
          data: validatedResult,
        };
      } catch (error) {
        console.error(`Error visualizing data:`, error);
        return {
          type: "error" as const,
          message: `Failed to visualize data. Please verify the query and try again.`,
        };
      }

    case "generateReport":
      try {
        const { datasetId, reportType, metrics } = args;
        if (!datasetId) {
          return {
            type: "error" as const,
            message: "Dataset ID is required",
          };
        }

        if (!reportType) {
          return {
            type: "error" as const,
            message: "Report type is required",
          };
        }

        if (!metrics || !Array.isArray(metrics) || metrics.length === 0) {
          return {
            type: "error" as const,
            message: "At least one metric must be specified",
          };
        }

        // Validate dataset exists
        const dataset = await getDatasetById(datasetId);
        if (!dataset) {
          return {
            type: "error" as const,
            message: `Dataset with ID ${datasetId} not found`,
          };
        }

        // Generate report sections with visualizations
        const reportData: ReportData = {
          datasetId,
          reportType,
          metrics,
          generated: new Date().toISOString(),
          sections: await Promise.all(
            metrics.map(async (metric) => {
              try {
                // Map the frontend metric to the backend metric
                const queryConfig = ANALYTICS_QUERIES[metric as keyof typeof ANALYTICS_METRICS];
                if (!queryConfig) {
                  throw new Error(`No query configuration found for metric: ${metric}`);
                }

                // Get analytics data for the metric
                const metricData = await getTicketAnalytics(
                  datasetId,
                  queryConfig.metric,
                  queryConfig.groupBy
                ) as AnalyticsResult;

                if (!metricData) {
                  return {
                    title: toTitleCase(metric),
                    content: `No data available for ${metric}`,
                  };
                }

                // Format content based on metric type
                let content = "";
                let insights: string[] = [];
                let chartType: "bar" | "line" | "pie" | "table" = queryConfig.chartType || "bar";
                let data: any[] = [];

                if (isResolutionTimeAnalytics(metricData)) {
                  content = `Average resolution time is ${metricData.avgResolutionTime.toFixed(1)} days. ${metricData.percentageUnderDay.toFixed(1)}% of tickets are resolved within a day.`;
                  insights = [
                    `Fastest resolution: ${metricData.fastestResolution.toFixed(1)} days`,
                    `Slowest resolution: ${metricData.slowestResolution.toFixed(1)} days`,
                    `${metricData.percentageUnderDay.toFixed(1)}% of tickets resolved in under 24 hours`,
                  ];
                  data = metricData.data;
                } else if (isSatisfactionAnalytics(metricData)) {
                  content = `Overall customer satisfaction rating is ${metricData.avgRating.toFixed(1)}/5.`;
                  insights = [
                    `${metricData.percentageHigh.toFixed(1)}% of tickets received high satisfaction ratings (4-5)`,
                    `${metricData.percentageLow.toFixed(1)}% of tickets received low satisfaction ratings (1-2)`,
                  ];
                  data = metricData.ratingDistribution;
                } else if (isIssueDistributionAnalytics(metricData)) {
                  content = `Analysis of issue distribution across ${metricData.issueDistribution.length} different categories.`;
                  insights = [
                    `Most common issue: ${metricData.topIssue.type} with ${metricData.topIssue.count} tickets`,
                    `Top category: ${metricData.categories[0].name} with ${metricData.categories[0].count} tickets`,
                  ];
                  data = metricData.issueDistribution;
                  chartType = "pie";
                } else if (isTicketTrendsAnalytics(metricData)) {
                  content = `Analysis of ticket volume trends over time. Total of ${metricData.totalTickets} tickets analyzed.`;
                  insights = [
                    `Average of ${metricData.avgTicketsPerPeriod.toFixed(1)} tickets per period`,
                    `Peak volume of ${metricData.maxTicketsInPeriod} tickets in a single period`,
                  ];
                  data = metricData.data;
                  chartType = "line";
                }

                return {
                  title: toTitleCase(metric),
                  content,
                  visualization: {
                    chartType,
                    data,
                    summary: content,
                    insights,
                    aiExplanation: `Based on the ${reportType.toLowerCase()} analysis of ${metric.replace(/_/g, ' ')}, ` +
                      `the data shows ${content.toLowerCase()} ` +
                      `Key findings include: ${insights.map(i => i.toLowerCase()).join('. ')}.`
                  },
                };
              } catch (error) {
                console.error(`Failed to get data for metric ${metric}:`, error);
                return {
                  title: toTitleCase(metric),
                  content: "Unable to retrieve data for this metric.",
                };
              }
            })
          ),
        };

        return {
          type: "report" as const,
          data: reportData,
        };
      } catch (error) {
        console.error(`Error generating report:`, error);
        return {
          type: "error" as const,
          message: `Failed to generate report. Please verify the parameters and try again.`,
        };
      }

    default:
      return {
        type: "error" as const,
        message: `Unknown tool: ${toolName}`,
      };
  }
};

// Function to detect intent from user message
const detectIntent = async (message: string) => {
  // Normalize message for intent detection
  const lowerMessage = message.toLowerCase();

  // Report generation intents
  if (
    (lowerMessage.includes("generate") || lowerMessage.includes("create")) &&
    (lowerMessage.includes("report") || lowerMessage.includes("summary"))
  ) {
    return {
      intent: "generate_report",
      metrics: [
        ANALYTICS_METRICS.resolution_time,
        ANALYTICS_METRICS.satisfaction,
        ANALYTICS_METRICS.issue_distribution,
        ANALYTICS_METRICS.ticket_trends
      ],
      reportType: lowerMessage.includes("monthly") ? "Monthly" : "General"
    };
  }

  // Dataset management intents
  if (lowerMessage.includes("upload")) {
    return { intent: "upload_dataset" };
  }

  if (lowerMessage.includes("list") && lowerMessage.includes("dataset")) {
    return { intent: "list_datasets" };
  }

  // Analytics requests
  if (
    lowerMessage.includes("resolution time") ||
    lowerMessage.includes("agent performance") ||
    (lowerMessage.includes("time") && lowerMessage.includes("resolve")) ||
    lowerMessage.includes("agent metrics") ||
    lowerMessage.includes("performance metrics")
  ) {
    return {
      intent: "show_analytics",
      metric: ANALYTICS_METRICS.agent_performance,
    };
  }

  if (
    (lowerMessage.includes("tickets") || lowerMessage.includes("ticket")) &&
    (lowerMessage.includes("over time") ||
      lowerMessage.includes("trend") ||
      lowerMessage.includes("volume") ||
      lowerMessage.includes("monthly") ||
      lowerMessage.includes("created"))
  ) {
    return {
      intent: "show_analytics",
      metric: ANALYTICS_METRICS.ticket_trends,
    };
  }

  if (
    lowerMessage.includes("satisfaction") ||
    lowerMessage.includes("rating") ||
    lowerMessage.includes("csat") ||
    lowerMessage.includes("happy") ||
    lowerMessage.includes("satisfaction scores")
  ) {
    return {
      intent: "show_analytics",
      metric: ANALYTICS_METRICS.satisfaction,
    };
  }

  if (
    (lowerMessage.includes("break down") ||
      lowerMessage.includes("breakdown") ||
      lowerMessage.includes("distribution")) &&
    (lowerMessage.includes("issue") ||
      lowerMessage.includes("type") ||
      lowerMessage.includes("category"))
  ) {
    return {
      intent: "show_analytics",
      metric: ANALYTICS_METRICS.issue_distribution,
    };
  }

  // If no specific intent is detected, treat it as a chat query
  return { 
    intent: "analyze_data",
    query: message 
  };
};

// Add type guard for error responses
function isErrorResponse(response: UIComponentData): response is ErrorUIData {
  return response.type === "error";
}

// Update the handleUserMessage function to handle undefined values
const handleUserMessage = async (message: string): Promise<UIComponentData | undefined> => {
  // First, detect the user's intent
  const intent = await detectIntent(message);
  console.log("Detected intent:", intent);

  // Based on intent, choose the appropriate tool or response
  switch (intent.intent) {
    case "upload_dataset":
      return await handleToolExecution("uploadDataset", {});

    case "list_datasets":
      return await handleToolExecution("listDatasets", {});

    case "show_analytics":
      return await handleToolExecution("getTicketAnalytics", {
        metric: intent.metric,
      });

    case "generate_report":
      // Get list of available datasets
      const datasets = await getDatasetList();
      if (!datasets || datasets.length === 0) {
        return {
          type: "error" as const,
          message: "No datasets found. Please upload a dataset first.",
        };
      }

      // Use the first available dataset
      const datasetId = datasets[0].id;

      return await handleToolExecution("generateReport", {
        datasetId,
        reportType: intent.reportType,
        metrics: intent.metrics,
      });

    case "analyze_data":
      // Get list of available datasets
      const availableDatasets = await getDatasetList();
      if (!availableDatasets || availableDatasets.length === 0) {
        return {
          type: "error" as const,
          message: "No datasets found. Please upload a dataset first.",
        };
      }

      // Use the first available dataset
      const currentDatasetId = availableDatasets[0].id;

      // Analyze the data based on the query
      if (!intent.query) {
        return {
          type: "error" as const,
          message: "No query provided for analysis.",
        };
      }

      const result = await analyzeDataByQuery(currentDatasetId, intent.query);
      
      return {
        type: "data-visualization" as const,
        data: result,
      };

    default:
      // Default to chat using LLM
      return undefined;
  }
};

// Update the sendMessage function to handle errors
const sendMessage = async (message: string) => {
  "use server";

  const aiState = getMutableAIState<typeof AI>();
  const currentAIMessages = aiState.get().messages;
  const currentUIState = aiState.get().uiState.messages;

  // Add user message
  const userMessage: CoreMessage = {
    role: "user",
    content: message,
  };

  const userUIMessage: UIMessage = {
    id: generateId(),
    role: "user",
    content: message,
  };

  try {
    // Try to handle with tools or direct UI components first
    const toolResponse = await handleUserMessage(message);

    if (toolResponse) {
      const assistantContent = "Here's the information you requested:";
      const assistantMessage: CoreMessage = {
        role: "assistant",
        content: assistantContent,
      };

      const assistantUIMessage: UIMessage = {
        id: generateId(),
        role: "assistant",
        content: assistantContent,
        ui: toolResponse,
      };

      // Update both states with assistant message
      aiState.done({
        ...aiState.get(),
        messages: [...currentAIMessages, userMessage, assistantMessage],
        uiState: {
          messages: [...currentUIState, userUIMessage, assistantUIMessage],
        },
      });

      return assistantUIMessage;
    }

    // If not handled by a tool, proceed with normal chat using OpenAI
    console.log("Processing with LLM chat...");
    const { value: stream } = await createStreamableUI(
      async (props: StreamableUIProps) => {
        const textContent = Array.isArray(props.content)
          ? props.content
              .map((part) =>
                typeof part === "string" ? part : JSON.stringify(part)
              )
              .join("")
          : typeof props.content === "string"
          ? props.content
          : JSON.stringify(props.content);

        if (props.done) {
          const assistantMessage: CoreMessage = {
            role: "assistant",
            content: textContent,
          };

          const assistantUIMessage: UIMessage = {
            id: generateId(),
            role: "assistant",
            content: textContent,
          };

          aiState.done({
            ...aiState.get(),
            messages: [...currentAIMessages, userMessage, assistantMessage],
            uiState: {
              messages: [...currentUIState, userUIMessage, assistantUIMessage],
            },
          });

          return <Message role="assistant" content={textContent} />;
        } else {
          return <TextStreamMessage content={textContent} />;
        }
      }
    );

    return stream;
  } catch (error) {
    console.error("Error in message processing:", error);

    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";
    const errorContent = `I encountered an error: ${errorMessage}. Please try again.`;
    
    const assistantMessage: CoreMessage = {
      role: "assistant",
      content: errorContent,
    };

    const errorUIMessage: UIMessage = {
      id: generateId(),
      role: "assistant",
      content: errorContent,
      ui: {
        type: "error" as const,
        message: errorMessage,
      },
    };

    aiState.done({
      ...aiState.get(),
      messages: [...currentAIMessages, userMessage, assistantMessage],
      uiState: {
        messages: [...currentUIState, userUIMessage, errorUIMessage],
      },
    });

    return errorUIMessage;
  }
};

export type AI = typeof AI;

export interface AIActions {
  sendMessage: (message: string) => Promise<any>;
}

export const AI = createAI<AIState, UIState>({
  initialAIState: {
    chatId: generateId(),
    messages: [],
    uiState: {
      messages: [],
    },
  },
  initialUIState: {
    messages: [],
  },
  actions: {
    sendMessage,
  },
  onSetAIState: async ({ state, done }) => {
    "use server";
    if (done) {
      try {
        // save to database
        // const result = await saveChatToDatabase(state.chatId, state.messages);
        // console.log("Chat saved successfully:", result);
      } catch (error) {
        console.error("Error saving chat state:", error);
      }
    }
  },
});

// Update error handling to use proper types
const handleError = (error: unknown): ErrorUIData => {
  console.error(`Error:`, error);
  return {
    type: "error",
    message: error instanceof Error ? error.message : "An unexpected error occurred",
  };
};

// Update report generation to use proper types
const generateReport = async (datasetId: string, reportType: string, metrics: string[]): Promise<ReportUIData> => {
  const reportData: ReportData = {
    datasetId,
    reportType,
    metrics,
    generated: new Date().toISOString(),
    sections: [],
  };

  return {
    type: "report",
    data: reportData,
  };
};
