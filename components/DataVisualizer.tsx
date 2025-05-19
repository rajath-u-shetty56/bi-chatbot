"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, 
  Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, TooltipProps, Area, AreaChart,
  Label, Sector, RadialBarChart, RadialBar, ComposedChart
} from 'recharts';
import { useMemo, useRef, useState } from 'react';
import { exportToPDF } from '@/lib/pdfUtils';
import { AIExplanation } from './AIExplanation';
import { QueryExplanation } from './QueryExplanation';

export interface QueryResult {
  chartType?: "bar" | "line" | "pie" | "table";
  data: any;
  summary: string;
  insights: Array<string>;
  aiExplanation: string;
}

interface AnalyticsResponse {
  type: string;
  data: {
    title: string;
    description: string;
    summaryMetrics: Array<{ label: string; value: string }>;
    insights: string[];
    data: Array<{ type: string; count: number }>;
    aiExplanation?: string;
  };
  metric: string;
}

const CHART_COLORS = [
  '#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899',
  '#06b6d4', '#84cc16', '#14b8a6', '#f43f5e', '#a855f7', '#ec4899'
];

const CHART_HEIGHT = 400; // Increased height for better visibility

const NoDataDisplay = ({ message }: { message?: string }) => (
  <div className="flex items-center justify-center h-64 border rounded-md bg-gray-50 dark:bg-gray-800">
    <p className="text-gray-500">{message || 'No data available to visualize'}</p>
  </div>
);

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: TooltipProps<any, any>) => {
  if (!active || !payload) return null;

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
      <p className="font-medium text-gray-900 dark:text-gray-100">{label}</p>
      {payload.map((entry: any, index: number) => (
        <p key={index} style={{ color: entry.color }}>
          {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
        </p>
      ))}
    </div>
  );
};

const generateAnalysis = (result: QueryResult, query: string) => {
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('resolution time')) {
    return {
      explanation: result.aiExplanation || "Analysis of ticket resolution times across your dataset.",
      analysisPoints: [
        {
          title: "Resolution Time Patterns",
          description: "Detailed breakdown of how quickly tickets are being resolved, identifying peak efficiency periods and potential bottlenecks."
        },
        {
          title: "Performance Metrics",
          description: `Average resolution time is ${result.data[0]?.avgResolutionTime?.toFixed(1) || 'N/A'} days, with ${result.data.filter((d: any) => d.avgResolutionTime < 1).length} tickets resolved within 24 hours.`
        }
      ],
      trendAnalysis: "The trend line indicates " + (
        result.data.slice(-3).every((d: any, i: number, arr: any[]) => 
          i === 0 || d.avgResolutionTime <= arr[i-1].avgResolutionTime
        ) ? "improving resolution times" : "potential areas for improvement in resolution speed"
      ),
      impactAnalysis: "Resolution time directly impacts customer satisfaction and team efficiency. " +
        "Quick resolutions typically lead to higher satisfaction rates and better resource utilization.",
      recommendations: [
        "Focus on tickets that exceed the average resolution time",
        "Identify and replicate practices from high-performing periods",
        "Consider implementing automated responses for common issues",
        "Review resource allocation during peak periods"
      ]
    };
  }
  
  if (lowerQuery.includes('issue') || lowerQuery.includes('distribution')) {
    interface IssueData {
      type: string;
      count: number;
    }

    // Ensure we have valid data
    const processedData = result.data.map((item: any): IssueData => ({
      type: item.type || item.name || 'Unknown',
      count: item.count || item.value || 0
    }));

    const totalIssues = processedData.reduce((sum: number, item: IssueData) => sum + item.count, 0);
    const topIssues = [...processedData].sort((a: IssueData, b: IssueData) => b.count - a.count);
    
    // Calculate percentages for each issue type
    const issuePercentages = processedData.map((item: IssueData) => ({
      type: item.type,
      percentage: ((item.count / totalIssues) * 100).toFixed(1)
    }));

    // Get the top 3 issues for analysis
    const top3Issues = topIssues.slice(0, 3);
    const top3Percentage = top3Issues.reduce((sum, item) => sum + item.count, 0) / totalIssues * 100;

    return {
      explanation: `Analysis of ${totalIssues} tickets across ${processedData.length} different issue types. ` +
        `The most common issue type is "${top3Issues[0]?.type}" with ${top3Issues[0]?.count} tickets (${
          ((top3Issues[0]?.count || 0) / totalIssues * 100).toFixed(1)
        }% of total).`,
      
      analysisPoints: [
        {
          title: "Issue Distribution Overview",
          description: `Total of ${totalIssues} tickets distributed across ${processedData.length} distinct issue categories. ` +
            `The top 3 issues account for ${top3Percentage.toFixed(1)}% of all tickets.`
        },
        {
          title: "Primary Issue Types",
          description: top3Issues.map(issue => 
            `${issue.type}: ${issue.count} tickets (${((issue.count / totalIssues) * 100).toFixed(1)}%)`
          ).join('\n')
        },
        {
          title: "Distribution Pattern",
          description: top3Percentage > 75 ? 
            "Shows a concentrated distribution with a few dominant issue types." :
            "Shows a relatively even distribution across issue types."
        }
      ],
      
      trendAnalysis: 
        `Issue distribution analysis reveals that ${
          top3Issues[0]?.type
        } is the predominant issue type, accounting for ${
          ((top3Issues[0]?.count || 0) / totalIssues * 100).toFixed(1)
        }% of all tickets. ` +
        `${
          top3Percentage > 75 
            ? "This suggests a concentrated pattern of issues that might benefit from focused resolution strategies."
            : "The distribution suggests a diverse range of issues requiring broad support capabilities."
        }`,
      
      impactAnalysis: 
        `The current distribution pattern has significant implications for resource allocation and support strategies. ` +
        `${
          top3Percentage > 75
            ? "With a high concentration of similar issues, there's potential for standardized solutions and automation."
            : "The diverse issue spread suggests a need for varied expertise and flexible support approaches."
        } ` +
        `Understanding this distribution helps optimize training, documentation, and support processes.`,
      
      recommendations: [
        `Focus on creating comprehensive documentation for "${top3Issues[0]?.type}" issues`,
        `Develop specialized training for handling ${top3Issues.map(i => `"${i.type}"`).join(', ')} issues`,
        `Consider automated solutions for common "${top3Issues[0]?.type}" scenarios`,
        `Regularly review and update support procedures for top issue types`,
        `Implement preventive measures based on common issue patterns`
      ]
    };
  }
  
  if (lowerQuery.includes('trend') || lowerQuery.includes('volume')) {
    const recentTrend = result.data.slice(-3);
    const isIncreasing = recentTrend.every((d: any, i: number, arr: any[]) => 
      i === 0 || d.count >= arr[i-1].count
    );
    
    return {
      explanation: result.aiExplanation || "Analysis of ticket volume trends and patterns over time.",
      analysisPoints: [
        {
          title: "Volume Trends",
          description: `Ticket volume shows a ${isIncreasing ? 'rising' : 'varying'} trend over the analyzed period.`
        },
        {
          title: "Peak Analysis",
          description: `Peak volume reached ${Math.max(...result.data.map((d: any) => d.count || 0))} tickets in a single period.`
        }
      ],
      trendAnalysis: "The trend analysis indicates " + (
        isIncreasing ? 
        "an increasing ticket volume, suggesting growing customer engagement or potential areas needing attention." :
        "fluctuating ticket volumes, with periodic peaks and troughs in customer support demands."
      ),
      impactAnalysis: "Ticket volume trends help predict staffing needs and identify potential system or process issues that may lead to increased support requests.",
      recommendations: [
        "Plan resource allocation based on identified peak periods",
        "Investigate causes of significant volume increases",
        "Implement proactive measures during high-volume periods",
        "Consider automated solutions for handling volume spikes"
      ]
    };
  }

  // Default analysis for other queries
  return {
    explanation: result.aiExplanation || "Analysis of your support ticket data.",
    analysisPoints: [
      {
        title: "Overview",
        description: "General analysis of the queried data points and patterns."
      }
    ],
    recommendations: [
      "Review the specific metrics for detailed insights",
      "Consider analyzing trends over different time periods",
      "Compare results with historical data for context"
    ]
  };
};

export function DataVisualizer({ result, query }: { result: QueryResult; query: string }) {
  const visualizationRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  // Process analytics data
  const processAnalyticsData = useMemo(() => {
    if (!result) return null;

    const analyticsData = result as unknown as AnalyticsResponse;
    if (analyticsData?.type !== 'analytics') return null;

    const { data } = analyticsData;
    const total = data.data.reduce((sum, item) => sum + (item.count || 0), 0);
    const sortedData = [...data.data].sort((a, b) => (b.count || 0) - (a.count || 0));
    const topItem = sortedData[0];

    return {
      explanation: data.aiExplanation || `Analysis of ${total} items shows ${topItem.type} as the most common type with ${topItem.count} occurrences (${((topItem.count/total)*100).toFixed(1)}% of total).`,
      analysisPoints: [
        {
          title: "Distribution Overview",
          description: data.summaryMetrics
            .map(metric => `${metric.label}: ${metric.value}`)
            .join('. ')
        },
        {
          title: "Key Findings",
          description: data.insights.join('\n')
        }
      ],
      trendAnalysis: `The distribution analysis shows that ${topItem.type} is the predominant category, accounting for ${((topItem.count/total)*100).toFixed(1)}% of all items.`,
      impactAnalysis: `This distribution pattern has significant implications for resource allocation and process optimization. Understanding these patterns can help in improving efficiency and response times.`,
      recommendations: [
        `Focus on optimizing processes for ${topItem.type}`,
        "Develop specialized handling procedures for top categories",
        "Consider automation opportunities for common scenarios",
        "Regular review and updates of handling procedures",
        "Staff training focused on high-volume categories"
      ]
    };
  }, [result]);

  // Validate data structure
  const isValidData = useMemo(() => {
    if (!result?.data) return false;
    if (Array.isArray(result.data)) {
      return result.data.length > 0 && typeof result.data[0] === 'object';
    }
    return typeof result.data === 'object';
  }, [result?.data]);

  // Get safe data keys
  const dataKeys = useMemo(() => {
    if (!isValidData) return [];
    if (Array.isArray(result.data)) {
      const firstItem = result.data[0];
      return Object.keys(firstItem).filter(key => key !== 'name');
    }
    return ['value'];
  }, [isValidData, result?.data]);

  // Format data for visualization if needed
  const formattedData = useMemo(() => {
    if (!isValidData) return [];
    if (!Array.isArray(result.data)) {
      // Convert object to array format
      return Object.entries(result.data).map(([name, value]) => ({
        name,
        value: typeof value === 'number' ? value : 0
      }));
    }
    return result.data;
  }, [isValidData, result?.data]);

  const renderBarChart = () => {
    if (!isValidData) return <NoDataDisplay message="Invalid data format for bar chart" />;

    return (
      <ResponsiveContainer width="100%" height={350}>
        <BarChart
          data={formattedData}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="name" 
            angle={-45} 
            textAnchor="end"
            height={70}
            interval={0}
          />
          <YAxis />
          <Tooltip />
          <Legend />
          {dataKeys.map((key, index) => (
            <Bar 
              key={key} 
              dataKey={key} 
              fill={CHART_COLORS[index % CHART_COLORS.length]} 
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const renderLineChart = () => {
    if (!isValidData) return <NoDataDisplay message="Invalid data format for line chart" />;

    return (
      <ResponsiveContainer width="100%" height={350}>
        <LineChart
          data={formattedData}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="name" 
            angle={-45} 
            textAnchor="end"
            height={70}
            interval={0}
          />
          <YAxis />
          <Tooltip />
          <Legend />
          {dataKeys.map((key, index) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={CHART_COLORS[index % CHART_COLORS.length]}
              activeDot={{ r: 8 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  };

  const renderPieChart = () => {
    if (!isValidData) return <NoDataDisplay message="Invalid data format for pie chart" />;

    return (
      <ResponsiveContainer width="100%" height={350}>
        <PieChart>
          <Pie
            data={formattedData}
            cx="50%"
            cy="50%"
            labelLine={true}
            label={({ name, value }) => `${name}: ${value}`}
            outerRadius={120}
            fill="#8884d8"
            dataKey="value"
          >
            {formattedData.map((entry: any, index: number) => (
              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => [value, '']} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  const renderTable = () => {
    if (!isValidData) return <NoDataDisplay message="Invalid data format for table view" />;
    
    const columns = Object.keys(formattedData[0]);
    
    return (
      <div className="w-full overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              {columns.map((column) => (
                <th
                  key={column}
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
            {formattedData.map((row: any, rowIndex: number) => (
              <tr key={rowIndex} className={rowIndex % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50 dark:bg-gray-800"}>
                {columns.map((column) => (
                  <td
                    key={`${rowIndex}-${column}`}
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300"
                  >
                    {row[column]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderResolutionTimeChart = () => {
    if (!isValidData) return <NoDataDisplay message="Invalid data format for resolution time chart" />;

    return (
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <AreaChart
          data={formattedData}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <defs>
            <linearGradient id="resolutionTimeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="date" 
            angle={-45} 
            textAnchor="end"
            height={70}
            interval={0}
          >
            <Label value="Date" position="bottom" offset={50} />
          </XAxis>
          <YAxis>
            <Label value="Resolution Time (days)" angle={-90} position="insideLeft" offset={0} />
          </YAxis>
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Area
            type="monotone"
            dataKey="avgResolutionTime"
            stroke="#3b82f6"
            fill="url(#resolutionTimeGradient)"
            name="Average Resolution Time"
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  };

  const renderIssueDistributionChart = () => {
    if (!isValidData) return <NoDataDisplay message="Invalid data format for issue distribution chart" />;

    // Format data to ensure it has the required structure
    const processedData = formattedData.map(item => ({
      name: item.type || item.name || 'Unknown',
      value: typeof item.count === 'number' ? item.count : (typeof item.value === 'number' ? item.value : 0)
    }));

    // Calculate total for percentages
    const total = processedData.reduce((sum, item) => sum + item.value, 0);

    // Sort data by value in descending order
    const sortedData = [...processedData].sort((a, b) => b.value - a.value);

    const onPieEnter = (_: any, index: number) => {
      setActiveIndex(index);
    };

    const renderActiveShape = (props: any) => {
      const { cx, cy, innerRadius, outerRadius, startAngle, endAngle,
        fill, payload, percent } = props;

      const percentage = (percent * 100).toFixed(1);
      const value = payload.value;

      return (
        <g>
          <text x={cx} y={cy - 20} dy={8} textAnchor="middle" fill="#888" className="text-sm">
            {payload.name}
          </text>
          <text x={cx} y={cy} dy={8} textAnchor="middle" fill="#888" className="text-lg font-semibold">
            {value}
          </text>
          <text x={cx} y={cy + 20} dy={8} textAnchor="middle" fill="#888" className="text-sm">
            {`${percentage}%`}
          </text>
          <Sector
            cx={cx}
            cy={cy}
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            startAngle={startAngle}
            endAngle={endAngle}
            fill={fill}
          />
          <Sector
            cx={cx}
            cy={cy}
            startAngle={startAngle}
            endAngle={endAngle}
            innerRadius={outerRadius + 6}
            outerRadius={outerRadius + 10}
            fill={fill}
          />
        </g>
      );
    };

    const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, value, name }: any) => {
      const RADIAN = Math.PI / 180;
      const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
      const x = cx + radius * Math.cos(-midAngle * RADIAN);
      const y = cy + radius * Math.sin(-midAngle * RADIAN);
      
      if (percent < 0.05) return null; // Don't show labels for small segments

      return (
        <text 
          x={x} 
          y={y} 
          fill="#888"
          textAnchor={x > cx ? 'start' : 'end'} 
          dominantBaseline="central"
          className="text-xs"
        >
          {`${name}: ${(percent * 100).toFixed(0)}%`}
        </text>
      );
    };

    return (
      <div className="relative" style={{ width: '100%', height: CHART_HEIGHT }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              activeIndex={activeIndex}
              activeShape={renderActiveShape}
              data={sortedData}
              cx="50%"
              cy="50%"
              innerRadius={80}
              outerRadius={120}
              fill="#8884d8"
              dataKey="value"
              onMouseEnter={onPieEnter}
              label={CustomLabel}
              labelLine={false}
            >
              {sortedData.map((entry: any, index: number) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                  strokeWidth={1}
                />
              ))}
            </Pie>
            <Tooltip 
              content={({ active, payload }) => {
                if (!active || !payload || !payload[0]) return null;
                const data = payload[0].payload;
                return (
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                    <p className="font-medium">{data.name}</p>
                    <p className="text-sm">Count: {data.value}</p>
                    <p className="text-sm">Percentage: {((data.value / total) * 100).toFixed(1)}%</p>
                  </div>
                );
              }}
            />
            <Legend 
              layout="vertical" 
              align="right"
              verticalAlign="middle"
              formatter={(value, entry: any) => {
                const item = sortedData.find(d => d.name === value);
                if (!item) return value;
                return `${value} (${item.value})`;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const renderTicketTrendsChart = () => {
    if (!isValidData) return <NoDataDisplay message="Invalid data format for ticket trends chart" />;

    return (
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <ComposedChart
          data={formattedData}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="period" 
            angle={-45} 
            textAnchor="end"
            height={70}
            interval={0}
          >
            <Label value="Time Period" position="bottom" offset={50} />
          </XAxis>
          <YAxis yAxisId="left">
            <Label value="Number of Tickets" angle={-90} position="insideLeft" />
          </YAxis>
          <YAxis yAxisId="right" orientation="right">
            <Label value="Trend" angle={90} position="insideRight" />
          </YAxis>
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar
            yAxisId="left"
            dataKey="count"
            fill="#3b82f6"
            name="Ticket Count"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="trend"
            stroke="#f59e0b"
            name="Trend"
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    );
  };

  const renderChart = () => {
    if (!isValidData) return <NoDataDisplay />;

    // Determine chart type based on data and query content
    const lowerQuery = query.toLowerCase();
    if (lowerQuery.includes('resolution time')) {
      return renderResolutionTimeChart();
    } else if (lowerQuery.includes('issue') || lowerQuery.includes('distribution')) {
      return renderIssueDistributionChart();
    } else if (lowerQuery.includes('trend') || lowerQuery.includes('volume')) {
      return renderTicketTrendsChart();
    }

    // Fallback to default chart types
    switch (result.chartType) {
      case "bar":
        return renderBarChart();
      case "line":
        return renderLineChart();
      case "pie":
        return renderPieChart();
      case "table":
        return renderTable();
      default:
        return renderBarChart();
    }
  };

  const handleExportPDF = async () => {
    if (!visualizationRef.current) return;
    
    try {
      await exportToPDF(visualizationRef.current, result, query);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      // You might want to show a toast notification here
    }
  };

  return (
    <div className="space-y-6">
      {/* Query Explanation Section */}
      <QueryExplanation
        query={query}
        explanation={result.aiExplanation || (result as any)?.data?.aiExplanation}
        summary={(result as any)?.data?.description}
        insights={(result as any)?.data?.insights}
      />

      {/* Visualization Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {(result as any)?.data?.title || `Visualization: ${query}`}
          </CardTitle>
          {(result as any)?.data?.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {(result as any).data.description}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <div ref={visualizationRef}>
            {renderChart()}
          </div>
        </CardContent>
      </Card>

      {/* Analysis Section */}
      {processAnalyticsData && (
        <AIExplanation 
          {...processAnalyticsData}
          query={query}
        />
      )}

      {/* Summary Metrics */}
      {(result as any)?.data?.summaryMetrics && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Summary Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(result as any).data.summaryMetrics.map((metric: any, index: number) => (
                <div key={index} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-sm text-gray-500 dark:text-gray-400">{metric.label}</div>
                  <div className="text-lg font-semibold mt-1">{metric.value}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insights Section */}
      {(result as any)?.data?.insights && (result as any).data.insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Key Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
              {(result as any).data.insights.map((insight: string, index: number) => (
                <li key={index}>{insight}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={handleExportPDF}>Export to PDF</Button>
      </div>
    </div>
  );
}