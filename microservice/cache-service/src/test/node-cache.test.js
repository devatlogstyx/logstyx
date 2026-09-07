const { createCache, readCache, removeCache } = require("../internal/service/cache/node-cache");

// The module holds a single process-wide NodeCache, so the clock is faked for
// the whole file to keep TTL assertions deterministic.
beforeEach(() => {
    jest.useFakeTimers();
});

afterEach(() => {
    jest.useRealTimers();
});

describe("createCache / readCache", () => {
    it("round-trips a value", async () => {
        await createCache("user", "1", { fullname: "Ada" });
        await expect(readCache("user", "1")).resolves.toEqual({ fullname: "Ada" });
    });

    it("reports success", async () => {
        await expect(createCache("user", "success", { a: 1 })).resolves.toBe(true);
    });

    it("overwrites an existing entry", async () => {
        await createCache("user", "2", { fullname: "Ada" });
        await createCache("user", "2", { fullname: "Grace" });
        await expect(readCache("user", "2")).resolves.toEqual({ fullname: "Grace" });
    });

    it("resolves undefined for a key that was never written", async () => {
        await expect(readCache("user", "never-written")).resolves.toBeUndefined();
    });
});

describe("key namespacing", () => {
    it("keeps the same id separate across cache keys", async () => {
        await createCache("user", "3", "from-user");
        await createCache("userlogin", "3", "from-userlogin");

        await expect(readCache("user", "3")).resolves.toBe("from-user");
        await expect(readCache("userlogin", "3")).resolves.toBe("from-userlogin");
    });

    it("keeps different ids separate within one cache key", async () => {
        await createCache("user", "4", "four");
        await createCache("user", "5", "five");

        await expect(readCache("user", "4")).resolves.toBe("four");
        await expect(readCache("user", "5")).resolves.toBe("five");
    });
});

describe("ttl", () => {
    it("expires an entry once its ttl elapses", async () => {
        await createCache("user", "ttl-short", { fullname: "Ada" }, 60);

        jest.advanceTimersByTime(59_000);
        await expect(readCache("user", "ttl-short")).resolves.toEqual({ fullname: "Ada" });

        jest.advanceTimersByTime(2_000);
        await expect(readCache("user", "ttl-short")).resolves.toBeUndefined();
    });

    it("defaults to a five minute ttl", async () => {
        await createCache("user", "ttl-default", { fullname: "Ada" });

        jest.advanceTimersByTime(4 * 60 * 1000);
        await expect(readCache("user", "ttl-default")).resolves.toEqual({ fullname: "Ada" });

        jest.advanceTimersByTime(2 * 60 * 1000);
        await expect(readCache("user", "ttl-default")).resolves.toBeUndefined();
    });

    it("treats an explicit 0 ttl as no expiry", async () => {
        await createCache("user", "ttl-zero", { fullname: "Ada" }, 0);

        jest.advanceTimersByTime(24 * 60 * 60 * 1000);
        await expect(readCache("user", "ttl-zero")).resolves.toEqual({ fullname: "Ada" });
    });

    it("treats a null ttl as no expiry", async () => {
        await createCache("user", "ttl-null", { fullname: "Ada" }, null);

        jest.advanceTimersByTime(24 * 60 * 60 * 1000);
        await expect(readCache("user", "ttl-null")).resolves.toEqual({ fullname: "Ada" });
    });
});

describe("removeCache", () => {
    it("deletes the entry and reports one key removed", async () => {
        await createCache("user", "6", { fullname: "Ada" });

        await expect(removeCache("user", "6")).resolves.toBe(1);
        await expect(readCache("user", "6")).resolves.toBeUndefined();
    });

    it("reports zero for a key that is not cached", async () => {
        await expect(removeCache("user", "not-cached")).resolves.toBe(0);
    });

    it("only removes the requested namespace", async () => {
        await createCache("user", "7", "from-user");
        await createCache("userlogin", "7", "from-userlogin");

        await removeCache("user", "7");

        await expect(readCache("user", "7")).resolves.toBeUndefined();
        await expect(readCache("userlogin", "7")).resolves.toBe("from-userlogin");
    });
});
