// The redis driver connects to Redis on require, so it never runs for real
// here. __driver is a marker so the selection can be asserted directly.
jest.mock("../internal/service/cache/redis", () => ({
    __driver: "redis",
    createCache: jest.fn(),
    readCache: jest.fn(),
    removeCache: jest.fn(),
}));

const loadDriver = () => {
    let driver;
    jest.isolateModules(() => {
        driver = require("../internal/service/cache");
    });
    return driver;
};

const originalEnv = { ...process.env };

beforeEach(() => {
    delete process.env.REDIS_URL;
    delete process.env.ENC_REDIS_URL;
});

afterEach(() => {
    process.env = { ...originalEnv };
});

describe("cache driver selection", () => {
    it("uses the in-process node-cache when no redis url is configured", () => {
        const driver = loadDriver();
        expect(driver.__driver).toBeUndefined();
    });

    it("uses redis when REDIS_URL is set", () => {
        process.env.REDIS_URL = "redis://redis:6379";
        expect(loadDriver().__driver).toBe("redis");
    });

    it("uses redis when only the encrypted ENC_REDIS_URL is set", () => {
        process.env.ENC_REDIS_URL = "deadbeef:cafebabe";
        expect(loadDriver().__driver).toBe("redis");
    });

    it("ignores an empty REDIS_URL", () => {
        process.env.REDIS_URL = "";
        expect(loadDriver().__driver).toBeUndefined();
    });

    it("exposes the same surface either way", () => {
        const nodeCacheDriver = loadDriver();

        process.env.REDIS_URL = "redis://redis:6379";
        const redisDriver = loadDriver();

        for (const method of ["createCache", "readCache", "removeCache"]) {
            expect(typeof nodeCacheDriver[method]).toBe("function");
            expect(typeof redisDriver[method]).toBe("function");
        }
    });
});
