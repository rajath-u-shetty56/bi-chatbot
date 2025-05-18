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
  StreamableUI,
  IntentResult,
  QueryResult,
  AnalyticsData,
  ChartType,
  Dataset,
  DatasetSummary,
  ResolutionTimeAnalytics,
  SatisfactionAnalytics,
  IssueDistributionAnalytics,
  TicketTrendsAnalytics,
  AnalyticsResult
} from "@/types/chat";

import {
  UIComponentData,
  BaseUIData,
  AnalyticsUIData,
  DatasetUploadUIData,
  DatasetListUIData,
  DatasetSummaryUIData,
  DataVisualizerUIData,
  ErrorUIData,
  ReportUIData,
  ReportData
} from "@/types/ui";

import {
  ANALYTICS_METRICS,
  ANALYTICS_QUERIES,
  getMetricTitle,
  AnalyticsMetric,
  AnalyticsQuery
} from "@/lib/analytics";

// Initialize OpenAI client
const openaiClient = openai("gpt-3.5-turbo-instruct");

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
        const { metric } = args;
        if (!metric) {
          throw new Error("Metric is required");
        }

        const validMetrics = Object.values(ANALYTICS_METRICS);
        if (!validMetrics.includes(metric)) {
          throw new Error(
            `Invalid metric: ${metric}. Must be one of: ${validMetrics.join(", ")}`
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
        const queryConfig = ANALYTICS_QUERIES[metric as keyof typeof ANALYTICS_METRICS];
        if (!queryConfig) {
          throw new Error(`No query configuration found for metric: ${metric}`);
        }

        const rawAnalytics = await getTicketAnalytics(
          currentDatasetId,
          queryConfig.metric,
          queryConfig.groupBy
        ) as AnalyticsResult;

        if (!rawAnalytics || typeof rawAnalytics !== "object") {
          throw new Error("Invalid analytics data returned from server");
        }

        let analyticsData: any[] = [];
        let summaryMetrics: Array<{ label: string; value: string }> = [];
        let insights: string[] = [];

        // Process different types of analytics results
        if (isResolutionTimeAnalytics(rawAnalytics)) {
          analyticsData = rawAnalytics.data;
          summaryMetrics = [
            {
              label: "Average Resolution Time",
              value: `${rawAnalytics.avgResolutionTime.toFixed(1)} days`
            },
            {
              label: "Fastest Resolution",
              value: `${rawAnalytics.fastestResolution.toFixed(1)} days`
            },
            {
              label: "% Resolved in 24h",
              value: `${rawAnalytics.percentageUnderDay.toFixed(1)}%`
            }
          ];
          insights = [
            `Average resolution time is ${rawAnalytics.avgResolutionTime.toFixed(1)} days`,
            `${rawAnalytics.percentageUnderDay.toFixed(1)}% of tickets are resolved within 24 hours`,
            `Fastest resolution time is ${rawAnalytics.fastestResolution.toFixed(1)} days`
          ];
        } else if (isSatisfactionAnalytics(rawAnalytics)) {
          analyticsData = rawAnalytics.data;
          summaryMetrics = [
            {
              label: "Average Rating",
              value: `${rawAnalytics.avgRating.toFixed(1)}/5`
            },
            {
              label: "High Satisfaction",
              value: `${rawAnalytics.percentageHigh.toFixed(1)}%`
            },
            {
              label: "Low Satisfaction",
              value: `${rawAnalytics.percentageLow.toFixed(1)}%`
            }
          ];
          insights = [
            `Average satisfaction rating is ${rawAnalytics.avgRating.toFixed(1)}/5`,
            `${rawAnalytics.percentageHigh.toFixed(1)}% of ratings are high (4-5)`,
            `${rawAnalytics.percentageLow.toFixed(1)}% of ratings are low (1-2)`
          ];
        } else if (isIssueDistributionAnalytics(rawAnalytics)) {
          analyticsData = rawAnalytics.data;
          const topIssueText = `${rawAnalytics.topIssue.type} (${rawAnalytics.topIssue.count})`;
          summaryMetrics = [
            {
              label: "Most Common Issue",
              value: topIssueText
            },
            {
              label: "Total Categories",
              value: rawAnalytics.categories.length.toString()
            }
          ];
          insights = [
            `Most common issue is ${topIssueText}`,
            `There are ${rawAnalytics.categories.length} different issue categories`
          ];
        } else if (isTicketTrendsAnalytics(rawAnalytics)) {
          analyticsData = rawAnalytics.data;
          summaryMetrics = [
            {
              label: "Total Tickets",
              value: rawAnalytics.totalTickets.toString()
            },
            {
              label: "Average per Period",
              value: rawAnalytics.avgTicketsPerPeriod.toFixed(1)
            }
          ];
          insights = [
            `Total of ${rawAnalytics.totalTickets} tickets processed`,
            `Average of ${rawAnalytics.avgTicketsPerPeriod.toFixed(1)} tickets per period`
          ];
        }

        if (!Array.isArray(analyticsData)) {
          throw new Error("Analytics data must be an array");
        }

        // Generate AI explanation based on the analytics type and data
        const aiExplanation = generateAnalyticsExplanation(metric, analyticsData, summaryMetrics, insights);

        // Create the analytics response with proper typing
        const analytics: AnalyticsData = {
          title: getMetricTitle(metric),
          description: `Analysis of ${metric} grouped by ${queryConfig.groupBy}`,
          summaryMetrics,
          insights,
          data: analyticsData,
          chartType: queryConfig.chartType as ChartType,
          aiExplanation
        };

        return {
          type: "analytics",
          data: analytics,
          metric
        } as AnalyticsUIData;

      } catch (error) {
        console.error("Error processing analytics:", error);
        return {
          type: "error",
          message: `Failed to process analytics: ${error instanceof Error ? error.message : "Unknown error"}`,
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
        const { datasetId, query, requestedChartType } = args;
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

        const result = await analyzeDataByQuery(datasetId, query, requestedChartType);

        if (!result) {
          return {
            type: "error" as const,
            message: "Failed to retrieve visualization data",
          };
        }

        // Ensure chart type is valid
        const validChartTypes = ["bar", "line", "pie", "table"] as const;
        const chartType = validChartTypes.includes(result.chartType as any) 
          ? result.chartType as ChartType 
          : "table" as ChartType;

        const queryResult: QueryResult = {
          chartType,
          data: Array.isArray(result.data) ? result.data : [],
          summary: result.summary || "No summary available",
          insights: Array.isArray(result.insights) ? result.insights : [],
          aiExplanation: result.aiExplanation || "No AI explanation available"
        };

        return {
          type: "data-visualization" as const,
          data: queryResult
        };
      } catch (error) {
        console.error(`Error visualizing data:`, error);
        return {
          type: "error" as const,
          message: `Failed to visualize data. Please verify the query and try again.`,
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
    lowerMessage.includes("resolution") ||
    lowerMessage.includes("time to resolve") ||
    lowerMessage.includes("how long") ||
    lowerMessage.includes("resolution time") ||
    lowerMessage.includes("average time")
  ) {
    return {
      intent: "show_analytics",
      metric: ANALYTICS_METRICS.resolution_time,
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

// Export only the async functions
export async function sendMessage(message: string) {
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
      async (props: StreamableUIProps): Promise<JSX.Element> => {
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

function generateAnalyticsExplanation(
  metric: string,
  data: any[],
  summaryMetrics: Array<{ label: string; value: string }>,
  insights: string[]
): string {
  switch (metric) {
    case 'satisfaction':
      const avgRating = summaryMetrics.find(m => m.label === "Average Rating")?.value || "N/A";
      const highSatisfaction = summaryMetrics.find(m => m.label === "High Satisfaction")?.value || "N/A";
      return `Analysis of customer satisfaction shows an average rating of ${avgRating}. ${highSatisfaction} of tickets received high satisfaction ratings (4-5 stars). This indicates ${
        parseFloat(avgRating) >= 4 ? 'strong overall customer satisfaction' : 'areas for potential improvement in customer satisfaction'
      }. ${insights[0]}`;

    case 'resolution_time':
      const avgResolution = summaryMetrics.find(m => m.label === "Average Resolution Time")?.value || "N/A";
      return `The analysis of resolution times reveals an average resolution time of ${avgResolution}. ${insights[0]}. This data suggests ${
        parseFloat(avgResolution) <= 2 ? 'efficient ticket handling' : 'potential opportunities for improving resolution speed'
      }.`;

    case 'issue_distribution':
      const topIssue = summaryMetrics.find(m => m.label === "Most Common Issue")?.value || "N/A";
      return `Analysis of issue distribution shows that ${topIssue} is the most common issue type. ${insights[0]}. Understanding this distribution can help in resource allocation and process optimization.`;

    case 'agent_performance':
      return `The agent performance analysis reveals variations in handling efficiency and customer satisfaction. ${insights[0]}. ${insights[1]}. This information can be used to identify best practices and areas for team improvement.`;

    default:
      return `Analysis of ${metric} shows interesting patterns in your data. ${insights.join(' ')}. This information can be used to optimize processes and improve service delivery.`;
  }
}
