import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Metric {
  name: string;
  value: string | number;
  change?: {
    value: number;
    trend: "up" | "down" | "neutral";
  };
}

interface CategoryData {
  name: string;
  count: number;
  percentage: number;
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

export function DatasetSummaryView({ summary }: { summary: DatasetSummary }) {
  const keyMetrics: Metric[] = [
    {
      name: "Total Tickets",
      value: summary.recordCount,
    },
    {
      name: "Avg. Resolution Time",
      value: `${summary.metrics.avgResolutionTime.toFixed(1)} days`,
    },
    {
      name: "Avg. Satisfaction",
      value: `${summary.metrics.avgSatisfactionRate.toFixed(1)}/5`,
    },
  ];

  // Create category data for charts
  const issueTypeData: CategoryData[] = summary.metrics.topIssueTypes.map((issue) => ({
    name: issue.name,
    count: issue.count,
    percentage: (issue.count / summary.recordCount) * 100,
  }));

  const priorityData: CategoryData[] = Object.entries(summary.metrics.priorityDistribution).map(
    ([name, count]) => ({
      name,
      count,
      percentage: (count / summary.recordCount) * 100,
    })
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl font-bold">{summary.name}</CardTitle>
              {summary.description && (
                <p className="text-sm text-gray-500 mt-1">{summary.description}</p>
              )}
            </div>
            <Badge variant="outline" className="text-xs">
              {new Date(summary.dateRange.start).toLocaleDateString()} - {" "}
              {new Date(summary.dateRange.end).toLocaleDateString()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {keyMetrics.map((metric) => (
              <div key={metric.name} className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <p className="text-sm text-gray-500">{metric.name}</p>
                <p className="text-2xl font-bold mt-1">{metric.value}</p>
                {metric.change && (
                  <div
                    className={`text-xs mt-1 flex items-center ${
                      metric.change.trend === "up"
                        ? "text-green-600"
                        : metric.change.trend === "down"
                        ? "text-red-600"
                        : "text-gray-500"
                    }`}
                  >
                    {metric.change.trend === "up" ? "↑" : metric.change.trend === "down" ? "↓" : "→"}{" "}
                    {metric.change.value}%
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="issues">
        <TabsList className="grid grid-cols-2">
          <TabsTrigger value="issues">Issue Types</TabsTrigger>
          <TabsTrigger value="priority">Priority Levels</TabsTrigger>
        </TabsList>
        
        <TabsContent value="issues" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Top Issue Types</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {issueTypeData.map((issue) => (
                  <div key={issue.name} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{issue.name}</span>
                      <span className="font-medium">{issue.count} ({issue.percentage.toFixed(1)}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${issue.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="priority" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Priority Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {priorityData.map((priority) => (
                  <div key={priority.name} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{priority.name}</span>
                      <span className="font-medium">{priority.count} ({priority.percentage.toFixed(1)}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full ${
                          priority.name.toLowerCase() === "high" || priority.name.toLowerCase() === "critical"
                            ? "bg-red-500"
                            : priority.name.toLowerCase() === "medium"
                            ? "bg-yellow-500"
                            : "bg-green-500"
                        }`}
                        style={{ width: `${priority.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}