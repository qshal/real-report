#!/usr/bin/env node
/**
 * Dataset Download Script
 * 
 * Downloads and prepares benchmark datasets for fake news detection.
 * 
 * Usage:
 *   npx tsx scripts/download-datasets.ts [dataset-name]
 * 
 * Examples:
 *   npx tsx scripts/download-datasets.ts all
 *   npx tsx scripts/download-datasets.ts liar
 *   npx tsx scripts/download-datasets.ts isot
 *   npx tsx scripts/download-datasets.ts fakenewsnet
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATASETS_DIR = path.join(__dirname, "..", "datasets");

interface DatasetConfig {
  name: string;
  description: string;
  urls: Record<string, string>;
  instructions: string;
}

const DATASETS: Record<string, DatasetConfig> = {
  liar: {
    name: "LIAR",
    description: "Political fact-checking dataset with 12.8K short statements",
    urls: {
      train: "https://www.cs.ucsb.edu/~william/data/liar_dataset.zip",
      test: "https://www.cs.ucsb.edu/~william/data/liar_dataset.zip",
    },
    instructions: `
LIAR Dataset Download Instructions:
====================================

1. Visit: https://www.cs.ucsb.edu/~william/data/liar_dataset.zip
2. Download and extract the ZIP file
3. Place the following files in datasets/liar/:
   - train.tsv
   - test.tsv
   - valid.tsv

Dataset Structure (TSV format):
- Column 1: ID
- Column 2: Label (true, mostly-true, half-true, barely-true, false, pants-fire)
- Column 3: Statement
- Column 4: Subject(s)
- Column 5: Speaker
- Column 6: Speaker's job
- Column 7: State
- Column 8: Party
- Columns 9-13: Counts for each label in speaker's history
- Column 14: Context

Citation:
Wang, W. Y. (2017). "Liar, Liar Pants on Fire": A New Benchmark Dataset for Fake News Detection.
ACL 2017.
`,
  },
  isot: {
    name: "ISOT Fake News Dataset",
    description: "Large-scale dataset with ~45K real and fake news articles",
    urls: {
      dataset: "https://www.uvic.ca/engineering/ece/isot/datasets/fake-news/index.php",
    },
    instructions: `
ISOT Fake News Dataset Download Instructions:
=============================================

1. Visit: https://www.uvic.ca/engineering/ece/isot/datasets/fake-news/index.php
2. Fill out the request form to download
3. Extract and place files in datasets/isot/:
   - True.csv (real news)
   - Fake.csv (fake news)

Dataset Structure (CSV format):
- title: Article title
- text: Full article content
- subject: News category
- date: Publication date

Citation:
Ahmed, H., Traore, I., & Saad, S. (2017). Detection of Online Fake News Using 
N-Gram Analysis and Machine Learning Techniques.
`,
  },
  fakenewsnet: {
    name: "FakeNewsNet",
    description: "News articles with social context from PolitiFact and GossipCop",
    urls: {
      github: "https://github.com/KaiDMML/FakeNewsNet",
    },
    instructions: `
FakeNewsNet Dataset Download Instructions:
==========================================

1. Visit: https://github.com/KaiDMML/FakeNewsNet
2. Follow the setup instructions in the repository
3. Use their download script to get the data
4. Place JSON files in datasets/fakenewsnet/:
   - politifact_fake/*.json
   - politifact_real/*.json
   - gossipcop_fake/*.json
   - gossipcop_real/*.json

Dataset Structure (JSON format):
- id: News ID
- title: Article title
- text: Article content
- url: Source URL
- tweet_ids: Related tweets
- publish_date: Publication date

Citation:
Shu, K., Mahudeswaran, D., Wang, S., Lee, D., & Liu, H. (2020). 
FakeNewsNet: A Data Repository with News Content, Social Context, 
and Spatiotemporal Information for Studying Fake News on Social Media.
Big Data, 8(3), 171-188.
`,
  },
};

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
}

function createReadme(datasetName: string) {
  const config = DATASETS[datasetName];
  if (!config) return;

  const readmePath = path.join(DATASETS_DIR, datasetName, "README.txt");
  fs.writeFileSync(readmePath, config.instructions);
  console.log(`Created README: ${readmePath}`);
}

function downloadDataset(datasetName: string) {
  const config = DATASETS[datasetName];
  if (!config) {
    console.error(`Unknown dataset: ${datasetName}`);
    console.log(`Available datasets: ${Object.keys(DATASETS).join(", ")}, all`);
    process.exit(1);
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`Dataset: ${config.name}`);
  console.log(`Description: ${config.description}`);
  console.log(`${"=".repeat(60)}\n`);

  const datasetDir = path.join(DATASETS_DIR, datasetName);
  ensureDir(datasetDir);

  console.log("URLs:");
  Object.entries(config.urls).forEach(([key, url]) => {
    console.log(`  ${key}: ${url}`);
  });

  console.log("\n" + config.instructions);

  createReadme(datasetName);

  console.log(`\nDirectory prepared: ${datasetDir}`);
  console.log("Please manually download the dataset files following the instructions above.\n");
}

function downloadAll() {
  console.log("\n" + "=".repeat(60));
  console.log("Downloading/Preparing All Datasets");
  console.log("=".repeat(60) + "\n");

  Object.keys(DATASETS).forEach((name) => downloadDataset(name));

  console.log("\n" + "=".repeat(60));
  console.log("Summary");
  console.log("=".repeat(60));
  console.log(`\nAll dataset directories created under: ${DATASETS_DIR}`);
  console.log("\nNext steps:");
  console.log("1. Visit each dataset URL and download the files");
  console.log("2. Extract and place files in the respective directories");
  console.log("3. Run the preprocessing script to load into Supabase");
  console.log("\n");
}

function main() {
  const target = process.argv[2] || "all";

  ensureDir(DATASETS_DIR);

  if (target === "all") {
    downloadAll();
  } else if (DATASETS[target]) {
    downloadDataset(target);
  } else {
    console.error(`Unknown dataset: ${target}`);
    console.log(`\nUsage: npx tsx scripts/download-datasets.ts [dataset-name]`);
    console.log(`\nAvailable datasets:`);
    Object.entries(DATASETS).forEach(([key, config]) => {
      console.log(`  ${key.padEnd(15)} - ${config.description}`);
    });
    console.log(`  ${"all".padEnd(15)} - Download/prepare all datasets`);
    process.exit(1);
  }
}

main();
