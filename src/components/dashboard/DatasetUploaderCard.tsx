import { useCallback, useState } from "react";
import { FileUp, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { LIARLoader, FakeNewsNetLoader, ISOTLoader } from "@/lib/datasets";
import { insertDatasetItemsBatch } from "@/lib/datasets/datasetStorage";

type DatasetType = "liar" | "fakenewsnet" | "isot";

interface FileUpload {
  file: File;
  type: DatasetType;
  status: "pending" | "uploading" | "completed" | "error";
  progress: number;
}

export const DatasetUploaderCard = () => {
  const [uploads, setUploads] = useState<FileUpload[]>([]);
  const [processing, setProcessing] = useState(false);

  const detectDatasetType = (filename: string): DatasetType | null => {
    const lower = filename.toLowerCase();
    if (lower.includes("train") || lower.includes("test") || lower.includes("valid")) {
      if (lower.endsWith(".tsv")) return "liar";
    }
    if (lower.includes("true") || lower.includes("fake")) {
      if (lower.endsWith(".csv")) return "isot";
    }
    if (lower.endsWith(".json") || lower.endsWith(".jsonl")) return "fakenewsnet";
    return null;
  };

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);
      const newUploads: FileUpload[] = files.map((file) => ({
        file,
        type: detectDatasetType(file.name) || "liar",
        status: "pending",
        progress: 0,
      }));
      setUploads((prev) => [...prev, ...newUploads]);
    },
    []
  );

  const removeUpload = (index: number) => {
    setUploads((prev) => prev.filter((_, i) => i !== index));
  };

  const processUploads = async () => {
    if (uploads.length === 0) return;
    setProcessing(true);

    // Group files by dataset type
    const byType: Record<DatasetType, File[]> = {
      liar: [],
      fakenewsnet: [],
      isot: [],
    };

    for (const upload of uploads) {
      byType[upload.type].push(upload.file);
    }

    let totalInserted = 0;

    try {
      // Process LIAR files
      if (byType.liar.length > 0) {
        toast.info("Processing LIAR dataset...");
        const loader = new LIARLoader();
        const items = await loader.loadFromFiles(byType.liar);
        const insertItems = items.map((item) => ({
          dataset_name: item.dataset_name,
          original_id: item.original_id,
          text: item.text,
          source: item.source,
          label: item.label,
          metadata: item.metadata,
        }));
        const inserted = await insertDatasetItemsBatch(insertItems);
        totalInserted += inserted;
        toast.success(`LIAR: ${inserted} items inserted`);
      }

      // Process FakeNewsNet files
      if (byType.fakenewsnet.length > 0) {
        toast.info("Processing FakeNewsNet dataset...");
        const loader = new FakeNewsNetLoader();
        const items = await loader.loadFromJSONLFiles(byType.fakenewsnet);
        const insertItems = items.map((item) => ({
          dataset_name: item.dataset_name,
          original_id: item.original_id,
          text: item.text,
          source: item.source,
          label: item.label,
          metadata: item.metadata,
        }));
        const inserted = await insertDatasetItemsBatch(insertItems);
        totalInserted += inserted;
        toast.success(`FakeNewsNet: ${inserted} items inserted`);
      }

      // Process ISOT files
      if (byType.isot.length === 2) {
        toast.info("Processing ISOT dataset...");
        const loader = new ISOTLoader();
        const realFile = byType.isot.find((f) => f.name.toLowerCase().includes("true"));
        const fakeFile = byType.isot.find((f) => f.name.toLowerCase().includes("fake"));
        
        if (realFile && fakeFile) {
          const items = await loader.loadFromCSVFiles(realFile, fakeFile);
          const insertItems = items.map((item) => ({
            dataset_name: item.dataset_name,
            original_id: item.original_id,
            text: item.text,
            source: item.source,
            label: item.label,
            metadata: item.metadata,
          }));
          const inserted = await insertDatasetItemsBatch(insertItems);
          totalInserted += inserted;
          toast.success(`ISOT: ${inserted} items inserted`);
        } else {
          toast.error("ISOT requires both True.csv and Fake.csv files");
        }
      }

      toast.success(`Total: ${totalInserted} items uploaded`);
      setUploads([]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      toast.error(message);
    } finally {
      setProcessing(false);
    }
  };

  const getTypeLabel = (type: DatasetType) => {
    switch (type) {
      case "liar":
        return "LIAR";
      case "fakenewsnet":
        return "FakeNewsNet";
      case "isot":
        return "ISOT";
    }
  };

  return (
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="text-accent" /> Dataset Uploader
        </CardTitle>
        <CardDescription>
          Upload dataset files directly to Supabase. Supports LIAR (TSV), FakeNewsNet (JSON/JSONL), and ISOT (CSV).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File Drop Zone */}
        <div className="relative">
          <input
            type="file"
            multiple
            accept=".tsv,.csv,.json,.jsonl"
            onChange={handleFileSelect}
            className="absolute inset-0 cursor-pointer opacity-0"
            disabled={processing}
          />
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/50 p-6 transition-colors hover:bg-muted">
            <FileUp className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">Click or drag files to upload</p>
            <p className="text-xs text-muted-foreground">
              Supports .tsv, .csv, .json, .jsonl
            </p>
          </div>
        </div>

        {/* File List */}
        {uploads.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Selected Files ({uploads.length})</p>
            <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-border p-2">
              {uploads.map((upload, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-md bg-muted/50 p-2"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="truncate text-sm">{upload.file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({getTypeLabel(upload.type)})
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() => removeUpload(index)}
                    disabled={processing}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
          <p className="font-medium mb-1">Upload Instructions:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <strong>LIAR:</strong> Upload train.tsv, test.tsv, valid.tsv files
            </li>
            <li>
              <strong>FakeNewsNet:</strong> Upload JSON/JSONL files from politifact/gossipcop folders
            </li>
            <li>
              <strong>ISOT:</strong> Upload both True.csv and Fake.csv together
            </li>
          </ul>
        </div>

        {/* Process Button */}
        {uploads.length > 0 && (
          <Button
            onClick={processUploads}
            disabled={processing}
            className="w-full"
          >
            {processing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload {uploads.length} file{uploads.length !== 1 ? "s" : ""}
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
