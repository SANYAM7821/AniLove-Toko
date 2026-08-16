/**
 * Provider Runner
 * Manages concurrent execution of providers with retry logic and timeout handling
 */

import { withProviderTimeout } from '../utils/common/timeout.js';
import type {
  ProviderDiagnostic,
  ProviderChunk,
  ProviderRunOptions,
} from '../types/index.js';

export const DEFAULT_PROVIDER_RUN_OPTIONS: Required<ProviderRunOptions> = {
  maxConcurrency: 10,
  maxRetries: 2,
  retryDelayMs: 250,
  timeoutMs: 15_000,
};

/**
 * Resolves and validates provider run options with safety boundaries
 * Clamps caller settings to prevent unbounded retry/request loops
 */
export function resolveProviderRunOptions(
  opts?: Partial<ProviderRunOptions>
): Required<ProviderRunOptions> {
  const raw = opts ?? {};
  
  const clampNumber = (
    value: unknown,
    fallback: number,
    min: number,
    max: number
  ): number => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(min, Math.min(max, Math.floor(parsed)));
  };

  return {
    maxConcurrency: clampNumber(
      raw.maxConcurrency,
      DEFAULT_PROVIDER_RUN_OPTIONS.maxConcurrency,
      1,
      24
    ),
    maxRetries: clampNumber(
      raw.maxRetries,
      DEFAULT_PROVIDER_RUN_OPTIONS.maxRetries,
      0,
      4
    ),
    retryDelayMs: clampNumber(
      raw.retryDelayMs,
      DEFAULT_PROVIDER_RUN_OPTIONS.retryDelayMs,
      0,
      10_000
    ),
    timeoutMs: clampNumber(
      raw.timeoutMs,
      DEFAULT_PROVIDER_RUN_OPTIONS.timeoutMs,
      1_000,
      30_000
    ),
  };
}

const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

interface ProviderAttempt<T> {
  results: T[];
  diagnostic: ProviderDiagnostic;
}

/**
 * Executes a provider with retry logic
 * Stops on first successful (non-empty) response or after max retries
 */
async function runProviderWithRetry<T, P extends { name: string }>(
  provider: P,
  fn: (p: P) => Promise<T[]>,
  options: Required<ProviderRunOptions>
): Promise<ProviderAttempt<T>> {
  const startedAt = Date.now();
  let lastError: unknown;

  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      const results = await withProviderTimeout(
        Promise.resolve().then(() => fn(provider)),
        options.timeoutMs
      );
      
      if (results.length > 0) {
        return {
          results,
          diagnostic: {
            provider: provider.name,
            status: 'ok',
            durationMs: Date.now() - startedAt,
            resultCount: results.length,
            attempts: attempt + 1,
          },
        };
      }
    } catch (error) {
      lastError = error;
    }

    // Add delay before retry (except after last attempt)
    if (attempt < options.maxRetries && options.retryDelayMs > 0) {
      await delay(options.retryDelayMs * (attempt + 1));
    }
  }

  // All attempts failed or returned empty
  const message = lastError instanceof Error
    ? lastError.message
    : lastError
    ? String(lastError)
    : undefined;

  return {
    results: [],
    diagnostic: {
      provider: provider.name,
      status: message
        ? (/timed out/i.test(message) ? 'timeout' : 'error')
        : 'empty',
      durationMs: Date.now() - startedAt,
      resultCount: 0,
      attempts: options.maxRetries + 1,
      ...(message ? { error: message } : {}),
    },
  };
}

/**
 * Runs all providers concurrently with timeout and retry handling
 * Failed or timed-out providers are silently dropped
 */
export async function runProviders<T, P extends { name: string }>(
  providers: P[],
  fn: (p: P) => Promise<T[]>,
  diagnostics?: ProviderDiagnostic[],
  options: Required<ProviderRunOptions> = DEFAULT_PROVIDER_RUN_OPTIONS
): Promise<T[]> {
  const results: T[][] = Array.from({ length: providers.length }, () => []);
  let cursor = 0;

  const worker = async () => {
    while (true) {
      const index = cursor++;
      if (index >= providers.length) return;
      
      const attempt = await runProviderWithRetry(providers[index], fn, options);
      results[index] = attempt.results;
      diagnostics?.push(attempt.diagnostic);
    }
  };

  await Promise.all(
    Array.from(
      { length: Math.min(options.maxConcurrency, providers.length) },
      worker
    )
  );
  
  return results.flat();
}

/**
 * Runs providers concurrently and streams results as they complete
 * Enables progressive/streaming results for fast providers
 */
export async function runProvidersProgressive<T, P extends { name: string }>(
  providers: P[],
  fn: (p: P) => Promise<T[]>,
  onChunk: (chunk: ProviderChunk<T>) => void,
  options: Required<ProviderRunOptions> = DEFAULT_PROVIDER_RUN_OPTIONS
): Promise<T[]> {
  const allResults: T[] = [];
  let cursor = 0;

  const worker = async () => {
    while (true) {
      const index = cursor++;
      if (index >= providers.length) return;
      
      const provider = providers[index];
      const attempt = await runProviderWithRetry(provider, fn, options);
      
      onChunk({
        provider: provider.name,
        results: attempt.results,
        diagnostic: attempt.diagnostic,
      });
      
      allResults.push(...attempt.results);
    }
  };

  await Promise.all(
    Array.from(
      { length: Math.min(options.maxConcurrency, providers.length) },
      worker
    )
  );
  
  return allResults;
}
