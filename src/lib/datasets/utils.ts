import type { DatasetLabel, NormalizedDatasetItem } from "./types";

export function generateUUID(): string {
  return crypto.randomUUID();
}

export function normalizeLabel(
  rawLabel: string,
  labelMap?: Record<string, DatasetLabel>
): DatasetLabel {
  const normalized = rawLabel.toLowerCase().trim();
  
  if (labelMap && labelMap[normalized]) {
    return labelMap[normalized];
  }
  
  if (normalized === "true" || normalized === "real" || normalized === "1") {
    return "real";
  }
  if (normalized === "false" || normalized === "fake" || normalized === "0") {
    return "fake";
  }
  if (normalized.includes("misleading") || normalized.includes("half") || normalized.includes("mix")) {
    return "misleading";
  }
  
  return "real";
}

export function cleanText(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/[^\w\s.,!?;:()'"-]/g, "")
    .trim();
}

export function truncateText(text: string, maxLength: number = 10000): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

export function calculateStatistics(items: NormalizedDatasetItem[]) {
  const byLabel: Record<DatasetLabel, number> = { real: 0, fake: 0, misleading: 0 };
  const bySource: Record<string, number> = {};
  let totalLength = 0;

  for (const item of items) {
    byLabel[item.label] = (byLabel[item.label] || 0) + 1;
    bySource[item.source] = (bySource[item.source] || 0) + 1;
    totalLength += item.text.length;
  }

  return {
    total: items.length,
    byLabel,
    bySource,
    avgTextLength: items.length > 0 ? Math.round(totalLength / items.length) : 0,
  };
}

export function splitDataset(
  items: NormalizedDatasetItem[],
  trainRatio: number = 0.8,
  valRatio: number = 0.1
): {
  train: NormalizedDatasetItem[];
  validation: NormalizedDatasetItem[];
  test: NormalizedDatasetItem[];
} {
  const shuffled = [...items].sort(() => Math.random() - 0.5);
  
  const trainSize = Math.floor(shuffled.length * trainRatio);
  const valSize = Math.floor(shuffled.length * valRatio);
  
  return {
    train: shuffled.slice(0, trainSize),
    validation: shuffled.slice(trainSize, trainSize + valSize),
    test: shuffled.slice(trainSize + valSize),
  };
}

export function exportToJSON(items: NormalizedDatasetItem[]): string {
  return JSON.stringify(items, null, 2);
}

export function exportToCSV(items: NormalizedDatasetItem[]): string {
  const headers = ["id", "text", "source", "label", "dataset_name", "metadata"];
  const rows = items.map((item) => [
    item.id,
    `"${item.text.replace(/"/g, '""')}"`,
    item.source,
    item.label,
    item.dataset_name,
    `"${JSON.stringify(item.metadata).replace(/"/g, '""')}"`,
  ]);
  
  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}

export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
