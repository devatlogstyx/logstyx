// Both of these open websockets to the cache/core services on require --
// shared/logger transitively via the mq-producer. Factory mocks keep them from
// being evaluated at all (jest's automock would still run the module).
jest.mock("../shared/cache", () => ({
    getUserFromCache: jest.fn(),
}));

jest.mock("../shared/logger", () => ({
    logger: {
        error: jest.fn(),
        info: jest.fn(),
        critical: jest.fn(),
        warn: jest.fn(),
        custom: jest.fn(),
    },
}));

const bcrypt = require("bcryptjs");
const { encrypt } = require("common/function");
const { getUserFromCache } = require("../shared/cache");
const {
    buildUserSearchQuery,
    verifyUserPassword,
    canUserDo,
    getLastLogin,
} = require("../internal/factory/user");
const { useCryptoEnv } = require("./helper/crypto-env");

const VALID_ID = "6512f0aa11bb22cc33dd44ee";

beforeEach(() => {
    useCryptoEnv();
    jest.clearAllMocks();
});

describe("buildUserSearchQuery", () => {
    it("returns an empty query with no params", () => {
        expect(buildUserSearchQuery()).toEqual({});
        expect(buildUserSearchQuery({})).toEqual({});
    });

    it("builds a case-insensitive fullname regex for search", () => {
        expect(buildUserSearchQuery({ search: "ada" })).toEqual({
            $or: [{ fullname: { $regex: "ada", $options: "i" } }],
        });
    });

    it("ignores a non-string search term", () => {
        expect(buildUserSearchQuery({ search: 42 })).toEqual({});
    });

    it("casts a valid group id to an ObjectId", () => {
        const query = buildUserSearchQuery({ group: VALID_ID });
        expect(query.group.toString()).toBe(VALID_ID);
    });

    it("ignores a malformed group id", () => {
        expect(buildUserSearchQuery({ group: "not-an-object-id" })).toEqual({});
    });
});

describe("verifyUserPassword", () => {
    const sealCredentials = async (password) =>
        encrypt(JSON.stringify({ password: await bcrypt.hash(password, 4) }));

    it("accepts the correct password", async () => {
        const credentials = await sealCredentials("s3cret-pass");
        await expect(verifyUserPassword(credentials, "s3cret-pass")).resolves.toBe(true);
    });

    it("rejects a wrong password", async () => {
        const credentials = await sealCredentials("s3cret-pass");
        await expect(verifyUserPassword(credentials, "wrong-pass")).resolves.toBe(false);
    });

    it("rejects when the credentials blob is not valid JSON", async () => {
        await expect(verifyUserPassword(encrypt("not-json"), "anything")).rejects.toBeInstanceOf(
            SyntaxError
        );
    });
});

describe("canUserDo", () => {
    it("allows an access the user holds", async () => {
        getUserFromCache.mockResolvedValue({ permissions: ["READ_PROJECT", "WRITE_PROJECT"] });
        await expect(canUserDo(VALID_ID, "WRITE_PROJECT")).resolves.toBe(true);
    });

    it("denies an access the user does not hold", async () => {
        getUserFromCache.mockResolvedValue({ permissions: ["READ_PROJECT"] });
        await expect(canUserDo(VALID_ID, "WRITE_PROJECT")).resolves.toBe(false);
    });

    it("denies without hitting the cache when the id is malformed", async () => {
        await expect(canUserDo("nope", "READ_PROJECT")).resolves.toBe(false);
        expect(getUserFromCache).not.toHaveBeenCalled();
    });

    it("denies without hitting the cache when no access is given", async () => {
        await expect(canUserDo(VALID_ID, undefined)).resolves.toBe(false);
        expect(getUserFromCache).not.toHaveBeenCalled();
    });

    it("denies when the user is not in the cache", async () => {
        getUserFromCache.mockResolvedValue(null);
        await expect(canUserDo(VALID_ID, "READ_PROJECT")).resolves.toBe(false);
    });
});

describe("getLastLogin", () => {
    it("takes the first hop of x-forwarded-for over req.ip", () => {
        const login = getLastLogin({
            headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1", "user-agent": "curl/8.0" },
            ip: "10.0.0.1",
        });

        expect(login.from.ip).toBe("203.0.113.7");
        expect(login.from.userAgent).toBe("curl/8.0");
        expect(login.at).toBeInstanceOf(Date);
    });

    it("falls back to req.ip when the header is absent", () => {
        expect(getLastLogin({ headers: {}, ip: "198.51.100.4" }).from.ip).toBe("198.51.100.4");
    });

    it("reports Unknown for an address with no geo record", () => {
        expect(getLastLogin({ headers: {}, ip: "10.0.0.1" }).from.location).toBe("Unknown");
    });
});
