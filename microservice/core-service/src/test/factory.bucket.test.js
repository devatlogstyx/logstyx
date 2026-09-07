// shared/mongoose pulls in shared/logger, which opens a websocket to the
// cache/auth services via the mq-producer on require.
jest.mock("../shared/logger", () => ({
    logger: {
        error: jest.fn(),
        info: jest.fn(),
        critical: jest.fn(),
        warn: jest.fn(),
        custom: jest.fn(),
    },
}));

const { INVALID_INPUT_ERR_CODE } = require("common/constant");
const {
    buildBucketSearchQuery,
    validateCustomIndex,
    sanitizeFieldName,
} = require("../internal/factory/bucket");

const PROJECT_ID = "6512f0aa11bb22cc33dd4400";
const USER_ID = "6512f0aa11bb22cc33dd44ee";

describe("buildBucketSearchQuery", () => {
    it("returns two empty sub-queries with no params", () => {
        expect(buildBucketSearchQuery()).toEqual({ queryBucket: {}, queryUser: {} });
    });

    it("builds a case-insensitive title regex for search", () => {
        expect(buildBucketSearchQuery({ search: "errors" }).queryBucket).toEqual({
            $or: [{ title: { $regex: "errors", $options: "i" } }],
        });
    });

    it("ignores a non-string search term", () => {
        expect(buildBucketSearchQuery({ search: 42 }).queryBucket).toEqual({});
    });

    it("casts a valid project id onto the bucket query", () => {
        const { queryBucket } = buildBucketSearchQuery({ project: PROJECT_ID });
        expect(queryBucket.projects.toString()).toBe(PROJECT_ID);
    });

    it("casts a valid user id onto the membership query", () => {
        const { queryUser } = buildBucketSearchQuery({ user: USER_ID });
        expect(queryUser["user.userId"].toString()).toBe(USER_ID);
    });

    it("ignores malformed ids", () => {
        expect(buildBucketSearchQuery({ project: "nope", user: "nope" })).toEqual({
            queryBucket: {},
            queryUser: {},
        });
    });

    it("combines search with both id filters", () => {
        const { queryBucket, queryUser } = buildBucketSearchQuery({
            search: "errors",
            project: PROJECT_ID,
            user: USER_ID,
        });

        expect(queryBucket.$or).toHaveLength(1);
        expect(queryBucket.projects.toString()).toBe(PROJECT_ID);
        expect(queryUser["user.userId"].toString()).toBe(USER_ID);
    });
});

describe("validateCustomIndex", () => {
    it("accepts paths rooted at context or data", () => {
        expect(validateCustomIndex("context.userId")).toBe(true);
        expect(validateCustomIndex("data.errorMessage")).toBe(true);
        expect(validateCustomIndex("data.request.headers.host")).toBe(true);
    });

    it("rejects paths rooted anywhere else", () => {
        expect(validateCustomIndex("level")).toBe(false);
        expect(validateCustomIndex("meta.userId")).toBe(false);
        expect(validateCustomIndex("contexts.userId")).toBe(false);
    });

    it("rejects a bare root with no leaf", () => {
        expect(validateCustomIndex("context")).toBe(false);
        expect(validateCustomIndex("context.")).toBe(false);
    });

    it("rejects segments that are not identifiers", () => {
        expect(validateCustomIndex("data.9lives")).toBe(false);
        expect(validateCustomIndex("data.user-id")).toBe(false);
        expect(validateCustomIndex("data.a..b")).toBe(false);
    });

    it("rejects an unrooted mongo operator", () => {
        expect(validateCustomIndex("$where")).toBe(false);
    });

    it("allows a $-prefixed segment, which sanitizeFieldName is left to reject", () => {
        // The identifier pattern follows JS rules, so `$` passes here. Callers
        // still run the name through sanitizeFieldName before it reaches mongo.
        expect(validateCustomIndex("data.$where")).toBe(true);
        expect(() => sanitizeFieldName("data.$where")).toThrow("Invalid field name");
    });

    it("caps nesting depth at five by default", () => {
        expect(validateCustomIndex("data.a.b.c.d.e")).toBe(true);
        expect(validateCustomIndex("data.a.b.c.d.e.f")).toBe(false);
    });

    it("honours a custom max depth", () => {
        expect(validateCustomIndex("data.a.b", 2)).toBe(true);
        expect(validateCustomIndex("data.a.b.c", 2)).toBe(false);
    });
});

describe("sanitizeFieldName", () => {
    it("flattens dots into underscores", () => {
        expect(sanitizeFieldName("context.userId")).toBe("context_userId");
        expect(sanitizeFieldName("data.request.host")).toBe("data_request_host");
    });

    it("leaves an already-flat name alone", () => {
        expect(sanitizeFieldName("level")).toBe("level");
    });

    it("rejects anything outside [a-zA-Z0-9_.] with a 400", () => {
        for (const bad of ["data.$where", "data.user-id", "data.a b", "data.a;drop"]) {
            expect(() => sanitizeFieldName(bad)).toThrow(
                expect.objectContaining({ error: INVALID_INPUT_ERR_CODE })
            );
        }
    });

    it("rejects an empty field name", () => {
        expect(() => sanitizeFieldName("")).toThrow("Invalid field name");
    });
});
