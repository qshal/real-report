import type {
  DatasetLabel,
  DatasetStatistics,
  LIARItem,
  NormalizedDatasetItem,
} from "./types";
import { LIAR_LABEL_MAP } from "./types";
import {
  calculateStatistics,
  cleanText,
  generateUUID,
  normalizeLabel,
  truncateText,
} from "./utils";

const LIAR_URLS = {
  train: "https://www.cs.ucsb.edu/~william/data/liar_dataset.zip",
  test: "https://www.cs.ucsb.edu/~william/data/liar_dataset.zip",
};

export class LIARLoader {
  name = "LIAR";
  description =
    "Political fact-checking dataset with short statements labeled on a 6-point scale";

  private items: NormalizedDatasetItem[] = [];

  async loadFromFiles(files: File[]): Promise<NormalizedDatasetItem[]> {
    const items: NormalizedDatasetItem[] = [];

    for (const file of files) {
      const content = await file.text();
      const lines = content.trim().split("\n");

      for (const line of lines) {
        const parsed = this.parseTSVLine(line);
        if (parsed) {
          const normalized = this.normalizeItem(parsed);
          items.push(normalized);
        }
      }
    }

    this.items = items;
    return items;
  }

  async loadFromText(tsvContent: string): Promise<NormalizedDatasetItem[]> {
    const items: NormalizedDatasetItem[] = [];
    const lines = tsvContent.trim().split("\n");

    for (const line of lines) {
      const parsed = this.parseTSVLine(line);
      if (parsed) {
        const normalized = this.normalizeItem(parsed);
        items.push(normalized);
      }
    }

    this.items = items;
    return items;
  }

  private parseTSVLine(line: string): LIARItem | null {
    const columns = line.split("\t");
    if (columns.length < 14) return null;

    return {
      id: columns[0],
      label: columns[1],
      statement: columns[2],
      subject: columns[3],
      speaker: columns[4],
      speaker_job: columns[5],
      state_info: columns[6],
      party_affiliation: columns[7],
      barely_true_counts: parseInt(columns[8]) || 0,
      false_counts: parseInt(columns[9]) || 0,
      half_true_counts: parseInt(columns[10]) || 0,
      mostly_true_counts: parseInt(columns[11]) || 0,
      pants_on_fire_counts: parseInt(columns[12]) || 0,
      context: columns[13],
    };
  }

  private normalizeItem(item: LIARItem): NormalizedDatasetItem {
    const label = normalizeLabel(item.label, LIAR_LABEL_MAP);
    const text = cleanText(item.statement);

    return {
      id: generateUUID(),
      text: truncateText(text),
      source: item.speaker || "unknown",
      label,
      metadata: {
        original_id: item.id,
        subject: item.subject,
        speaker_job: item.speaker_job,
        state_info: item.state_info,
        party_affiliation: item.party_affiliation,
        barely_true_counts: item.barely_true_counts,
        false_counts: item.false_counts,
        half_true_counts: item.half_true_counts,
        mostly_true_counts: item.mostly_true_counts,
        pants_on_fire_counts: item.pants_on_fire_counts,
        context: item.context,
        original_label: item.label,
      },
      dataset_name: "LIAR",
      original_id: item.id,
    };
  }

  async getStatistics(): Promise<DatasetStatistics> {
    if (this.items.length === 0) {
      return {
        total: 0,
        byLabel: { real: 0, fake: 0, misleading: 0 },
        bySource: {},
        avgTextLength: 0,
      };
    }
    return calculateStatistics(this.items);
  }

  getLabelDistribution(): Record<string, number> {
    const distribution: Record<string, number> = {};
    for (const item of this.items) {
      const originalLabel = (item.metadata.original_label as string) || "unknown";
      distribution[originalLabel] = (distribution[originalLabel] || 0) + 1;
    }
    return distribution;
  }

  getItems(): NormalizedDatasetItem[] {
    return this.items;
  }
}
