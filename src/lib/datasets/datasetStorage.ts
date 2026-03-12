import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { DatasetLabel, NormalizedDatasetItem } from "./types";

const db = supabase as any;

export interface DatasetQueryOptions {
  datasetName?: string;
  label?: DatasetLabel;
  source?: string;
  limit?: number;
  offset?: number;
  searchQuery?: string;
}

export interface DatasetInsertItem {
  dataset_name: string;
  original_id?: string;
  text: string;
  source: string;
  label: DatasetLabel;
  metadata?: Record<string, unknown>;
}

export interface ExperimentConfig {
  name: string;
  description?: string;
  datasetNames: string[];
  trainSplitPercent?: number;
  valSplitPercent?: number;
}

export interface Experiment {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  dataset_names: string[];
  train_split_percent: number;
  val_split_percent: number;
  test_split_percent: number;
  status: "pending" | "running" | "completed" | "failed";
  results: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DatasetStatsRow {
  dataset_name: string;
  label: string;
  count: number;
  avg_text_length: number;
}

export interface DatasetSummaryRow {
  dataset_name: string;
  total_items: number;
  real_count: number;
  fake_count: number;
  misleading_count: number;
  unique_sources: number;
}

const toItem = (item: any): NormalizedDatasetItem => ({
  id: item.id,
  text: item.text,
  source: item.source,
  label: item.label as DatasetLabel,
  metadata: (item.metadata ?? {}) as Record<string, unknown>,
  dataset_name: item.dataset_name,
  original_id: item.original_id ?? undefined,
});

/**
 * Fetch dataset items with optional filtering
 */
export async function fetchDatasetItems(options: DatasetQueryOptions = {}): Promise<NormalizedDatasetItem[]> {
  if (options.searchQuery) {
    const { data, error } = await db.rpc("search_dataset_items", {
      p_query: options.searchQuery,
      p_dataset_name: options.datasetName || null,
      p_limit: options.limit || 50,
    });

    if (error) throw error;
    return ((data as any[]) || []).map(toItem);
  }

  let query = db.from("dataset_items").select("*");

  if (options.datasetName) query = query.eq("dataset_name", options.datasetName);
  if (options.label) query = query.eq("label", options.label);
  if (options.source) query = query.eq("source", options.source);
  if (options.limit) query = query.limit(options.limit);
  if (options.offset) query = query.range(options.offset, options.offset + (options.limit || 100) - 1);

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;

  return ((data as any[]) || []).map(toItem);
}

/**
 * Get a random sample from a dataset
 */
export async function getDatasetSample(
  datasetName: string,
  limit: number = 100,
  label?: DatasetLabel,
): Promise<NormalizedDatasetItem[]> {
  const { data, error } = await db.rpc("get_dataset_sample", {
    p_dataset_name: datasetName,
    p_limit: limit,
    p_label: label || null,
  });

  if (error) throw error;
  return ((data as any[]) || []).map(toItem);
}

/**
 * Insert a single dataset item
 */
export async function insertDatasetItem(item: DatasetInsertItem): Promise<NormalizedDatasetItem> {
  const { data, error } = await db
    .from("dataset_items")
    .insert({
      dataset_name: item.dataset_name,
      original_id: item.original_id,
      text: item.text,
      source: item.source,
      label: item.label,
      metadata: (item.metadata ?? {}) as Json,
    })
    .select()
    .single();

  if (error) throw error;
  return toItem(data);
}

/**
 * Insert multiple dataset items in batch
 */
export async function insertDatasetItemsBatch(items: DatasetInsertItem[]): Promise<number> {
  const batchSize = 500;
  let inserted = 0;

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize).map((item) => ({
      dataset_name: item.dataset_name,
      original_id: item.original_id,
      text: item.text,
      source: item.source,
      label: item.label,
      metadata: (item.metadata ?? {}) as Json,
    }));

    const { error } = await db.from("dataset_items").insert(batch);
    if (error) throw error;

    inserted += batch.length;
  }

  return inserted;
}

/**
 * Get dataset statistics
 */
export async function getDatasetStatistics(datasetName?: string): Promise<DatasetStatsRow[]> {
  let query = db.from("dataset_statistics").select("*");
  if (datasetName) query = query.eq("dataset_name", datasetName);

  const { data, error } = await query;
  if (error) throw error;

  return ((data as any[]) || []).map((row) => ({
    dataset_name: String(row.dataset_name),
    label: String(row.label),
    count: Number(row.count) || 0,
    avg_text_length: Number(row.avg_text_length) || 0,
  }));
}

/**
 * Get dataset summary
 */
export async function getDatasetSummary(): Promise<DatasetSummaryRow[]> {
  const { data, error } = await db.from("dataset_summary").select("*");
  if (error) throw error;

  return ((data as any[]) || []).map((row) => ({
    dataset_name: String(row.dataset_name),
    total_items: Number(row.total_items) || 0,
    real_count: Number(row.real_count) || 0,
    fake_count: Number(row.fake_count) || 0,
    misleading_count: Number(row.misleading_count) || 0,
    unique_sources: Number(row.unique_sources) || 0,
  }));
}

/**
 * Get unique dataset names
 */
export async function getDatasetNames(): Promise<string[]> {
  const { data, error } = await db.from("dataset_items").select("dataset_name").order("dataset_name");
  if (error) throw error;

  const names = new Set<string>();
  ((data as any[]) || []).forEach((item) => {
    if (item?.dataset_name) names.add(String(item.dataset_name));
  });
  return Array.from(names);
}

/**
 * Get unique sources for a dataset
 */
export async function getDatasetSources(datasetName: string): Promise<string[]> {
  const { data, error } = await db.from("dataset_items").select("source").eq("dataset_name", datasetName).order("source");
  if (error) throw error;

  const sources = new Set<string>();
  ((data as any[]) || []).forEach((item) => {
    if (item?.source) sources.add(String(item.source));
  });
  return Array.from(sources);
}

/**
 * Create a new experiment
 */
export async function createExperiment(config: ExperimentConfig): Promise<Experiment> {
  const { data, error } = await db
    .from("dataset_experiments")
    .insert({
      name: config.name,
      description: config.description || null,
      dataset_names: config.datasetNames,
      train_split_percent: config.trainSplitPercent || 80,
      val_split_percent: config.valSplitPercent || 10,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Experiment;
}

/**
 * Fetch user experiments
 */
export async function fetchExperiments(): Promise<Experiment[]> {
  const { data, error } = await db.from("dataset_experiments").select("*").order("created_at", { ascending: false });
  if (error) throw error;

  return ((data as any[]) || []) as Experiment[];
}

/**
 * Update experiment status and results
 */
export async function updateExperiment(
  experimentId: string,
  updates: Partial<Pick<Experiment, "status" | "results">>,
): Promise<Experiment> {
  const { data, error } = await db
    .from("dataset_experiments")
    .update({
      status: updates.status,
      results: (updates.results || {}) as Json,
    })
    .eq("id", experimentId)
    .select()
    .single();

  if (error) throw error;
  return data as Experiment;
}

/**
 * Delete an experiment
 */
export async function deleteExperiment(experimentId: string): Promise<void> {
  const { error } = await db.from("dataset_experiments").delete().eq("id", experimentId);
  if (error) throw error;
}

/**
 * Delete dataset items by dataset name (admin only)
 */
export async function clearDataset(datasetName: string): Promise<void> {
  const { error } = await db.from("dataset_items").delete().eq("dataset_name", datasetName);
  if (error) throw error;
}

/**
 * Get dataset count
 */
export async function getDatasetCount(datasetName?: string): Promise<number> {
  let query = db.from("dataset_items").select("*", { count: "exact", head: true });
  if (datasetName) query = query.eq("dataset_name", datasetName);

  const { count, error } = await query;
  if (error) throw error;

  return count || 0;
}
