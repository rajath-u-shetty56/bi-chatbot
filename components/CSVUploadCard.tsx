import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { DatasetUploadForm } from "./DatasetUploadForm";

export function CSVUploadCard() {
  const [showUploadForm, setShowUploadForm] = useState(false);

  if (showUploadForm) {
    return <DatasetUploadForm />;
  }

  return (
    <Card className="w-full bg-zinc-800 border border-zinc-700 hover:bg-zinc-750 transition-all shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-bold text-blue-400">
          CSV Data Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-zinc-300 mb-4">
          Upload your CSV or Excel files and get instant insights through natural language queries.
        </p>
        <div className="flex items-center gap-4">
          <Button 
            onClick={() => setShowUploadForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Upload & Analyze
          </Button>
          <p className="text-sm text-zinc-400">
            Supports CSV and Excel files
          </p>
        </div>
      </CardContent>
    </Card>
  );
} 