import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AnalyticsCard } from './AnalyticsCard';
import { ReportData } from '@/types/ui';

interface ReportViewProps {
  data: ReportData;
}

export function ReportView({ data }: ReportViewProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl">{data.title}</CardTitle>
            <p className="text-sm text-gray-500 dark:text-gray-400">{data.description}</p>
          </div>
          <Badge variant="outline" className="text-xs">
            {data.sections.length} metrics analyzed
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {data.sections.map((section, index) => (
              <div key={index} className="border-t border-gray-200 dark:border-gray-700 pt-6 first:border-0 first:pt-0">
                <h3 className="text-lg font-semibold mb-4">{section.title}</h3>
                <AnalyticsCard
                  data={{
                    title: section.title,
                    description: section.aiExplanation || '',
                    summaryMetrics: section.metrics,
                    insights: section.insights,
                    data: section.data,
                    aiExplanation: section.aiExplanation
                  }}
                  metric={section.title.toLowerCase().replace(/ /g, '_')}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 