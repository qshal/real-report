import type { DatasetLabel, NormalizedDatasetItem } from "./types";
import { splitDataset, exportToJSON, exportToCSV, downloadFile } from "./utils";
import { fetchDatasetItems, getDatasetSample } from "./datasetStorage";

export interface TrainingExportConfig {
  datasetNames?: string[];
  labels?: DatasetLabel[];
  trainRatio?: number;
  valRatio?: number;
  format?: "json" | "csv";
  balanceClasses?: boolean;
  maxSamplesPerClass?: number;
  includeMetadata?: boolean;
}

export interface TrainingSplit {
  train: NormalizedDatasetItem[];
  validation: NormalizedDatasetItem[];
  test: NormalizedDatasetItem[];
  stats: {
    total: number;
    train: number;
    validation: number;
    test: number;
    byLabel: Record<DatasetLabel, { total: number; train: number; val: number; test: number }>;
  };
}

export interface ExportResult {
  filename: string;
  content: string;
  mimeType: string;
}

/**
 * Prepare training data with stratified split
 */
export async function prepareTrainingData(
  config: TrainingExportConfig = {}
): Promise<TrainingSplit> {
  const {
    datasetNames,
    labels,
    trainRatio = 0.8,
    valRatio = 0.1,
    balanceClasses = false,
    maxSamplesPerClass,
  } = config;

  // Fetch items from specified datasets or all
  let items: NormalizedDatasetItem[] = [];

  if (datasetNames && datasetNames.length > 0) {
    for (const name of datasetNames) {
      const datasetItems = await fetchDatasetItems({ datasetName: name, limit: 10000 });
      items.push(...datasetItems);
    }
  } else {
    items = await fetchDatasetItems({ limit: 10000 });
  }

  // Filter by labels if specified
  if (labels && labels.length > 0) {
    items = items.filter((item) => labels.includes(item.label));
  }

  // Balance classes if requested
  if (balanceClasses) {
    items = balanceDataset(items, maxSamplesPerClass);
  } else if (maxSamplesPerClass) {
    items = limitSamplesPerClass(items, maxSamplesPerClass);
  }

  // Split dataset
  const split = splitDataset(items, trainRatio, valRatio);

  // Calculate statistics
  const stats = calculateSplitStats(split);

  return {
    ...split,
    stats,
  };
}

/**
 * Balance dataset by undersampling majority classes
 */
function balanceDataset(
  items: NormalizedDatasetItem[],
  maxPerClass?: number
): NormalizedDatasetItem[] {
  const byLabel: Record<DatasetLabel, NormalizedDatasetItem[]> = {
    real: [],
    fake: [],
    misleading: [],
  };

  // Group by label
  for (const item of items) {
    byLabel[item.label].push(item);
  }

  // Find minimum class size
  const classSizes = Object.values(byLabel).map((arr) => arr.length);
  const minSize = Math.min(...classSizes.filter((s) => s > 0));
  const targetSize = maxPerClass ? Math.min(minSize, maxPerClass) : minSize;

  // Sample equally from each class
  const balanced: NormalizedDatasetItem[] = [];
  for (const [label, items] of Object.entries(byLabel)) {
    const shuffled = [...items].sort(() => Math.random() - 0.5);
    balanced.push(...shuffled.slice(0, targetSize));
  }

  return balanced.sort(() => Math.random() - 0.5);
}

/**
 * Limit samples per class
 */
function limitSamplesPerClass(
  items: NormalizedDatasetItem[],
  maxPerClass: number
): NormalizedDatasetItem[] {
  const byLabel: Record<DatasetLabel, NormalizedDatasetItem[]> = {
    real: [],
    fake: [],
    misleading: [],
  };

  for (const item of items) {
    byLabel[item.label].push(item);
  }

  const limited: NormalizedDatasetItem[] = [];
  for (const items of Object.values(byLabel)) {
    const shuffled = [...items].sort(() => Math.random() - 0.5);
    limited.push(...shuffled.slice(0, maxPerClass));
  }

  return limited.sort(() => Math.random() - 0.5);
}

/**
 * Calculate statistics for dataset split
 */
function calculateSplitStats(split: {
  train: NormalizedDatasetItem[];
  validation: NormalizedDatasetItem[];
  test: NormalizedDatasetItem[];
}): TrainingSplit["stats"] {
  const total = split.train.length + split.validation.length + split.test.length;

  const countByLabel = (items: NormalizedDatasetItem[]) => {
    const counts: Record<DatasetLabel, number> = { real: 0, fake: 0, misleading: 0 };
    for (const item of items) {
      counts[item.label]++;
    }
    return counts;
  };

  const trainCounts = countByLabel(split.train);
  const valCounts = countByLabel(split.validation);
  const testCounts = countByLabel(split.test);

  return {
    total,
    train: split.train.length,
    validation: split.validation.length,
    test: split.test.length,
    byLabel: {
      real: {
        total: trainCounts.real + valCounts.real + testCounts.real,
        train: trainCounts.real,
        val: valCounts.real,
        test: testCounts.real,
      },
      fake: {
        total: trainCounts.fake + valCounts.fake + testCounts.fake,
        train: trainCounts.fake,
        val: valCounts.fake,
        test: testCounts.fake,
      },
      misleading: {
        total: trainCounts.misleading + valCounts.misleading + testCounts.misleading,
        train: trainCounts.misleading,
        val: valCounts.misleading,
        test: testCounts.misleading,
      },
    },
  };
}

/**
 * Export training data to file
 */
export async function exportTrainingData(
  config: TrainingExportConfig = {}
): Promise<ExportResult> {
  const data = await prepareTrainingData(config);
  const format = config.format || "json";
  const includeMetadata = config.includeMetadata !== false;

  const timestamp = new Date().toISOString().split("T")[0];
  const datasetNames = config.datasetNames?.join("-") || "all";

  if (format === "json") {
    const exportData = {
      metadata: {
        exported_at: new Date().toISOString(),
        datasets: config.datasetNames || ["all"],
        split_ratios: {
          train: config.trainRatio || 0.8,
          validation: config.valRatio || 0.1,
          test: 1 - (config.trainRatio || 0.8) - (config.valRatio || 0.1),
        },
        statistics: data.stats,
      },
      data: includeMetadata
        ? data
        : {
            train: data.train.map(stripMetadata),
            validation: data.validation.map(stripMetadata),
            test: data.test.map(stripMetadata),
          },
    };

    return {
      filename: `fakenews-training-${datasetNames}-${timestamp}.json`,
      content: JSON.stringify(exportData, null, 2),
      mimeType: "application/json",
    };
  } else {
    // CSV format - combine all splits with a split column
    const allItems = [
      ...data.train.map((item) => ({ ...item, split: "train" })),
      ...data.validation.map((item) => ({ ...item, split: "validation" })),
      ...data.test.map((item) => ({ ...item, split: "test" })),
    ];

    const headers = ["id", "text", "source", "label", "dataset_name", "split"];
    if (includeMetadata) {
      headers.push("metadata");
    }

    const rows = allItems.map((item) => {
      const row = [
        item.id,
        `"${item.text.replace(/"/g, '""')}"`,
        item.source,
        item.label,
        item.dataset_name,
        item.split,
      ];
      if (includeMetadata) {
        row.push(`"${JSON.stringify(item.metadata).replace(/"/g, '""')}"`);
      }
      return row;
    });

    const content = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

    return {
      filename: `fakenews-training-${datasetNames}-${timestamp}.csv`,
      content,
      mimeType: "text/csv",
    };
  }
}

/**
 * Strip metadata for lightweight export
 */
function stripMetadata(item: NormalizedDatasetItem): Omit<NormalizedDatasetItem, "metadata"> {
  const { metadata: _, ...rest } = item;
  return rest;
}

/**
 * Download training data
 */
export async function downloadTrainingData(config: TrainingExportConfig = {}): Promise<void> {
  const result = await exportTrainingData(config);
  downloadFile(result.content, result.filename, result.mimeType);
}

/**
 * Export dataset statistics
 */
export async function exportDatasetStatistics(
  datasetNames?: string[]
): Promise<ExportResult> {
  const { getDatasetStatistics } = await import("./datasetStorage");
  const stats = await getDatasetStatistics();

  const filtered = datasetNames
    ? stats.filter((s) => datasetNames.includes(s.dataset_name))
    : stats;

  const exportData = {
    exported_at: new Date().toISOString(),
    statistics: filtered,
  };

  return {
    filename: `fakenews-dataset-stats-${new Date().toISOString().split("T")[0]}.json`,
    content: JSON.stringify(exportData, null, 2),
    mimeType: "application/json",
  };
}

/**
 * Create HuggingFace-compatible dataset export
 */
export async function exportHuggingFaceFormat(
  config: TrainingExportConfig = {}
): Promise<ExportResult> {
  const data = await prepareTrainingData(config);

  // HuggingFace datasets format
  const hfFormat = {
    train: data.train.map((item) => ({
      text: item.text,
      label: item.label,
      source: item.source,
      dataset: item.dataset_name,
    })),
    validation: data.validation.map((item) => ({
      text: item.text,
      label: item.label,
      source: item.source,
      dataset: item.dataset_name,
    })),
    test: data.test.map((item) => ({
      text: item.text,
      label: item.label,
      source: item.source,
      dataset: item.dataset_name,
    })),
  };

  const datasetNames = config.datasetNames?.join("-") || "all";

  return {
    filename: `fakenews-hf-${datasetNames}-${new Date().toISOString().split("T")[0]}.json`,
    content: JSON.stringify(hfFormat, null, 2),
    mimeType: "application/json",
  };
}

/**
 * Export in scikit-learn compatible format
 */
export async function exportSklearnFormat(
  config: TrainingExportConfig = {}
): Promise<ExportResult> {
  const data = await prepareTrainingData(config);

  const toSklearnFormat = (items: NormalizedDatasetItem[]) => ({
    X: items.map((item) => item.text),
    y: items.map((item) => item.label),
    sources: items.map((item) => item.source),
    datasets: items.map((item) => item.dataset_name),
  });

  const sklearnFormat = {
    metadata: {
      exported_at: new Date().toISOString(),
      description: "Scikit-learn compatible format with X (text) and y (labels)",
      statistics: data.stats,
    },
    train: toSklearnFormat(data.train),
    validation: toSklearnFormat(data.validation),
    test: toSklearnFormat(data.test),
  };

  const datasetNames = config.datasetNames?.join("-") || "all";

  return {
    filename: `fakenews-sklearn-${datasetNames}-${new Date().toISOString().split("T")[0]}.json`,
    content: JSON.stringify(sklearnFormat, null, 2),
    mimeType: "application/json",
  };
}
