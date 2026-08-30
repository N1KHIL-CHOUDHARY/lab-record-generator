import Redis, { RedisOptions } from 'ioredis';

const REDIS_URL = process.env.REDIS_URL;
let redisClient: Redis | null = null;
let isConnected = false;

// In-memory fallback cache in case Redis is not running or unavailable
const inMemoryCache = new Map<string, { val: string; expiresAt: number }>();
const inMemoryScans = new Map<string, number>();

export function getRedisClient(): Redis | null {
  if (redisClient) return redisClient;

  const options: RedisOptions = {
    maxRetriesPerRequest: 1,
    retryStrategy(times) {
      if (times > 3) {
        return null; // Stop retrying if Redis is not reachable
      }
      return Math.min(times * 100, 2000);
    },
    enableOfflineQueue: false,
    lazyConnect: true,
  };

  try {
    if (REDIS_URL) {
      redisClient = new Redis(REDIS_URL, options);
    } else {
      redisClient = new Redis({
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || undefined,
        ...options,
      });
    }

    redisClient.on('connect', () => {
      isConnected = true;
      console.log('✓ Connected to Redis');
    });

    redisClient.on('error', (err) => {
      isConnected = false;
      // Log connection error without crashing the server process
      if ((err as any)?.code !== 'ECONNREFUSED') {
        console.warn('Redis connection issue:', (err as any)?.message || err);
      }
    });

    redisClient.on('close', () => {
      isConnected = false;
    });

    // Attempt non-blocking connection
    redisClient.connect().catch(() => {
      isConnected = false;
    });
  } catch (err) {
    redisClient = null;
    isConnected = false;
  }

  return redisClient;
}

// Initialize on module load
getRedisClient();

/**
 * Cache a redirect destination URL for a short code with TTL (in seconds)
 */
export async function cacheRedirectUrl(shortCode: string, destinationUrl: string, ttlSeconds = 3600): Promise<void> {
  const client = getRedisClient();
  const key = `qr:redirect:${shortCode}`;

  if (client && isConnected) {
    try {
      await client.set(key, destinationUrl, 'EX', ttlSeconds);
      return;
    } catch {
      // Fallback to memory
    }
  }

  inMemoryCache.set(key, {
    val: destinationUrl,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

/**
 * Retrieve cached redirect destination URL
 */
export async function getCachedRedirectUrl(shortCode: string): Promise<string | null> {
  const client = getRedisClient();
  const key = `qr:redirect:${shortCode}`;

  if (client && isConnected) {
    try {
      const cached = await client.get(key);
      if (cached) return cached;
    } catch {
      // Fallback to memory
    }
  }

  const mem = inMemoryCache.get(key);
  if (mem) {
    if (mem.expiresAt > Date.now()) {
      return mem.val;
    }
    inMemoryCache.delete(key);
  }

  return null;
}

/**
 * Invalidate cached redirect URL (e.g. when QR destination is updated)
 */
export async function invalidateRedirectCache(shortCode: string): Promise<void> {
  const client = getRedisClient();
  const key = `qr:redirect:${shortCode}`;

  if (client && isConnected) {
    try {
      await client.del(key);
    } catch {
      // Ignore
    }
  }

  inMemoryCache.delete(key);
}

/**
 * Buffer a scan increment in Redis (or in-memory fallback)
 */
export async function bufferScanIncrement(shortCode: string): Promise<void> {
  const client = getRedisClient();
  const HASH_KEY = 'qr:scans:batch';

  if (client && isConnected) {
    try {
      await client.hincrby(HASH_KEY, shortCode, 1);
      return;
    } catch {
      // Fallback to memory
    }
  }

  const current = inMemoryScans.get(shortCode) || 0;
  inMemoryScans.set(shortCode, current + 1);
}

/**
 * Fetch and reset all buffered scan counts for flushing to PostgreSQL
 */
export async function fetchAndClearScanBatch(): Promise<Record<string, number>> {
  const client = getRedisClient();
  const HASH_KEY = 'qr:scans:batch';
  const result: Record<string, number> = {};

  if (client && isConnected) {
    try {
      // Atomic Lua script or rename to avoid race condition during flush
      const tempKey = `qr:scans:flush:${Date.now()}`;
      const exists = await client.exists(HASH_KEY);
      if (exists) {
        await client.rename(HASH_KEY, tempKey);
        const data = await client.hgetall(tempKey);
        await client.del(tempKey);

        for (const [code, countStr] of Object.entries(data)) {
          const count = parseInt(countStr, 10);
          if (count > 0) {
            result[code] = (result[code] || 0) + count;
          }
        }
      }
    } catch {
      // If rename fails or Redis error, proceed to check in-memory
    }
  }

  // Also include and clear any in-memory buffered counts
  if (inMemoryScans.size > 0) {
    for (const [code, count] of inMemoryScans.entries()) {
      if (count > 0) {
        result[code] = (result[code] || 0) + count;
      }
    }
    inMemoryScans.clear();
  }

  return result;
}
