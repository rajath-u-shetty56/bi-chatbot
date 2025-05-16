"use server";

import { Message, TextStreamMessage } from "@/components/message";
import { generateId } from "ai";
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
  CoreMessage,
  UIComponentData,
  AnalyticsData,
  Dataset,
  DatasetSummary,
  QueryResult,
  ReportData
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

// Interface for dataset summary
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

// Interface for query results
export interface QueryResult {
  chartType?: "bar" | "line" | "pie" | "table";
  data: any[];
  summary: string;
  insights: Array<string>;
}

// Interface for analytics data
export interface AnalyticsData {
  title: string;
  description: string;
  summaryMetrics: Array<{ label: string; value: string }>;
  insights: Array<string>;
  data: any[];
}

// Interface for report data
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

// Interface for dataset
export interface Dataset {
  id: string;
  name: string;
  recordCount: number;
  createdAt: string;
}

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

// Update the interfaces at the top
interface AnalyticsUIData {
  type: "analytics";
  data: AnalyticsData;
  metric: string;
}

interface DatasetUploadUIData {
  type: "dataset-upload";
}

interface DatasetListUIData {
  type: "dataset-list";
  data: Dataset[];
}

interface DatasetSummaryUIData {
  type: "dataset-summary";
  data: DatasetSummary;
}

interface DataVisualizerUIData {
  type: "data-visualization";
  data: QueryResult;
}

interface ErrorUIData {
  type: "error";
  message: string;
}

interface ReportUIData {
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
        };

        // Add metric-specific data
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
        } else {
          analytics.summaryMetrics = Object.entries(rawAnalytics)
            .filter(
              ([key]) =>
                !key.includes("data") &&
                !key.includes("ratingDistribution") &&
                key !== "error" &&
                key !== "insights"
            )
            .map(([key, value]) => ({
              label: key
                .replace(/_/g, " ")
                .split(" ")
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" "),
              value:
                typeof value === "number"
                  ? value.toLocaleString()
                  : String(value || "N/A"),
            }));
          analytics.insights =
            rawAnalytics.insights?.map((insight) => String(insight)) || [];
        }

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
          throw new Error("Dataset ID is required");
        }

        if (!query) {
          throw new Error("Query is required");
        }

        const result = await analyzeDataByQuery(datasetId, query, chartType);

        if (!result) {
          throw new Error("Failed to retrieve visualization data");
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
        };

        return {
          type: "data-visualization",
          data: validatedResult,
        };
      } catch (error) {
        console.error(`Error visualizing data:`, error);
        return {
          type: "error",
          message: `Failed to visualize data. Please verify the query and try again.`,
        };
      }

    case "generateReport":
      try {
        const { datasetId, reportType, metrics, format } = args;
        if (!datasetId) {
          throw new Error("Dataset ID is required");
        }

        if (!reportType) {
          throw new Error("Report type is required");
        }

        if (!metrics || !Array.isArray(metrics) || metrics.length === 0) {
          throw new Error("At least one metric must be specified");
        }

        // Validate dataset exists
        const dataset = await getDatasetById(datasetId);
        if (!dataset) {
          throw new Error(`Dataset with ID ${datasetId} not found`);
        }

        // This would be replaced with actual report generation logic
        // For now, we'll create a more realistic placeholder
        const reportData: ReportData = {
          datasetId,
          reportType,
          metrics,
          generated: new Date().toISOString(),
          sections: await Promise.all(
            metrics.map(async (metric) => {
              try {
                // Attempt to get real data for each metric
                const metricData = await getTicketAnalytics(
                  datasetId,
                  metric,
                  undefined
                );

                interface MetricSection {
                  title: string;
                  content: string;
                }

                interface MetricData {
                  [key: string]: any;
                }

                return {
                  title: metric
                    .replace(/_/g, " ")
                    .split(" ")
                    .map(
                      (word: string) =>
                        word.charAt(0).toUpperCase() + word.slice(1)
                    )
                    .join(" "),
                  content: (metricData as MetricData)
                    ? `Analysis based on ${dataset.name} dataset shows significant trends in ${metric}.`
                    : `No data available for ${metric}`,
                } as MetricSection;
              } catch (error) {
                console.warn(
                  `Failed to get real data for metric ${metric}:`,
                  error
                );
                interface MetricError {
                  title: string;
                  content: string;
                }

                return {
                  title: metric
                    .replace(/_/g, " ")
                    .split(" ")
                    .map(
                      (word: string) =>
                        word.charAt(0).toUpperCase() + word.slice(1)
                    )
                    .join(" "),
                  content: "Unable to retrieve data for this metric.",
                } as MetricError;
              }
            })
          ),
        };

        return {
          type: "report",
          data: reportData,
        };
      } catch (error) {
        console.error(`Error generating report:`, error);
        return {
          type: "error",
          message: `Failed to generate report. Please verify the parameters and try again.`,
        };
      }

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
};

// Function to detect intent from user message
const detectIntent = async (message: string) => {
  // Normalize message for intent detection
  const lowerMessage = message.toLowerCase();

  // Simple intent detection based on keywords
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
    (lowerMessage.includes("time") && lowerMessage.includes("resolve"))
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
    lowerMessage.includes("csat")
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

  // Default intent
  return { intent: "chat" };
};

// Function to handle user message
const handleUserMessage = async (message: string) => {
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

    default:
      // Default to chat using LLM
      return null;
  }
};

// Main function to send and process messages
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
    const { value: stream } = await createStreamableUI(async ({ content, done }: StreamableUIProps) => {
      const textContent = Array.isArray(content)
        ? content
            .map((part) =>
              typeof part === "string" ? part : JSON.stringify(part)
            )
            .join("")
        : typeof content === "string"
        ? content
        : JSON.stringify(content);

      if (done) {
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
    });

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
        type: "error",
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
