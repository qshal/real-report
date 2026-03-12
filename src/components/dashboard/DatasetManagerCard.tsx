import { useEffect, useState } from "react";
import { Database, Download, FileJson, FileSpreadsheet, Loader2, RefreshCw, Search, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { DatasetLabel, NormalizedDatasetItem } from "@/lib/datasets";
import {
  fetchDatasetItems,
  getDatasetNames,
  getDatasetStatistics,
  getDatasetSummary,
} from "@/lib/datasets/datasetStorage";
import { downloadTrainingData, exportHuggingFaceFormat, exportSklearnFormat } from "@/lib/datasets/exportTraining";
import { downloadFile } from "@/lib/datasets";

interface DatasetStats {
  dataset_name: string;
  label: string;
  count: number;
  avg_text_length: number;
}

interface DatasetSummary {
  dataset_name: string;
  total_items: number;
  real_count: number;
  fake_count: number;
  misleading_count: number;
  unique_sources: number;
}

export const DatasetManagerCard = () => {
  const [summary, setSummary] = useState<DatasetSummary[]>([]);
  const [stats, setStats] = useState<DatasetStats[]>([]);
  const [datasetNames, setDatasetNames] = useState<string[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sampleItems, setSampleItems] = useState<NormalizedDatasetItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);

  useEffect(() => {
    loadDatasetInfo();
  }, []);

  useEffect(() => {
    if (selectedDataset) {
      loadSampleItems();
    }
  }, [selectedDataset]);

  const loadDatasetInfo = async () => {
    try {
      const [summaryData, statsData, names] = await Promise.all([
        getDatasetSummary(),
        getDatasetStatistics(),
        getDatasetNames(),
      ]);
      setSummary(summaryData);
      setStats(statsData);
      setDatasetNames(names);
      if (names.length > 0 && !selectedDataset) {
        setSelectedDataset(names[0]);
      }
    } catch {
      toast.error("Failed to load dataset information");
    }
  };

  const loadSampleItems = async () => {
    if (!selectedDataset) return;
    setLoading(true);
    try {
      const items = await fetchDatasetItems({
        datasetName: selectedDataset,
        limit: 5,
        searchQuery: searchQuery || undefined,
      });
      setSampleItems(items);
    } catch {
      toast.error("Failed to load sample items");
    } finally {
      setLoading(false);
    }
  };

  const handleExportTraining = async (format: "default" | "huggingface" | "sklearn") => {
    setExporting(format);
    try {
      const config = {
        datasetNames: selectedDataset ? [selectedDataset] : undefined,
        format: "json" as const,
        balanceClasses: true,
      };

      let result;
      switch (format) {
        case "huggingface":
          result = await exportHuggingFaceFormat(config);
          break;
        case "sklearn":
          result = await exportSklearnFormat(config);
          break;
        default:
          await downloadTrainingData(config);
          toast.success("Training data exported");
          setExporting(null);
          return;
      }

      downloadFile(result.content, result.filename, result.mimeType);
      toast.success(`${format} format exported`);
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(null);
    }
  };

  const getLabelBadgeStyle = (label: string) => {
    switch (label) {
      case "real":
        return "border-signal-real/30 bg-signal-real/10 text-signal-real";
      case "fake":
        return "border-signal-fake/30 bg-signal-fake/10 text-signal-fake";
      case "misleading":
        return "border-signal-warn/30 bg-signal-warn/10 text-signal-warn";
      default:
        return "";
    }
  };

  const totalItems = summary.reduce((sum, s) => sum + s.total_items, 0);

  return (
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="text-brand-highlight" /> Dataset Manager
        </CardTitle>
        <CardDescription>
          Manage benchmark datasets for training and evaluation. Total: {totalItems.toLocaleString()} items across {summary.length} datasets.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Dataset Summary */}
        {summary.length > 0 ? (
          <div className="grid gap-3">
            {summary.map((dataset) => (
              <div
                key={dataset.dataset_name}
                className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                  selectedDataset === dataset.dataset_name
                    ? "border-brand-highlight bg-brand-highlight/5"
                    : "border-border hover:border-brand-highlight/50"
                }`}
                onClick={() => setSelectedDataset(dataset.dataset_name)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{dataset.dataset_name}</span>
                    <Badge variant="outline">{dataset.total_items.toLocaleString()} items</Badge>
                  </div>
                  <div className="flex gap-1">
                    <Badge className="border-signal-real/30 bg-signal-real/10 text-signal-real">
                      {dataset.real_count} real
                    </Badge>
                    <Badge className="border-signal-fake/30 bg-signal-fake/10 text-signal-fake">
                      {dataset.fake_count} fake
                    </Badge>
                    {dataset.misleading_count > 0 && (
                      <Badge className="border-signal-warn/30 bg-signal-warn/10 text-signal-warn">
                        {dataset.misleading_count} misleading
                      </Badge>
                    )}
                  </div>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {dataset.unique_sources} unique sources
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-muted/50 p-4 text-center">
            <Database className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No datasets loaded</p>
            <p className="text-xs text-muted-foreground">
              Use the download script to prepare datasets
            </p>
          </div>
        )}

        {/* Sample Items */}
        {selectedDataset && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search in dataset..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && loadSampleItems()}
                  className="pl-8"
                />
              </div>
              <Button variant="outline" size="icon" onClick={loadSampleItems} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>

            {sampleItems.length > 0 ? (
              <div className="space-y-2">
                {sampleItems.map((item) => (
                  <div key={item.id} className="rounded-lg border border-border/80 bg-card/50 p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <Badge className={getLabelBadgeStyle(item.label)}>
                        {item.label.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{item.source}</span>
                    </div>
                    <p className="line-clamp-3 text-sm text-muted-foreground">{item.text}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground">No items found</p>
            )}
          </div>
        )}

        {/* Export Options */}
        {selectedDataset && (
          <div className="space-y-2 border-t border-border pt-4">
            <p className="text-sm font-medium">Export Training Data</p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportTraining("default")}
                disabled={!!exporting}
              >
                {exporting === "default" ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <FileJson className="mr-1 h-4 w-4" />
                )}
                Standard JSON
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportTraining("huggingface")}
                disabled={!!exporting}
              >
                {exporting === "huggingface" ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Database className="mr-1 h-4 w-4" />
                )}
                HuggingFace
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportTraining("sklearn")}
                disabled={!!exporting}
              >
                {exporting === "sklearn" ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="mr-1 h-4 w-4" />
                )}
                Scikit-Learn
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
