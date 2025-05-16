"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, 
  Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, TooltipProps 
} from 'recharts';
import { useMemo } from 'react';

export interface QueryResult {
  chartType?: "bar" | "line" | "pie" | "table";
  data: any;
  summary: string;
  insights: Array<string>;
}

const CHART_COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'];

const NoDataDisplay = ({ message }: { message?: string }) => (
  <div className="flex items-center justify-center h-64 border rounded-md bg-gray-50 dark:bg-gray-800">
    <p className="text-gray-500">{message || 'No data available to visualize'}</p>
  </div>
);

export function DataVisualizer({ result, query }: { result: QueryResult; query: string }) {
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

  // Determine what chart to render based on chartType
  const renderChart = () => {
    if (!isValidData) return <NoDataDisplay />;

    // Render appropriate chart based on chart type
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
        // Default to bar chart if chart type not specified
        return renderBarChart();
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Visualization: {query}</CardTitle>
        </CardHeader>
        <CardContent>
          {renderChart()}
        </CardContent>
      </Card>

      <div className="space-y-4">
        {result?.summary && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{result.summary}</p>
            </CardContent>
          </Card>
        )}

        {result?.insights && result.insights.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Key Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-2">
                {result.insights.map((insight, index) => (
                  <li key={index}>{insight}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="flex justify-between">
        <Button variant="outline">Export Data</Button>
        <Button variant="outline">Download Chart</Button>
      </div>
    </div>
  );
}