const Redis = require("ioredis");
const { decryptSecret } = require("common/function");

// Decrypt your single env variable
const REDIS_URL = (process.env.ENC_REDIS_URL && decryptSecret(process.env.ENC_REDIS_URL))
  || process.env.REDIS_URL
  || 'redis://redis:6379';

const url = new URL(REDIS_URL.includes("://") ? REDIS_URL : `redis://${REDIS_URL}`);
const REDIS_HOST = url.hostname;
const REDIS_PORT = parseInt(url.port) || 6379;
const REDIS_AUTH = url.password || undefined;
const USE_TLS = url.protocol === 'rediss:';

// Determine if we should use cluster mode (check if it's a cluster endpoint)
const isCluster = REDIS_HOST.includes('clustercfg') || process.env.REDIS_CLUSTER === 'true';

let redis;

if (isCluster) {
  console.log(`Initializing Redis Cluster at ${REDIS_HOST}:${REDIS_PORT}`);
  // Cluster mode (for serverless/cloud environments)
  redis = new Redis.Cluster(
    [{ host: REDIS_HOST, port: REDIS_PORT }],
    {
      dnsLookup: (address, callback) => callback(null, address),
      redisOptions: {
        tls: USE_TLS ? {} : undefined,
        password: REDIS_AUTH,
        enableReadyCheck: true,
      },
      clusterRetryStrategy: (times) => {
        if (times > 10) return null;
        return Math.min(times * 100, 2000);
      },
      enableOfflineQueue: true,
      maxRetriesPerRequest: 3,
    }
  );
} else {
  console.log(`Initializing Redis Standalone at ${REDIS_HOST}:${REDIS_PORT}`);
  // Standalone mode (for local development)
  redis = new Redis({
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_AUTH,
    tls: USE_TLS ? {} : undefined,
    retryStrategy: (times) => {
      if (times > 10) return null;
      return Math.min(times * 50, 2000);
    },
    enableReadyCheck: true,
    maxRetriesPerRequest: 3,
  });
}

redis.on('error', (err) => {
  console.error(`Redis ${isCluster ? 'Cluster' : 'Standalone'} error:`, err.message);
});

redis.on('connect', () => {
  console.log(`✓ Connected to Redis (${isCluster ? 'cluster' : 'standalone'}) at ${REDIS_HOST}:${REDIS_PORT}`);
});

redis.on('ready', () => {
  console.log(`✓ Redis ${isCluster ? 'Cluster' : 'Standalone'} is ready`);
});

redis.on('close', () => {
  console.log(`Redis ${isCluster ? 'Cluster' : 'Standalone'} connection closed`);
});

const makeKey = (key, id) => `${key}-${id}`;

module.exports = {
  /**
   * Create a cache entry with TTL
   * @param {string} key - Cache key prefix
   * @param {string} id - Cache key identifier
   * @param {any} data - Data to cache (will be JSON stringified)
   * @param {number} ttl - Time to live in seconds (default: 5 minutes)
   * @returns {Promise<boolean>} - True if successful
   */
  async createCache(key, id, data, ttl = 5 * 60) {
    try {
      const result = await redis.set(makeKey(key, id), JSON.stringify(data), 'EX', ttl);
      return result === 'OK';
    } catch (err) {
      console.error(`Failed to create cache for ${makeKey(key, id)}:`, err.message);
      return false;
    }
  },

  /**
   * Read a cache entry
   * @param {string} key - Cache key prefix
   * @param {string} id - Cache key identifier
   * @returns {Promise<any|null>} - Parsed data or null if not found
   */
  async readCache(key, id) {
    try {
      const raw = await redis.get(makeKey(key, id));
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      console.error(`Failed to read cache for ${makeKey(key, id)}:`, err.message);
      return null;
    }
  },

  /**
   * Remove a cache entry
   * @param {string} key - Cache key prefix
   * @param {string} id - Cache key identifier
   * @returns {Promise<boolean>} - True if key was deleted
   */
  async removeCache(key, id) {
    try {
      const result = await redis.del(makeKey(key, id));
      return result > 0;
    } catch (err) {
      console.error(`Failed to remove cache for ${makeKey(key, id)}:`, err.message);
      return false;
    }
  },

  /**
   * Check if Redis is connected
   * @returns {boolean}
   */
  isConnected() {
    return redis.status === 'ready';
  },

  /**
   * Get the raw Redis client (for advanced operations)
   * @returns {Redis|Redis.Cluster}
   */
  getClient() {
    return redis;
  },

  /**
   * Gracefully close the Redis connection
   * @returns {Promise<void>}
   */
  async disconnect() {
    try {
      await redis.quit();
      console.log('Redis connection closed gracefully');
    } catch (err) {
      console.error('Error closing Redis connection:', err.message);
      redis.disconnect(); // Force disconnect
    }
  },
};