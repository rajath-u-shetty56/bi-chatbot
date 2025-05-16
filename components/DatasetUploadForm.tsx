'use client'
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function DatasetUploadForm() {
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [datasetName, setDatasetName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    // Check if file is CSV or Excel
    const validTypes = [
      "text/csv", 
      "application/vnd.ms-excel", 
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ];
    
    if (!validTypes.includes(selectedFile.type)) {
      setError("Please upload a CSV or Excel file");
      setFile(null);
      return;
    }
    
    setError("");
    setFile(selectedFile);
    
    // Set default dataset name from filename
    if (!datasetName) {
      setDatasetName(selectedFile.name.split(".")[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setError("Please select a file to upload");
      return;
    }
    
    if (!datasetName) {
      setError("Please provide a name for the dataset");
      return;
    }
    
    setError("");
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", datasetName);
      formData.append("description", description);
      
      const response = await fetch("/api/datasets/upload", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to upload dataset");
      }
      
      setSuccess(true);
      setFile(null);
      setDatasetName("");
      setDescription("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Upload Dataset</CardTitle>
      </CardHeader>
      <CardContent>
        {success ? (
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-md mb-4">
            <p className="text-green-700 dark:text-green-300">
              Dataset uploaded successfully! You can now analyze it by referencing its name.
            </p>
            <Button 
              className="mt-2" 
              variant="outline" 
              onClick={() => setSuccess(false)}
            >
              Upload Another Dataset
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file">Select File (CSV or Excel)</Label>
              <Input
                id="file"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                required
              />
              {file && (
                <p className="text-sm text-gray-500">
                  Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="datasetName">Dataset Name</Label>
              <Input
                id="datasetName"
                value={datasetName}
                onChange={(e) => setDatasetName(e.target.value)}
                placeholder="Enter a name for this dataset"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a brief description of this dataset"
                rows={3}
              />
            </div>
            
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
                <p className="text-red-600 dark:text-red-300 text-sm">{error}</p>
              </div>
            )}
            
            <Button 
              type="submit" 
              disabled={isUploading || !file} 
              className="w-full"
            >
              {isUploading ? "Uploading..." : "Upload Dataset"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}