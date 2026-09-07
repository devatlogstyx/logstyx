const { compressAndEncrypt } = require("common/function");
const { ERROR_LOG_LEVEL } = require("common/constant");
const { mapBucket, mapProjectUser, mapProject, mapLog } = require("../internal/utils/mapper");
const { useCryptoEnv } = require("./helper/crypto-env");

const OBJECT_ID = "6512f0aa11bb22cc33dd44ee";
const asDoc = (fields) => ({ _id: { toString: () => OBJECT_ID }, ...fields });

beforeEach(() => {
    useCryptoEnv();
});

describe("mapBucket", () => {
    it("exposes the bucket fields", () => {
        const createdAt = new Date("2026-01-01T00:00:00.000Z");

        expect(
            mapBucket(
                asDoc({
                    title: "Errors",
                    projects: ["6512f0aa11bb22cc33dd4400"],
                    settings: { indexes: ["context.userId"] },
                    createdAt,
                    __v: 3,
                })
            )
        ).toEqual({
            id: OBJECT_ID,
            title: "Errors",
            projects: ["6512f0aa11bb22cc33dd4400"],
            settings: { indexes: ["context.userId"] },
            createdAt,
        });
    });

    it("prefers an already-serialized id over _id", () => {
        expect(mapBucket({ id: "plain-id", _id: { toString: () => OBJECT_ID } }).id).toBe(
            "plain-id"
        );
    });
});

describe("mapProjectUser", () => {
    it("lifts the nested user id and name", () => {
        const createdAt = new Date("2026-01-01T00:00:00.000Z");

        expect(
            mapProjectUser({
                user: { userId: { toString: () => OBJECT_ID }, fullname: "Ada Lovelace" },
                createdAt,
            })
        ).toEqual({ id: OBJECT_ID, fullname: "Ada Lovelace", createdAt });
    });

    it("keeps the key set stable for a missing membership", () => {
        expect(mapProjectUser(undefined)).toEqual({
            id: undefined,
            fullname: undefined,
            createdAt: undefined,
        });
    });
});

describe("mapProject", () => {
    it("exposes the project fields and narrows settings to allowedOrigin", () => {
        expect(
            mapProject(
                asDoc({
                    title: "Storefront",
                    slug: "storefront",
                    secret: "project-shared-secret",
                    settings: {
                        allowedOrigin: ["https://app.example.com"],
                        internalNote: "should not leak",
                    },
                })
            )
        ).toEqual({
            id: OBJECT_ID,
            title: "Storefront",
            slug: "storefront",
            secret: "project-shared-secret",
            settings: { allowedOrigin: ["https://app.example.com"] },
            createdAt: undefined,
        });
    });
});

describe("mapLog", () => {
    it("decrypts the sealed context and data", async () => {
        const context = { userId: "42", region: "ap-southeast-1" };
        const data = { message: "boom", stack: "Error: boom" };

        const mapped = await mapLog(
            asDoc({
                key: "abc123",
                level: ERROR_LOG_LEVEL,
                device: { os: "linux" },
                context: await compressAndEncrypt(context),
                data: await compressAndEncrypt(data),
                hash: { context_userId: "deadbeef" },
                count: 7,
            })
        );

        expect(mapped).toMatchObject({
            id: OBJECT_ID,
            key: "abc123",
            level: ERROR_LOG_LEVEL,
            device: { os: "linux" },
            context,
            data,
            hash: { context_userId: "deadbeef" },
            count: 7,
        });
    });

    it("rejects when the sealed payload is missing", async () => {
        await expect(mapLog(asDoc({ key: "abc123", level: ERROR_LOG_LEVEL }))).rejects.toThrow();
    });
});
