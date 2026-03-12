export { LIARLoader } from "./liarLoader";
export { FakeNewsNetLoader } from "./fakenewsnetLoader";
export { ISOTLoader } from "./isotLoader";
export {
  calculateStatistics,
  cleanText,
  exportToCSV,
  exportToJSON,
  downloadFile,
  generateUUID,
  normalizeLabel,
  splitDataset,
  truncateText,
} from "./utils";
export type {
  DatasetLabel,
  DatasetLoader,
  DatasetStatistics,
  FakeNewsNetItem,
  ISOTItem,
  LIARItem,
  NormalizedDatasetItem,
} from "./types";
export { LIAR_LABEL_MAP } from "./types";

// Export storage utilities
export {
  fetchDatasetItems,
  getDatasetSample,
  insertDatasetItem,
  insertDatasetItemsBatch,
  getDatasetStatistics,
  getDatasetSummary,
  getDatasetNames,
  getDatasetSources,
  createExperiment,
  fetchExperiments,
  updateExperiment,
  deleteExperiment,
  clearDataset,
  getDatasetCount,
  type DatasetQueryOptions,
  type DatasetInsertItem,
  type ExperimentConfig,
  type Experiment,
} from "./datasetStorage";

// Export training utilities
export {
  prepareTrainingData,
  exportTrainingData,
  downloadTrainingData,
  exportDatasetStatistics,
  exportHuggingFaceFormat,
  exportSklearnFormat,
  type TrainingExportConfig,
  type TrainingSplit,
  type ExportResult,
} from "./exportTraining";

import { LIARLoader } from "./liarLoader";
import { FakeNewsNetLoader } from "./fakenewsnetLoader";
import { ISOTLoader } from "./isotLoader";

export const datasetLoaders = {
  liar: LIARLoader,
  fakenewsnet: FakeNewsNetLoader,
  isot: ISOTLoader,
};

export type DatasetName = keyof typeof datasetLoaders;
