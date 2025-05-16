"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, Bar, LineChart, Line, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface DataPoint {
  name: string;
  value: number;
}

interface TimeSeriesPoint {
  date: string;
  value: number;
}

interface AnalyticsData {
  title: string;
  description: string;
  summaryMetrics: Array<{
    label: string;
    value: string | number;
    change?: {
      value: number;
      positive: boolean;
    };
  }>;
  topItems?: Array<DataPoint>;
  timeSeriesData?: Array<TimeSeriesPoint>;
  distribution?: Array<DataPoint>;
  insights: Array<string>;
  data: any[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export function AnalyticsCard({ data, metric }: { data: AnalyticsData; metric: string }) {
  if (!data) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <p className="text-gray-500 dark:text-gray-400">No data available</p>
      </div>
    );
  }

  const getMetricTitle = () => {
    switch (metric) {
      case "resolution_time":
        return "Resolution Time Analysis";
      case "satisfaction":
        return "Satisfaction Score Analysis";
      case "issue_distribution":
        return "Issue Type Distribution";
      case "agent_performance":
        return "Agent Performance Analysis";
      case "ticket_trends":
        return "Ticket Volume Trends";
      default:
        return data.title || "Analytics Results";
    }
  };

  const getChartType = () => {
    switch (metric) {
      case 'issue_distribution':
        return 'pie';
      case 'ticket_trends':
        return 'line';
      case 'satisfaction':
      case 'agent_performance':
        return 'bar';
      default:
        return 'bar';
    }
  };

  const renderChart = () => {
    const chartType = getChartType();

    switch (chartType) {
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.data}
                dataKey="count"
                nameKey="type"
                cx="50%"
                cy="50%"
                outerRadius={100}
                fill="#8884d8"
                label
              >
                {data.data.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={data.data}
              margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="period"
                angle={-45}
                textAnchor="end"
                height={60}
                interval={0}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="count" stroke="#8884d8" activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        );

      default:
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={data.data}
              margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey={Object.keys(data.data[0]).find(key => key !== 'count')}
                angle={-45}
                textAnchor="end"
                height={60}
                interval={0}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        );
    }
  };

  const renderDistributionChart = () => {
    if (!data.distribution || data.distribution.length === 0) return null;

    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={data.distribution}
          margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="name" 
            angle={-45}
            textAnchor="end"
            height={60}
            interval={0}
          />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" fill="#3b82f6" />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const renderTimeSeriesChart = () => {
    if (!data.timeSeriesData || data.timeSeriesData.length === 0) return null;

    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={data.timeSeriesData}
          margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="date" 
            angle={-45}
            textAnchor="end"
            height={60}
            interval={0}
          />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="value" stroke="#3b82f6" activeDot={{ r: 8 }} />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  const renderTopItemsList = () => {
    if (!data.topItems || data.topItems.length === 0) return null;

    return (
      <div className="space-y-3">
        {data.topItems.map((item, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <span className="text-xs font-medium">{index + 1}</span>
              </div>
              <span className="text-sm">{item.name}</span>
            </div>
            <span className="font-medium">{item.value}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl">{getMetricTitle()}</CardTitle>
              {data.description && (
                <p className="text-sm text-gray-500 mt-1">{data.description}</p>
              )}
            </div>
            <Badge variant="outline">{metric.replace("_", " ")}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-6">
            {data.summaryMetrics.map((metric, index) => (
              <div key={index} className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <p className="text-sm text-gray-500">{metric.label}</p>
                <p className="text-2xl font-bold mt-1">{metric.value}</p>
                {metric.change && (
                  <div
                    className={`text-xs mt-1 flex items-center ${
                      metric.change.positive ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {metric.change.positive ? "↑" : "↓"} {metric.change.value}%
                  </div>
                )}
              </div>
            ))}
          </div>

          <Tabs defaultValue="charts">
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="charts">Charts</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
            </TabsList>
            
            <TabsContent value="charts" className="space-y-4 mt-4">
              {renderChart()}
              
              {data.topItems && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Top Items</h4>
                  {renderTopItemsList()}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="insights" className="mt-4">
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Key Insights</h4>
                <ul className="space-y-2">
                  {data.insights.map((insight, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="text-blue-500">•</span>
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}