import { ChartType } from "@/types/chat";

export const ANALYTICS_METRICS = {
  agent_performance: "agent_performance",
  ticket_trends: "ticket_trends",
  satisfaction: "satisfaction",
  issue_distribution: "issue_distribution",
  ticket_priority: "ticket_priority",
} as const;

export const ANALYTICS_QUERIES = {
  [ANALYTICS_METRICS.agent_performance]: {
    metric: "resolution_time",
    chartType: "bar" as ChartType,
    groupBy: "agent",
  },
  [ANALYTICS_METRICS.ticket_trends]: {
    metric: "ticket_count",
    chartType: "line" as ChartType,
    groupBy: "month",
  },
  [ANALYTICS_METRICS.satisfaction]: {
    metric: "satisfaction",
    chartType: "bar" as ChartType,
    groupBy: "priority",
  },
  [ANALYTICS_METRICS.issue_distribution]: {
    metric: "issue_distribution",
    chartType: "pie" as ChartType,
    groupBy: "category",
  },
  [ANALYTICS_METRICS.ticket_priority]: {
    metric: "issue_distribution",
    chartType: "pie" as ChartType,
    groupBy: "priority",
  },
} as const;

export type AnalyticsMetric = keyof typeof ANALYTICS_METRICS;
export type AnalyticsQuery = typeof ANALYTICS_QUERIES[AnalyticsMetric];

// Helper function to get metric title
export const getMetricTitle = (metric: string): string => {
  switch (metric) {
    case ANALYTICS_METRICS.ticket_priority:
      return "Ticket Priority Analysis";
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