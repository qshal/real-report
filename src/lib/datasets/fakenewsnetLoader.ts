import type {
  DatasetStatistics,
  FakeNewsNetItem,
  NormalizedDatasetItem,
} from "./types";
import {
  calculateStatistics,
  cleanText,
  generateUUID,
  normalizeLabel,
  truncateText,
} from "./utils";

export class FakeNewsNetLoader {
  name = "FakeNewsNet";
  description =
    "News articles from PolitiFact and GossipCop with metadata and social engagement data";

  private items: NormalizedDatasetItem[] = [];

  async loadFromJSONFiles(files: File[]): Promise<NormalizedDatasetItem[]> {
    const items: NormalizedDatasetItem[] = [];

    for (const file of files) {
      const content = await file.text();
      try {
        const jsonData = JSON.parse(content);
        const parsed = Array.isArray(jsonData) ? jsonData : [jsonData];
        
        for (const raw of parsed) {
          const normalized = this.normalizeItem(raw, file.name);
          items.push(normalized);
        }
      } catch {
        console.warn(`Failed to parse ${file.name}`);
      }
    }

    this.items = items;
    return items;
  }

  async loadFromJSONLFiles(files: File[]): Promise<NormalizedDatasetItem[]> {
    const items: NormalizedDatasetItem[] = [];

    for (const file of files) {
      const content = await file.text();
      const lines = content.trim().split("\n");

      for (const line of lines) {
        try {
          const raw = JSON.parse(line);
          const normalized = this.normalizeItem(raw, file.name);
          items.push(normalized);
        } catch {
          console.warn(`Failed to parse line in ${file.name}`);
        }
      }
    }

    this.items = items;
    return items;
  }

  async loadFromText(jsonlContent: string, sourceHint?: string): Promise<NormalizedDatasetItem[]> {
    const items: NormalizedDatasetItem[] = [];
    const lines = jsonlContent.trim().split("\n");

    for (const line of lines) {
      try {
        const raw = JSON.parse(line);
        const normalized = this.normalizeItem(raw, sourceHint || "unknown");
        items.push(normalized);
      } catch {
        console.warn("Failed to parse line");
      }
    }

    this.items = items;
    return items;
  }

  private normalizeItem(raw: Record<string, unknown>, sourceFile: string): NormalizedDatasetItem {
    const title = String(raw.title || "");
    const text = String(raw.text || raw.content || raw.body || "");
    const fullText = title ? `${title}. ${text}` : text;
    
    const label = normalizeLabel(String(raw.label || raw.verdict || ""));
    
    const source = String(raw.source || raw.publisher || this.extractSourceFromFilename(sourceFile));
    
    const metadata: Record<string, unknown> = {
      title,
      authors: raw.authors || [],
      publish_date: raw.publish_date || raw.date || null,
      keywords: raw.keywords || [],
      summary: raw.summary || null,
      url: raw.url || null,
      tweet_ids: raw.tweet_ids || [],
      original_label: raw.label || raw.verdict,
    };

    return {
      id: generateUUID(),
      text: truncateText(cleanText(fullText)),
      source,
      label,
      metadata,
      dataset_name: "FakeNewsNet",
      original_id: String(raw.id || raw.uuid || ""),
    };
  }

  private extractSourceFromFilename(filename: string): string {
    if (filename.includes("politifact")) return "politifact";
    if (filename.includes("gossipcop")) return "gossipcop";
    return "unknown";
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

  getItems(): NormalizedDatasetItem[] {
    return this.items;
  }

  getItemsBySource(source: string): NormalizedDatasetItem[] {
    return this.items.filter((item) => item.source.toLowerCase() === source.toLowerCase());
  }
}
