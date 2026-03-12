#!/usr/bin/env node
/**
 * Dataset Preprocessing Script
 * 
 * Loads downloaded datasets, normalizes them, and stores in Supabase.
 * 
 * Usage:
 *   npx tsx scripts/preprocess-datasets.ts [dataset-name]
 * 
 * Environment Variables:
 *   SUPABASE_URL - Supabase project URL
 *   SUPABASE_SERVICE_KEY - Supabase service role key
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATASETS_DIR = path.join(__dirname, "..", "datasets");

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || "";

if (!supabaseUrl || !supabaseKey) {
  console.error("Error: SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables are required");
  console.error("\nExample usage:");
  console.error("  SUPABASE_URL=https://your-project.supabase.co SUPABASE_SERVICE_KEY=your-key npx tsx scripts/preprocess-datasets.ts all");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface ProcessingResult {
  dataset: string;
  total: number;
  inserted: number;
  errors: number;
}

async function processLIAR(): Promise<ProcessingResult> {
  console.log("\nProcessing LIAR dataset...");
  const result: ProcessingResult = { dataset: "LIAR", total: 0, inserted: 0, errors: 0 };

  const liarDir = path.join(DATASETS_DIR, "liar");
  if (!fs.existsSync(liarDir)) {
    console.log("  LIAR directory not found, skipping...");
    return result;
  }

  const files = ["train.tsv", "test.tsv", "valid.tsv"];
  const items: unknown[] = [];

  for (const file of files) {
    const filePath = path.join(liarDir, file);
    if (!fs.existsSync(filePath)) {
      console.log(`  ${file} not found, skipping...`);
      continue;
    }

    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.trim().split("\n");

    for (const line of lines) {
      const columns = line.split("\t");
      if (columns.length < 14) continue;

      const labelMap: Record<string, string> = {
        "true": "real",
        "mostly-true": "real",
        "half-true": "misleading",
        "barely-true": "misleading",
        "false": "fake",
        "pants-fire": "fake",
      };

      items.push({
        dataset_name: "LIAR",
        original_id: columns[0],
        text: columns[2],
        source: columns[4] || "unknown",
        label: labelMap[columns[1]] || "real",
        metadata: {
          original_label: columns[1],
          subject: columns[3],
          speaker_job: columns[5],
          state_info: columns[6],
          party_affiliation: columns[7],
          context: columns[13],
          split: file.replace(".tsv", ""),
        },
      });
    }

    console.log(`  Processed ${file}: ${lines.length} records`);
  }

  result.total = items.length;

  // Insert in batches
  const batchSize = 500;
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const { error } = await supabase.from("dataset_items").insert(batch);
    
    if (error) {
      console.error(`  Error inserting batch ${i / batchSize + 1}:`, error.message);
      result.errors += batch.length;
    } else {
      result.inserted += batch.length;
    }
  }

  console.log(`  Inserted ${result.inserted}/${result.total} items`);
  return result;
}

async function processISOT(): Promise<ProcessingResult> {
  console.log("\nProcessing ISOT dataset...");
  const result: ProcessingResult = { dataset: "ISOT", total: 0, inserted: 0, errors: 0 };

  const isotDir = path.join(DATASETS_DIR, "isot");
  if (!fs.existsSync(isotDir)) {
    console.log("  ISOT directory not found, skipping...");
    return result;
  }

  const files = [
    { name: "True.csv", label: "real" },
    { name: "Fake.csv", label: "fake" },
  ];

  const items: unknown[] = [];

  for (const { name, label } of files) {
    const filePath = path.join(isotDir, name);
    if (!fs.existsSync(filePath)) {
      console.log(`  ${name} not found, skipping...`);
      continue;
    }

    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.trim().split("\n");

    // Skip header
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length < 4) continue;

      items.push({
        dataset_name: "ISOT",
        original_id: `isot_${label}_${i}`,
        text: `${values[0]}. ${values[1]}`,
        source: values[2] || "unknown",
        label,
        metadata: {
          title: values[0],
          subject: values[2],
          date: values[3],
          original_label: label,
        },
      });
    }

    console.log(`  Processed ${name}: ${lines.length - 1} records`);
  }

  result.total = items.length;

  // Insert in batches
  const batchSize = 500;
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const { error } = await supabase.from("dataset_items").insert(batch);
    
    if (error) {
      console.error(`  Error inserting batch ${i / batchSize + 1}:`, error.message);
      result.errors += batch.length;
    } else {
      result.inserted += batch.length;
    }
  }

  console.log(`  Inserted ${result.inserted}/${result.total} items`);
  return result;
}

async function processFakeNewsNet(): Promise<ProcessingResult> {
  console.log("\nProcessing FakeNewsNet dataset...");
  const result: ProcessingResult = { dataset: "FakeNewsNet", total: 0, inserted: 0, errors: 0 };

  const fnnDir = path.join(DATASETS_DIR, "fakenewsnet");
  if (!fs.existsSync(fnnDir)) {
    console.log("  FakeNewsNet directory not found, skipping...");
    return result;
  }

  const subdirs = [
    { dir: "politifact_fake", label: "fake", source: "politifact" },
    { dir: "politifact_real", label: "real", source: "politifact" },
    { dir: "gossipcop_fake", label: "fake", source: "gossipcop" },
    { dir: "gossipcop_real", label: "real", source: "gossipcop" },
  ];

  const items: unknown[] = [];

  for (const { dir, label, source } of subdirs) {
    const dirPath = path.join(fnnDir, dir);
    if (!fs.existsSync(dirPath)) {
      console.log(`  ${dir} not found, skipping...`);
      continue;
    }

    const files = fs.readdirSync(dirPath).filter((f) => f.endsWith(".json"));

    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(dirPath, file), "utf-8");
        const data = JSON.parse(content);

        items.push({
          dataset_name: "FakeNewsNet",
          original_id: data.id || file.replace(".json", ""),
          text: data.text || data.content || "",
          source,
          label,
          metadata: {
            title: data.title || "",
            url: data.url || "",
            publish_date: data.publish_date || data.date || null,
            tweet_ids: data.tweet_ids || [],
            original_label: label,
          },
        });
      } catch {
        result.errors++;
      }
    }

    console.log(`  Processed ${dir}: ${files.length} records`);
  }

  result.total = items.length;

  // Insert in batches
  const batchSize = 500;
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const { error } = await supabase.from("dataset_items").insert(batch);
    
    if (error) {
      console.error(`  Error inserting batch ${i / batchSize + 1}:`, error.message);
      result.errors += batch.length;
    } else {
      result.inserted += batch.length;
    }
  }

  console.log(`  Inserted ${result.inserted}/${result.total} items`);
  return result;
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

async function clearDataset(datasetName: string) {
  console.log(`Clearing existing ${datasetName} data...`);
  const { error } = await supabase
    .from("dataset_items")
    .delete()
    .eq("dataset_name", datasetName);
  
  if (error) {
    console.error(`Error clearing ${datasetName}:`, error.message);
  } else {
    console.log(`Cleared existing ${datasetName} data`);
  }
}

async function main() {
  const target = process.argv[2] || "all";

  console.log("=".repeat(60));
  console.log("Dataset Preprocessing");
  console.log("=".repeat(60));
  console.log(`\nSupabase URL: ${supabaseUrl}`);
  console.log(`Target: ${target}\n`);

  const results: ProcessingResult[] = [];

  if (target === "all" || target === "liar") {
    await clearDataset("LIAR");
    results.push(await processLIAR());
  }

  if (target === "all" || target === "isot") {
    await clearDataset("ISOT");
    results.push(await processISOT());
  }

  if (target === "all" || target === "fakenewsnet") {
    await clearDataset("FakeNewsNet");
    results.push(await processFakeNewsNet());
  }

  console.log("\n" + "=".repeat(60));
  console.log("Processing Summary");
  console.log("=".repeat(60));
  
  for (const r of results) {
    console.log(`${r.dataset.padEnd(15)} Total: ${r.total.toString().padStart(6)} | Inserted: ${r.inserted.toString().padStart(6)} | Errors: ${r.errors}`);
  }

  console.log("\nDone!\n");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
