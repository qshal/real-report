#!/usr/bin/env node
/**
 * Upload FakeNewsNet CSV files to Supabase
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || "";

if (!supabaseUrl || !supabaseKey) {
  console.error("Error: SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables are required");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const DATASET_DIR = path.join(__dirname, "..", "datasets", "fakenewsnet");

interface CSVRow {
  id: string;
  news_url: string;
  title: string;
  tweet_ids: string;
}

function parseCSVLine(line: string): string[] {
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

function parseCSV(content: string): CSVRow[] {
  const lines = content.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const idIdx = headers.indexOf("id");
  const urlIdx = headers.indexOf("news_url");
  const titleIdx = headers.indexOf("title");
  const tweetIdx = headers.indexOf("tweet_ids");

  const rows: CSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < 3) continue;

    rows.push({
      id: values[idIdx] || `row_${i}`,
      news_url: values[urlIdx] || "",
      title: values[titleIdx] || "",
      tweet_ids: values[tweetIdx] || "",
    });
  }

  return rows;
}

async function uploadFile(filename: string, label: "real" | "fake", source: string) {
  const filePath = path.join(DATASET_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.log(`  ${filename} not found, skipping...`);
    return 0;
  }

  console.log(`  Processing ${filename}...`);
  const content = fs.readFileSync(filePath, "utf-8");
  const rows = parseCSV(content);

  console.log(`    Parsed ${rows.length} rows`);

  const items = rows.map((row) => ({
    dataset_name: "FakeNewsNet",
    original_id: row.id,
    text: row.title,
    source: source,
    label: label,
    metadata: {
      news_url: row.news_url,
      tweet_ids: row.tweet_ids.split(/\s+/).filter((id) => id.length > 0),
    },
  }));

  // Insert in batches
  const batchSize = 500;
  let inserted = 0;

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const { error } = await supabase.from("dataset_items").insert(batch);

    if (error) {
      console.error(`    Error inserting batch ${i / batchSize + 1}:`, error.message);
    } else {
      inserted += batch.length;
    }
  }

  console.log(`    Inserted ${inserted}/${items.length} items`);
  return inserted;
}

async function main() {
  console.log("Uploading FakeNewsNet dataset...\n");

  // Clear existing data
  console.log("Clearing existing FakeNewsNet data...");
  await supabase.from("dataset_items").delete().eq("dataset_name", "FakeNewsNet");

  let total = 0;

  total += await uploadFile("politifact_fake.csv", "fake", "politifact");
  total += await uploadFile("politifact_real.csv", "real", "politifact");
  total += await uploadFile("gossipcop_fake.csv", "fake", "gossipcop");
  total += await uploadFile("gossipcop_real.csv", "real", "gossipcop");

  console.log(`\nTotal inserted: ${total} items`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
