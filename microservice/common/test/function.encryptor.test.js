const { encrypt, decrypt, hashString, decryptSecret } = require("../function/encryptor");
const { MASTER_KEY, CRYPTO_SECRET, sealSecret, useCryptoEnv } = require("./helper/crypto-env");

const originalEnv = { ...process.env };

beforeEach(() => {
    useCryptoEnv();
});

afterEach(() => {
    process.env = { ...originalEnv };
});

describe("decryptSecret", () => {
    it("unseals a value encrypted under MASTER_KEY", () => {
        expect(decryptSecret(sealSecret("mongodb://localhost:27017"))).toBe(
            "mongodb://localhost:27017"
        );
    });

    it("returns null for an absent secret", () => {
        expect(decryptSecret(undefined)).toBeNull();
        expect(decryptSecret("")).toBeNull();
    });

    it("throws when MASTER_KEY is not configured", () => {
        const sealed = sealSecret("anything");
        delete process.env.MASTER_KEY;
        expect(() => decryptSecret(sealed)).toThrow("MASTER_KEY missing");
    });

    it("cannot unseal a value written under a different master key", () => {
        const otherMaster = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
        const sealed = sealSecret("secret-value", otherMaster);
        expect(decryptSecret(sealed)).not.toBe("secret-value");
    });
});

describe("encrypt / decrypt", () => {
    it("round-trips a value", () => {
        const plaintext = JSON.stringify({ password: "hunter2" });
        expect(decrypt(encrypt(plaintext))).toBe(plaintext);
    });

    it("emits an <ivHex>:<contentHex> envelope", () => {
        const [iv, content] = encrypt("payload").split(":");
        expect(iv).toMatch(/^[0-9a-f]{32}$/);
        expect(content).toMatch(/^[0-9a-f]+$/);
    });

    it("produces a different ciphertext each time (random IV)", () => {
        expect(encrypt("payload")).not.toBe(encrypt("payload"));
    });
});

describe("hashString", () => {
    it("is deterministic for the same text and salt", () => {
        expect(hashString("user@example.com", "email")).toBe(
            hashString("user@example.com", "email")
        );
    });

    it("returns a sha256 hex digest", () => {
        expect(hashString("value")).toMatch(/^[0-9a-f]{64}$/);
    });

    it("separates the same value across different salts", () => {
        expect(hashString("42", "context.userId")).not.toBe(hashString("42", "data.userId"));
    });

    it("throws when ENC_CRYPTO_SECRET is not configured", () => {
        delete process.env.ENC_CRYPTO_SECRET;
        expect(() => hashString("value")).toThrow("ENC_CRYPTO_SECRET not configured");
    });
});

describe("crypto env helper", () => {
    it("seals ENC_CRYPTO_SECRET so it unseals to the shared crypto secret", () => {
        expect(process.env.MASTER_KEY).toBe(MASTER_KEY);
        expect(decryptSecret(process.env.ENC_CRYPTO_SECRET)).toBe(CRYPTO_SECRET);
    });
});
