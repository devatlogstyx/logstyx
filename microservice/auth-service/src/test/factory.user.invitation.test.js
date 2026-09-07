const { hashString } = require("common/function");
const { INVALID_INPUT_ERR_CODE } = require("common/constant");
const {
    validateCreateInput,
    buildUserInvitationSearchQuery,
} = require("../internal/factory/user.invitation");
const { useCryptoEnv } = require("./helper/crypto-env");

beforeEach(() => {
    useCryptoEnv();
});

describe("validateCreateInput", () => {
    it("accepts a minimal invitation", async () => {
        await expect(
            validateCreateInput({ email: "new@example.com", permissions: ["READ_PROJECT"] })
        ).resolves.toBeUndefined();
    });

    it("rejects a malformed email with a 400", async () => {
        await expect(
            validateCreateInput({ email: "not-an-email", permissions: ["READ_PROJECT"] })
        ).rejects.toMatchObject({ error: INVALID_INPUT_ERR_CODE });
    });

    it("rejects missing permissions", async () => {
        await expect(validateCreateInput({ email: "new@example.com" })).rejects.toMatchObject({
            error: INVALID_INPUT_ERR_CODE,
        });
    });

    it("rejects duplicate permissions", async () => {
        await expect(
            validateCreateInput({
                email: "new@example.com",
                permissions: ["READ_PROJECT", "READ_PROJECT"],
            })
        ).rejects.toMatchObject({ error: INVALID_INPUT_ERR_CODE });
    });

    it("requires a creator once projects are scoped", async () => {
        await expect(
            validateCreateInput({
                email: "new@example.com",
                permissions: ["READ_PROJECT"],
                projects: ["6512f0aa11bb22cc33dd4400"],
            })
        ).rejects.toMatchObject({ error: INVALID_INPUT_ERR_CODE });
    });

    it("accepts scoped projects when a creator is supplied", async () => {
        await expect(
            validateCreateInput({
                email: "new@example.com",
                permissions: ["READ_PROJECT"],
                projects: ["6512f0aa11bb22cc33dd4400"],
                creator: "6512f0aa11bb22cc33dd44ee",
            })
        ).resolves.toBeUndefined();
    });
});

describe("buildUserInvitationSearchQuery", () => {
    it("returns an empty query with no params", () => {
        expect(buildUserInvitationSearchQuery(undefined)).toEqual({});
        expect(buildUserInvitationSearchQuery({})).toEqual({});
    });

    it("searches on the blind index rather than the plaintext email", () => {
        const query = buildUserInvitationSearchQuery({ search: "new@example.com" });
        expect(query).toEqual({
            $or: [{ "hash.email": hashString("new@example.com") }],
        });
        expect(JSON.stringify(query)).not.toContain("new@example.com");
    });

    it("splits a comma-separated permission filter into an $in", () => {
        expect(buildUserInvitationSearchQuery({ permissions: "READ_PROJECT,WRITE_PROJECT" })).toEqual({
            permissions: { $in: ["READ_PROJECT", "WRITE_PROJECT"] },
        });
    });

    it("ignores a non-string permission filter", () => {
        expect(buildUserInvitationSearchQuery({ permissions: ["READ_PROJECT"] })).toEqual({});
    });
});
