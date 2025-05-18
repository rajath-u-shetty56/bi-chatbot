import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface AnalysisPoint {
  title: string;
  description: string;
}

interface AIExplanationProps {
  explanation: string;
  analysisPoints?: AnalysisPoint[];
  recommendations?: string[];
  trendAnalysis?: string;
  impactAnalysis?: string;
  query?: string;
}

export function AIExplanation({ 
  explanation, 
  analysisPoints, 
  recommendations,
  trendAnalysis,
  impactAnalysis,
  query
}: AIExplanationProps) {
  if (!explanation) return null;

  return (
    <div className="space-y-6">
      {/* Main Analysis */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <svg
                  className="h-5 w-5 text-blue-600 dark:text-blue-300"
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
              </div>
              <h3 className="text-lg font-semibold">
                Analysis: {query ? `"${query}"` : 'Data Insights'}
              </h3>
            </div>
            <p className="text-gray-700 dark:text-gray-300">{explanation}</p>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Analysis Points */}
      {analysisPoints && analysisPoints.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <svg
                    className="h-5 w-5 text-green-600 dark:text-green-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold">Key Findings</h3>
              </div>
              <div className="space-y-3">
                {analysisPoints.map((point, index) => (
                  <div key={index} className="pl-4 border-l-2 border-green-200 dark:border-green-800">
                    <h4 className="font-medium text-green-700 dark:text-green-300">{point.title}</h4>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">{point.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trend Analysis */}
      {trendAnalysis && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                  <svg
                    className="h-5 w-5 text-purple-600 dark:text-purple-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold">Trend Analysis</h3>
              </div>
              <p className="text-gray-700 dark:text-gray-300">{trendAnalysis}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Impact Analysis */}
      {impactAnalysis && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center">
                  <svg
                    className="h-5 w-5 text-yellow-600 dark:text-yellow-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold">Impact Analysis</h3>
              </div>
              <p className="text-gray-700 dark:text-gray-300">{impactAnalysis}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {recommendations && recommendations.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                  <svg
                    className="h-5 w-5 text-red-600 dark:text-red-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold">Recommendations</h3>
              </div>
              <ul className="space-y-2 list-disc list-inside text-gray-700 dark:text-gray-300">
                {recommendations.map((recommendation, index) => (
                  <li key={index}>{recommendation}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 