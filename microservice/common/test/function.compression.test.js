const { compressAndEncrypt, decryptAndDecompress } = require("../function/compression");
const { useCryptoEnv } = require("./helper/crypto-env");

const originalEnv = { ...process.env };

beforeEach(() => {
    useCryptoEnv();
});

afterEach(() => {
    process.env = { ...originalEnv };
});

describe("compressAndEncrypt / decryptAndDecompress", () => {
    it("round-trips a log payload", async () => {
        const payload = {
            userId: "abc123",
            stack: "Error: boom\n    at handler (server.js:1:1)",
            nested: { retries: 3, tags: ["db", "slow"] },
        };

        expect(await decryptAndDecompress(await compressAndEncrypt(payload))).toEqual(payload);
    });

    it("round-trips arrays and primitives", async () => {
        expect(await decryptAndDecompress(await compressAndEncrypt([1, 2, 3]))).toEqual([1, 2, 3]);
        expect(await decryptAndDecompress(await compressAndEncrypt("plain"))).toBe("plain");
        expect(await decryptAndDecompress(await compressAndEncrypt(null))).toBeNull();
    });

    it("returns a single base64 string", async () => {
        const sealed = await compressAndEncrypt({ a: 1 });
        expect(typeof sealed).toBe("string");
        expect(sealed).toMatch(/^[A-Za-z0-9+/]+={0,2}$/);
    });

    it("prefixes a fresh 16-byte IV, so the same input seals differently", async () => {
        const a = await compressAndEncrypt({ a: 1 });
        const b = await compressAndEncrypt({ a: 1 });
        expect(a).not.toBe(b);
        expect(Buffer.from(a, "base64").subarray(0, 16)).not.toEqual(
            Buffer.from(b, "base64").subarray(0, 16)
        );
    });

    it("compresses repetitive payloads below their JSON size", async () => {
        const repetitive = { message: "the same line over and over. ".repeat(200) };
        const sealed = await compressAndEncrypt(repetitive);
        expect(Buffer.from(sealed, "base64").length).toBeLessThan(
            JSON.stringify(repetitive).length
        );
    });

    it("rejects a payload sealed under a different crypto secret", async () => {
        const sealed = await compressAndEncrypt({ a: 1 });

        // Re-key without re-sealing, the way a rotated MASTER_KEY would leave
        // already-stored documents unreadable.
        useCryptoEnv();
        process.env.MASTER_KEY = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

        await expect(decryptAndDecompress(sealed)).rejects.toThrow();
    });
});
