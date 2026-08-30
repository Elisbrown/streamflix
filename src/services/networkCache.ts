import axios, { AxiosRequestConfig, AxiosError, AxiosResponse } from 'axios';

const CACHE_PREFIX = 'streamflix_cache_v1:';
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;
const STALE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_TIMEOUT_MS = 12000;
const MAX_RETRIES = 2;
const MAX_PERSISTED_ENTRIES = 80;

interface CacheEnvelope<T> {
  timestamp: number;
  data: T;
}

const memoryCache = new Map<string, CacheEnvelope<unknown>>();
const inFlight = new Map<string, Promise<unknown>>();

function readStorage<T>(key: string): CacheEnvelope<T> | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (!parsed || typeof parsed.timestamp !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStorage<T>(key: string, value: CacheEnvelope<T>) {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(value));

    // Bound persistent cache growth. TV storage is more constrained than a
    // desktop browser, and a huge localStorage payload can itself become slow.
    const entries: Array<{ key: string; timestamp: number }> = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const storageKey = localStorage.key(i);
      if (!storageKey?.startsWith(CACHE_PREFIX)) continue;
      const raw = localStorage.getItem(storageKey);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw) as CacheEnvelope<unknown>;
        if (typeof parsed.timestamp === 'number') {
          entries.push({ key: storageKey, timestamp: parsed.timestamp });
        }
      } catch {
        // Remove corrupt cache entries instead of retaining unusable data.
        localStorage.removeItem(storageKey);
      }
    }

    if (entries.length > MAX_PERSISTED_ENTRIES) {
      entries.sort((a, b) => a.timestamp - b.timestamp);
      for (const entry of entries.slice(0, entries.length - MAX_PERSISTED_ENTRIES)) {
        localStorage.removeItem(entry.key);
      }
    }
  } catch {
    // Storage can be unavailable/full. Memory cache still protects this session.
  }
}

export function clearCachedKey(key: string) {
  memoryCache.delete(key);
  try {
    localStorage.removeItem(CACHE_PREFIX + key);
  } catch {
    // ignore storage failures
  }
}

export function clearStreamflixCache() {
  memoryCache.clear();
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key?.startsWith(CACHE_PREFIX)) keys.push(key);
    }
    keys.forEach((key) => localStorage.removeItem(key));
  } catch {
    // ignore storage failures
  }
}

function getCached<T>(key: string): CacheEnvelope<T> | null {
  const memory = memoryCache.get(key) as CacheEnvelope<T> | undefined;
  if (memory) return memory;

  const stored = readStorage<T>(key);
  if (stored) memoryCache.set(key, stored as CacheEnvelope<unknown>);
  return stored;
}

function saveCached<T>(key: string, data: T) {
  const envelope: CacheEnvelope<T> = { timestamp: Date.now(), data };
  memoryCache.set(key, envelope as CacheEnvelope<unknown>);
  writeStorage(key, envelope);
}

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

function getNetworkProfile() {
  const connection = (navigator as Navigator & {
    connection?: {
      effectiveType?: string;
      saveData?: boolean;
      downlink?: number;
    };
  }).connection;

  if (!connection) return { saveData: false, effectiveType: 'unknown' };

  const effectiveType = connection.effectiveType || 'unknown';
  const saveData = Boolean(connection.saveData) || ['slow-2g', '2g'].includes(effectiveType);
  return { saveData, effectiveType };
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function requestWithRetry<T>(
  request: () => Promise<AxiosResponse<T>>,
  maxRetries = MAX_RETRIES,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    if (isOffline()) {
      throw new Error('offline');
    }

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeout = controller
      ? window.setTimeout(() => controller.abort(), timeoutMs)
      : undefined;

    try {
      // The request factory is expected to use axios. For compatibility with
      // existing callers we rely on axios' own defaults and treat timeout/abort
      // as retryable transport failures.
      const response = await request();
      if (timeout) window.clearTimeout(timeout);
      return response.data;
    } catch (error) {
      if (timeout) window.clearTimeout(timeout);
      lastError = error;

      const axiosError = error as AxiosError<unknown>;
      const status = axiosError.response?.status;
      const retryable =
        !status ||
        status === 408 ||
        status === 425 ||
        status === 429 ||
        status >= 500;

      if (!retryable || attempt >= maxRetries) break;
      await wait(350 * 2 ** attempt);
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Network request failed');
}

export async function cachedGet<T>(
  key: string,
  url: string,
  config: AxiosRequestConfig = {},
  options: {
    ttlMs?: number;
    staleTtlMs?: number;
    timeoutMs?: number;
    retries?: number;
    backgroundRevalidate?: boolean;
  } = {},
): Promise<T> {
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
  const staleTtlMs = options.staleTtlMs ?? STALE_TTL_MS;
  const cached = getCached<T>(key);
  const age = cached ? Date.now() - cached.timestamp : Number.POSITIVE_INFINITY;

  if (cached && age <= ttlMs) {
    return cached.data;
  }

  if (cached && age <= staleTtlMs) {
    if (options.backgroundRevalidate !== false && !isOffline()) {
      void revalidateGet(key, url, config, options).catch(() => undefined);
    }
    return cached.data;
  }

  if (isOffline()) {
    if (cached) return cached.data;
    throw new Error('offline');
  }

  const existing = inFlight.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const network = getNetworkProfile();
  const timeoutMs = options.timeoutMs ?? (network.saveData ? 8000 : DEFAULT_TIMEOUT_MS);

  const promise = requestWithRetry<T>(
    () => axios.get<T>(url, {
      ...config,
      timeout: timeoutMs,
    }),
    options.retries ?? MAX_RETRIES,
    timeoutMs,
  )
    .then((data) => {
      saveCached(key, data);
      return data;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, promise as Promise<unknown>);
  return promise;
}

async function revalidateGet<T>(
  key: string,
  url: string,
  config: AxiosRequestConfig,
  options: {
    timeoutMs?: number;
    retries?: number;
  },
) {
  if (inFlight.has(key)) return inFlight.get(key);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const promise = requestWithRetry<T>(
    () => axios.get<T>(url, { ...config, timeout: timeoutMs }),
    options.retries ?? 1,
    timeoutMs,
  )
    .then((data) => {
      saveCached(key, data);
      return data;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, promise as Promise<unknown>);
  return promise;
}

export async function prefetchGet<T>(
  key: string,
  url: string,
  config: AxiosRequestConfig = {},
  options: {
    ttlMs?: number;
    staleTtlMs?: number;
    timeoutMs?: number;
    retries?: number;
  } = {},
): Promise<void> {
  const cached = getCached<T>(key);
  if (cached && Date.now() - cached.timestamp <= (options.staleTtlMs ?? STALE_TTL_MS)) return;
  if (isOffline()) return;
  try {
    await cachedGet(key, url, config, {
      ...options,
      backgroundRevalidate: false,
    });
  } catch {
    // Prefetch is always best-effort.
  }
}

export function getConnectionProfile() {
  return getNetworkProfile();
}
