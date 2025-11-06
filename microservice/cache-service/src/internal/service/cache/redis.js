const Redis = require("ioredis");
const { decryptSecret } = require("common/function")

// Decrypt your single env variable
const REDIS_URL = process.env.REDIS_URL
  || (process.env.ENC_REDIS_URL && decryptSecret(process.env.ENC_REDIS_URL))
  || 'redis://redis:6379'

const url = new URL(REDIS_URL.includes("://") ? REDIS_URL : `rediss://${REDIS_URL}`);
const REDIS_HOST = url.hostname;
const REDIS_PORT = url.port || 6379;
const REDIS_AUTH = url.password || undefined;

// Connect as cluster (serverless requires cluster client + TLS)
const redis = new Redis.Cluster(
  [{ host: REDIS_HOST, port: REDIS_PORT }],
  {
    dnsLookup: (address, callback) => callback(null, address),
    redisOptions: {
      tls: {},
      password: REDIS_AUTH,
    },
  }
);

const makeKey = (key, id) => `${key}-${id}`;

module.exports = {
  async createCache(key, id, data, ttl = 5 * 60) {
    const result = await redis.set(makeKey(key, id), JSON.stringify(data), 'EX', ttl);
    return result === 'OK';
  },

  async readCache(key, id) {
    const raw = await redis.get(makeKey(key, id));
    return raw ? JSON.parse(raw) : null;
  },

  async removeCache(key, id) {
    const result = await redis.del(makeKey(key, id));
    return result > 0;
  },
};
