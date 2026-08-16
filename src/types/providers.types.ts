/**
 * Provider interface definitions
 * Defines the contracts that all providers must implement
 */

import type {
  SourceOptions,
  SourceResult,
  LanguageCapability,
} from './source.types.js';

import type {
  MangaChapterParams,
  MangaChapterEntry,
  MangaPageEntry,
} from './manga.types.js';

export interface StreamProvider {
  name: string;
  single(opts: SourceOptions): Promise<SourceResult[]>;
  movie?(opts: SourceOptions): Promise<SourceResult[]>;
  getLanguages?(opts: SourceOptions): Promise<LanguageCapability[]>;
}

export interface TorrentProvider {
  name: string;
  batch(opts: SourceOptions): Promise<SourceResult[]>;
}

export interface MangaProvider {
  name: string;
  getChapters(params: MangaChapterParams): Promise<MangaChapterEntry[]>;
  getPages(chapterKey: string): Promise<MangaPageEntry[]>;
}

/** Diagnostic information for provider execution */
export interface ProviderDiagnostic {
  provider: string;
  status: 'ok' | 'empty' | 'error' | 'timeout';
  durationMs: number;
  resultCount: number;
  /** Number of provider attempts, including the initial request. */
  attempts?: number;
  error?: string;
}

/** Chunk emitted by progressive runners */
export interface ProviderChunk<T> {
  provider: string;
  results: T[];
  diagnostic: ProviderDiagnostic;
}

/** Result structure for debug mode */
export interface DebugProviderResult<T> {
  results: T[];
  diagnostics: ProviderDiagnostic[];
}
