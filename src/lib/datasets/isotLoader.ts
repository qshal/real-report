import type {
  DatasetStatistics,
  ISOTItem,
  NormalizedDatasetItem,
} from "./types";
import {
  calculateStatistics,
  cleanText,
  generateUUID,
  normalizeLabel,
  truncateText,
} from "./utils";

export class ISOTLoader {
  name = "ISOT";
  description =
    "Large-scale dataset of full news articles from Reuters (real) and various unreliable sources (fake)";

  private items: NormalizedDatasetItem[] = [];

  async loadFromCSVFiles(
    realNewsFile: File,
    fakeNewsFile: File
  ): Promise<NormalizedDatasetItem[]> {
    const items: NormalizedDatasetItem[] = [];

    const realContent = await realNewsFile.text();
    const fakeContent = await fakeNewsFile.text();

    const realItems = this.parseCSV(realContent, "real");
    const fakeItems = this.parseCSV(fakeContent, "fake");

    items.push(...realItems, ...fakeItems);

    this.items = items;
    return items;
  }

  async loadFromTexts(realNewsCSV: string, fakeNewsCSV: string): Promise<NormalizedDatasetItem[]> {
    const items: NormalizedDatasetItem[] = [];

    const realItems = this.parseCSV(realNewsCSV, "real");
    const fakeItems = this.parseCSV(fakeNewsCSV, "fake");

    items.push(...realItems, ...fakeItems);

    this.items = items;
    return items;
  }

  private parseCSV(csvContent: string, label: "real" | "fake"): NormalizedDatasetItem[] {
    const items: NormalizedDatasetItem[] = [];
    const lines = csvContent.trim().split("\n");

    if (lines.length < 2) return items;

    const headers = this.parseCSVLine(lines[0]);
    const titleIdx = headers.indexOf("title");
    const textIdx = headers.indexOf("text");
    const subjectIdx = headers.indexOf("subject");
    const dateIdx = headers.indexOf("date");

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length < 2) continue;

      const title = titleIdx >= 0 ? values[titleIdx] : "";
      const text = textIdx >= 0 ? values[textIdx] : values[1] || "";
      const subject = subjectIdx >= 0 ? values[subjectIdx] : "";
      const date = dateIdx >= 0 ? values[dateIdx] : "";

      const fullText = title ? `${title}. ${text}` : text;

      items.push({
        id: generateUUID(),
        text: truncateText(cleanText(fullText)),
        source: subject || "unknown",
        label,
        metadata: {
          title,
          subject,
          date,
          original_label: label,
        },
        dataset_name: "ISOT",
        original_id: `isot_${label}_${i}`,
      });
    }

    return items;
  }

  private parseCSVLine(line: string): string[] {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }

    values.push(current.trim());
    return values;
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

  getItemsBySubject(subject: string): NormalizedDatasetItem[] {
    return this.items.filter(
      (item) => (item.metadata.subject as string)?.toLowerCase() === subject.toLowerCase()
    );
  }

  getSubjects(): string[] {
    const subjects = new Set<string>();
    for (const item of this.items) {
      const subject = item.metadata.subject as string;
      if (subject) subjects.add(subject);
    }
    return Array.from(subjects);
  }
}
