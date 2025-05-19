import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnalyticsCard } from './AnalyticsCard';
import { ReportData } from '@/types/ui';

interface ReportProps {
  data: ReportData;
}

export function Report({ data }: ReportProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{data.title}</CardTitle>
          {data.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {data.description}
            </p>
          )}
        </CardHeader>
      </Card>

      {data.sections.map((section, index) => (
        <div key={index} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{section.title}</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Analytics Card for each section */}
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
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
} 