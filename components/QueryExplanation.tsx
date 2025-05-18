import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface QueryExplanationProps {
  query: string;
  explanation: string;
  summary?: string;
  insights?: string[];
}

export function QueryExplanation({ query, explanation, summary, insights }: QueryExplanationProps) {
  if (!explanation && !summary && (!insights || insights.length === 0)) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <svg
            className="h-5 w-5 text-blue-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Query Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Original Query */}
        <div>
          <h4 className="font-medium text-sm text-gray-500 dark:text-gray-400 mb-1">Your Query</h4>
          <p className="text-gray-900 dark:text-gray-100">{query}</p>
        </div>

        {/* AI Explanation */}
        {explanation && (
          <div>
            <h4 className="font-medium text-sm text-gray-500 dark:text-gray-400 mb-1">AI Explanation</h4>
            <p className="text-gray-700 dark:text-gray-300">{explanation}</p>
          </div>
        )}

        {/* Summary */}
        {summary && (
          <div>
            <h4 className="font-medium text-sm text-gray-500 dark:text-gray-400 mb-1">Summary</h4>
            <p className="text-gray-700 dark:text-gray-300">{summary}</p>
          </div>
        )}

        {/* Insights */}
        {insights && insights.length > 0 && (
          <div>
            <h4 className="font-medium text-sm text-gray-500 dark:text-gray-400 mb-1">Key Insights</h4>
            <ul className="space-y-2">
              {insights.map((insight, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <span className="text-blue-500">•</span>
                  <span className="text-gray-700 dark:text-gray-300">{insight}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 