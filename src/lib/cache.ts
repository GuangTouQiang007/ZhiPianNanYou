interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  lastAccessed: number;
}

export class LRUCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxSize: number;
  private defaultTTL: number;
  private hits = 0;
  private misses = 0;

  constructor(options: { maxSize?: number; defaultTTL?: number } = {}) {
    this.maxSize = options.maxSize ?? 500;
    this.defaultTTL = options.defaultTTL ?? 30 * 60 * 1000;
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return undefined;
    }

    entry.lastAccessed = Date.now();
    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    this.hits++;
    return entry.value;
  }

  set(key: string, value: T, ttl?: number): void {
    // Remove existing entry to update position
    this.cache.delete(key);

    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + (ttl ?? this.defaultTTL),
      lastAccessed: Date.now(),
    });
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  get size(): number {
    return this.cache.size;
  }

  stats(): { hits: number; misses: number; size: number; hitRate: string } {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      hitRate: total === 0 ? '0%' : `${((this.hits / total) * 100).toFixed(1)}%`,
    };
  }

  private evictOldest(): void {
    // Map iterates in insertion order; first entry = least recently used
    const firstKey = this.cache.keys().next().value;
    if (firstKey !== undefined) {
      this.cache.delete(firstKey);
    }
  }
}

export function hashKey(...args: string[]): string {
  return args.join('|');
}

// Pre-configured cache instances
export const ttsCache = new LRUCache<{ audioUrl: string; audioSize: number }>({
  maxSize: 300,
  defaultTTL: 30 * 60 * 1000, // 30 min
});

export const imageCache = new LRUCache<{ imageUrl: string }>({
  maxSize: 200,
  defaultTTL: 30 * 60 * 1000, // 30 min
});

export const promptCache = new LRUCache<string>({
  maxSize: 100,
  defaultTTL: 10 * 60 * 1000, // 10 min
});
