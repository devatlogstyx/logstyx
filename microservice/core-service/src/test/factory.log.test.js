// factory/log -> factory/bucket -> shared/mongoose -> shared/logger, which opens
// a websocket via the mq-producer on require.
jest.mock("../shared/logger", () => ({
    logger: {
        error: jest.fn(),
        info: jest.fn(),
        critical: jest.fn(),
        warn: jest.fn(),
        custom: jest.fn(),
    },
}));

const crypto = require("crypto");
const { hashString } = require("common/function");
const {
    NO_ACCESS_ERR_CODE,
    NO_ACCESS_ERR_MESSAGE,
    ERROR_LOG_LEVEL,
    FULL_PAYLOAD_DEDUPLICATION_STRATEGY,
    INDEX_ONLY_DEDUPLICATION_STRATEGY,
    NONE_DEDUPLICATION_STRATEGY,
} = require("common/constant");
const {
    validateOrigin,
    validateSignature,
    generateIndexedHashes,
    generateRawValues,
    isRecent,
    generateLogKey,
    evaluateBucketFilter,
    buildLogsSearchQuery,
    HToMs,
} = require("../internal/factory/log");
const { useCryptoEnv } = require("./helper/crypto-env");

beforeEach(() => {
    useCryptoEnv();
});

describe("validateOrigin", () => {
    const project = { settings: { allowedOrigin: ["https://app.example.com"] } };

    it("accepts an allow-listed origin", () => {
        expect(validateOrigin(project, "https://app.example.com")).toBe(true);
    });

    it("rejects an origin that is not allow-listed", () => {
        expect(() => validateOrigin(project, "https://evil.example.com")).toThrow(
            expect.objectContaining({
                error: NO_ACCESS_ERR_CODE,
                message: NO_ACCESS_ERR_MESSAGE,
            })
        );
    });

    it("rejects when the project has no allow-list at all", () => {
        expect(() => validateOrigin({}, "https://app.example.com")).toThrow(NO_ACCESS_ERR_MESSAGE);
    });

    it("does not treat a partial match as allowed", () => {
        expect(() => validateOrigin(project, "https://app.example.com.evil.io")).toThrow(
            NO_ACCESS_ERR_MESSAGE
        );
    });
});

describe("validateSignature", () => {
    const project = { secret: "project-shared-secret" };
    const timestamp = 1_767_225_600;
    const body = {
        level: ERROR_LOG_LEVEL,
        projectId: "6512f0aa11bb22cc33dd4400",
        device: { os: "linux" },
        context: { userId: "42" },
        data: { message: "boom" },
    };

    const sign = (secret, payloadBody, ts) => {
        const { level, projectId, device, context, data } = payloadBody;
        const hash =
            projectId + JSON.stringify({ level, projectId, device, context, data }) + ts;
        return crypto.createHmac("SHA256", secret).update(hash).digest("hex").toUpperCase();
    };

    it("accepts a correctly signed body", () => {
        const signature = sign(project.secret, body, timestamp);
        expect(validateSignature(project, { timestamp, signature }, body)).toBe(true);
    });

    it("rejects a signature made with the wrong secret", () => {
        const signature = sign("wrong-secret", body, timestamp);
        expect(() => validateSignature(project, { timestamp, signature }, body)).toThrow(
            NO_ACCESS_ERR_MESSAGE
        );
    });

    it("rejects a replay under a different timestamp", () => {
        const signature = sign(project.secret, body, timestamp);
        expect(() =>
            validateSignature(project, { timestamp: timestamp + 1, signature }, body)
        ).toThrow(NO_ACCESS_ERR_MESSAGE);
    });

    it("rejects a body tampered with after signing", () => {
        const signature = sign(project.secret, body, timestamp);
        expect(() =>
            validateSignature(
                project,
                { timestamp, signature },
                { ...body, data: { message: "tampered" } }
            )
        ).toThrow(NO_ACCESS_ERR_MESSAGE);
    });

    it("rejects a lowercase signature", () => {
        const signature = sign(project.secret, body, timestamp).toLowerCase();
        expect(() => validateSignature(project, { timestamp, signature }, body)).toThrow(
            NO_ACCESS_ERR_MESSAGE
        );
    });

    it("treats a non-numeric timestamp as 0", () => {
        const signature = sign(project.secret, body, 0);
        expect(validateSignature(project, { timestamp: "not-a-number", signature }, body)).toBe(
            true
        );
    });
});

describe("generateIndexedHashes", () => {
    const bucket = { settings: { indexes: ["context.userId", "data.errorCode"] } };

    it("hashes each indexed field under a flattened key", () => {
        const log = { context: { userId: "42" }, data: { errorCode: "E_TIMEOUT" } };

        expect(generateIndexedHashes(log, bucket)).toEqual({
            context_userId: hashString("42", "context.userId"),
            data_errorCode: hashString("E_TIMEOUT", "data.errorCode"),
        });
    });

    it("skips fields the log does not carry", () => {
        expect(generateIndexedHashes({ context: { userId: "42" } }, bucket)).toEqual({
            context_userId: hashString("42", "context.userId"),
        });
    });

    it("does not store the plaintext value", () => {
        const hashes = generateIndexedHashes({ context: { userId: "ada@example.com" } }, bucket);
        expect(JSON.stringify(hashes)).not.toContain("ada@example.com");
    });

    it("salts per field path, so the same value differs across fields", () => {
        const hashes = generateIndexedHashes(
            { context: { userId: "42" }, data: { errorCode: "42" } },
            bucket
        );
        expect(hashes.context_userId).not.toBe(hashes.data_errorCode);
    });

    it("stringifies non-string values before hashing", () => {
        expect(generateIndexedHashes({ context: { userId: 42 } }, bucket).context_userId).toBe(
            hashString("42", "context.userId")
        );
    });

    it("returns an empty map when the bucket indexes nothing", () => {
        expect(generateIndexedHashes({ context: { userId: "42" } }, { settings: { indexes: [] } })).toEqual({});
    });
});

describe("generateRawValues", () => {
    const bucket = { settings: { rawIndexes: ["data.durationMs", "context.region"] } };

    it("copies raw values under a flattened key", () => {
        expect(
            generateRawValues({ data: { durationMs: 1234 }, context: { region: "ap-southeast-1" } }, bucket)
        ).toEqual({
            data_durationMs: 1234,
            context_region: "ap-southeast-1",
        });
    });

    it("skips fields the payload does not carry", () => {
        expect(generateRawValues({ data: { durationMs: 1234 } }, bucket)).toEqual({
            data_durationMs: 1234,
        });
    });

    it("returns an empty map when the bucket declares no raw indexes", () => {
        expect(generateRawValues({ data: { durationMs: 1 } }, { settings: {} })).toEqual({});
        expect(generateRawValues({ data: { durationMs: 1 } }, { settings: { rawIndexes: [] } })).toEqual({});
        expect(generateRawValues({ data: { durationMs: 1 } }, undefined)).toEqual({});
    });
});

describe("isRecent", () => {
    it("treats a timestamp inside the window as recent", () => {
        expect(isRecent(new Date(Date.now() - 60 * 60 * 1000), 24)).toBe(true);
    });

    it("treats a timestamp past the window as stale", () => {
        expect(isRecent(new Date(Date.now() - 48 * 60 * 60 * 1000), 24)).toBe(false);
    });

    it("defaults the window to 24 hours", () => {
        expect(isRecent(new Date(Date.now() - 23 * 60 * 60 * 1000))).toBe(true);
        expect(isRecent(new Date(Date.now() - 25 * 60 * 60 * 1000))).toBe(false);
    });
});

describe("generateLogKey", () => {
    const params = {
        level: ERROR_LOG_LEVEL,
        device: { os: "linux" },
        context: { userId: "42" },
        data: { message: "boom" },
    };

    it("defaults to the full-payload strategy", () => {
        expect(generateLogKey(params, {})).toBe(
            generateLogKey(params, {
                settings: { deduplicationStrategy: FULL_PAYLOAD_DEDUPLICATION_STRATEGY },
            })
        );
    });

    it("collapses identical payloads under the full-payload strategy", () => {
        const bucket = {
            settings: { deduplicationStrategy: FULL_PAYLOAD_DEDUPLICATION_STRATEGY },
        };
        expect(generateLogKey(params, bucket)).toBe(generateLogKey({ ...params }, bucket));
    });

    it("separates payloads that differ in any field under the full-payload strategy", () => {
        const bucket = {
            settings: { deduplicationStrategy: FULL_PAYLOAD_DEDUPLICATION_STRATEGY },
        };
        expect(generateLogKey(params, bucket)).not.toBe(
            generateLogKey({ ...params, data: { message: "different" } }, bucket)
        );
    });

    it("ignores unindexed fields under the index-only strategy", () => {
        const bucket = {
            settings: {
                deduplicationStrategy: INDEX_ONLY_DEDUPLICATION_STRATEGY,
                indexes: ["context.userId"],
            },
        };

        expect(generateLogKey(params, bucket)).toBe(
            generateLogKey({ ...params, data: { message: "totally different" } }, bucket)
        );
    });

    it("separates different indexed values under the index-only strategy", () => {
        const bucket = {
            settings: {
                deduplicationStrategy: INDEX_ONLY_DEDUPLICATION_STRATEGY,
                indexes: ["context.userId"],
            },
        };

        expect(generateLogKey(params, bucket)).not.toBe(
            generateLogKey({ ...params, context: { userId: "43" } }, bucket)
        );
    });

    it("never collapses two logs under the none strategy", () => {
        const bucket = { settings: { deduplicationStrategy: NONE_DEDUPLICATION_STRATEGY } };
        expect(generateLogKey(params, bucket)).not.toBe(generateLogKey(params, bucket));
    });

    it("returns a sha256 hex digest for every strategy", () => {
        for (const deduplicationStrategy of [
            FULL_PAYLOAD_DEDUPLICATION_STRATEGY,
            INDEX_ONLY_DEDUPLICATION_STRATEGY,
            NONE_DEDUPLICATION_STRATEGY,
        ]) {
            expect(generateLogKey(params, { settings: { deduplicationStrategy } })).toMatch(
                /^[0-9a-f]{64}$/
            );
        }
    });
});

describe("evaluateBucketFilter", () => {
    const log = { level: ERROR_LOG_LEVEL, context: { retries: 3 } };

    it("requires every filter to match", () => {
        expect(
            evaluateBucketFilter(log, [
                { field: "level", operator: "eq", value: ERROR_LOG_LEVEL },
                { field: "context.retries", operator: "gte", value: 3 },
            ])
        ).toBe(true);
    });

    it("fails when any filter does not match", () => {
        expect(
            evaluateBucketFilter(log, [
                { field: "level", operator: "eq", value: ERROR_LOG_LEVEL },
                { field: "context.retries", operator: "gt", value: 10 },
            ])
        ).toBe(false);
    });

    it("passes an empty filter list", () => {
        expect(evaluateBucketFilter(log, [])).toBe(true);
    });
});

describe("buildLogsSearchQuery", () => {
    const bucket = { settings: { rawIndexes: ["data.durationMs"] } };

    it("returns an empty query with no filters", () => {
        expect(buildLogsSearchQuery({}, bucket)).toEqual({});
        expect(buildLogsSearchQuery(undefined, bucket)).toEqual({});
    });

    it("ignores mismatched field/value lengths", () => {
        expect(
            buildLogsSearchQuery({ filterFields: ["level", "key"], filterValues: ["ERROR"] }, bucket)
        ).toEqual({});
    });

    it("matches a plain field literally", () => {
        expect(
            buildLogsSearchQuery({ filterFields: ["level"], filterValues: [ERROR_LOG_LEVEL] }, bucket)
        ).toEqual({ level: ERROR_LOG_LEVEL });
    });

    it("queries a hashed field via its blind index", () => {
        const query = buildLogsSearchQuery(
            { filterFields: ["context.userId"], filterValues: ["42"] },
            bucket
        );

        expect(query).toEqual({
            "hash.context_userId": hashString("42", "context.userId"),
        });
    });

    it("queries a raw index numerically", () => {
        expect(
            buildLogsSearchQuery(
                { filterFields: ["data.durationMs"], filterValues: ["1500"] },
                bucket
            )
        ).toEqual({ "raw.data_durationMs": 1500 });
    });

    it("supports range operators on a raw index", () => {
        const cases = {
            gt: { $gt: 1500 },
            gte: { $gte: 1500 },
            lt: { $lt: 1500 },
            lte: { $lte: 1500 },
        };

        for (const [operator, expected] of Object.entries(cases)) {
            expect(
                buildLogsSearchQuery(
                    {
                        filterFields: ["data.durationMs"],
                        filterValues: ["1500"],
                        filterOperators: [operator],
                    },
                    bucket
                )
            ).toEqual({ "raw.data_durationMs": expected });
        }
    });

    it("falls back to equality for an unknown operator on a raw index", () => {
        expect(
            buildLogsSearchQuery(
                {
                    filterFields: ["data.durationMs"],
                    filterValues: ["1500"],
                    filterOperators: ["regex"],
                },
                bucket
            )
        ).toEqual({ "raw.data_durationMs": 1500 });
    });

    it("combines several filters into one query", () => {
        const query = buildLogsSearchQuery(
            {
                filterFields: ["level", "data.durationMs", "context.userId"],
                filterValues: [ERROR_LOG_LEVEL, "1500", "42"],
                filterOperators: ["eq", "gte", "eq"],
            },
            bucket
        );

        expect(query).toEqual({
            level: ERROR_LOG_LEVEL,
            "raw.data_durationMs": { $gte: 1500 },
            "hash.context_userId": hashString("42", "context.userId"),
        });
    });

    it("skips a filter whose value is null or undefined", () => {
        expect(
            buildLogsSearchQuery(
                { filterFields: ["level", "key"], filterValues: [null, "abc"] },
                bucket
            )
        ).toEqual({ key: "abc" });
    });
});

describe("HToMs", () => {
    it("converts hours to milliseconds", () => {
        expect(HToMs(2)).toBe(7_200_000);
        expect(HToMs("24")).toBe(86_400_000);
    });

    it("treats non-numeric input as zero", () => {
        expect(HToMs("abc")).toBe(0);
        expect(HToMs(undefined)).toBe(0);
    });
});
