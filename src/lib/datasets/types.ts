export type DatasetLabel = "real" | "fake" | "misleading";

export interface NormalizedDatasetItem {
  id: string;
  text: string;
  source: string;
  label: DatasetLabel;
  metadata: Record<string, unknown>;
  dataset_name: string;
  original_id?: string;
}

export interface DatasetStatistics {
  total: number;
  byLabel: Record<DatasetLabel, number>;
  bySource: Record<string, number>;
  avgTextLength: number;
}

export interface DatasetLoader {
  name: string;
  description: string;
  load(): Promise<NormalizedDatasetItem[]>;
  getStatistics(): Promise<DatasetStatistics>;
}

export interface LIARItem {
  id: string;
  label: string;
  statement: string;
  subject: string;
  speaker: string;
  speaker_job: string;
  state_info: string;
  party_affiliation: string;
  barely_true_counts: number;
  false_counts: number;
  half_true_counts: number;
  mostly_true_counts: number;
  pants_on_fire_counts: number;
  context: string;
}

export interface FakeNewsNetItem {
  id: string;
  title: string;
  text: string;
  source: string;
  label: "real" | "fake";
  metadata: {
    authors?: string[];
    publish_date?: string;
    keywords?: string[];
    summary?: string;
    url?: string;
    tweet_ids?: string[];
  };
}

export interface ISOTItem {
  id: string;
  title: string;
  text: string;
  subject: string;
  date: string;
  label: "real" | "fake";
}

export const LIAR_LABEL_MAP: Record<string, DatasetLabel> = {
  "true": "real",
  "mostly-true": "real",
  "half-true": "misleading",
  "barely-true": "misleading",
  "false": "fake",
  "pants-fire": "fake",
};
