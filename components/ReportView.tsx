import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataVisualizer } from "./DataVisualizer";
import { ReportData } from "@/types/chat";

export function ReportView({ data }: { data: ReportData }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-xl font-bold">
              {data.reportType} Report
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Generated on {new Date(data.generated).toLocaleString()}
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            {data.metrics.length} metrics analyzed
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {data.sections.map((section, index) => (
              <Card key={index} className="border border-gray-200 dark:border-gray-800">
                <CardHeader>
                  <CardTitle className="text-lg">{section.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {section.content}
                    </p>
                    {section.visualization && (
                      <div className="mt-4">
                        <DataVisualizer 
                          result={section.visualization} 
                          query={section.title}
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 