// The models and cache talk to MongoDB and the cache service; the tests only need what the service writes.
jest.mock("../internal/model", () => ({
    Users: { findById: jest.fn(), findByIdAndUpdate: jest.fn() },
    UserLogins: { findOne: jest.fn(), findByIdAndUpdate: jest.fn() },
}));

jest.mock("../shared/cache", () => ({
    updateUserCache: jest.fn(() => Promise.resolve()),
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

const { useCryptoEnv, sealSecret } = require("./helper/crypto-env");

// mfa.js reads the JWT secret when it loads
useCryptoEnv();
const JWT_SECRET = "jwt-secret-for-tests";
process.env.ENC_USER_AUTHENTICATION_JWT_SECRET = sealSecret(JWT_SECRET);

const jwt = require("jsonwebtoken");
const { authenticator } = require("otplib");
const { encrypt, decrypt, hashString } = require("common/function");
const { Users, UserLogins } = require("../internal/model");
const mfa = require("../internal/service/mfa");

const USER_ID = "6512f0aa11bb22cc33dd44ee";
const LOGIN_ID = "6512f0aa11bb22cc33dd44ff";

beforeEach(() => {
    useCryptoEnv();
    delete process.env.MFA_REQUIRED;
    jest.clearAllMocks();
});

const loginWith = (fields) => ({ id: LOGIN_ID, mfa: fields })

describe("mfa token", () => {
    it("round-trips the user id", () => {
        expect(mfa.readMfaToken(mfa.createMfaToken(USER_ID))).toBe(USER_ID);
    });

    it("is not a session token", () => {
        expect(() => jwt.verify(mfa.createMfaToken(USER_ID), JWT_SECRET)).toThrow();
    });

    it("does not accept a session token", () => {
        const session = jwt.sign({ id: USER_ID }, JWT_SECRET);
        expect(() => mfa.readMfaToken(session)).toThrow(/sign in again/);
    });
});

describe("getLoginMfaStep", () => {
    it("asks for a code when 2FA is on", async () => {
        Users.findById.mockResolvedValue({ mfaEnabled: true });
        await expect(mfa.getLoginMfaStep(USER_ID)).resolves.toBe("VERIFY");
    });

    it("needs no step when 2FA is off and not required", async () => {
        Users.findById.mockResolvedValue({ mfaEnabled: false });
        await expect(mfa.getLoginMfaStep(USER_ID)).resolves.toBeNull();
    });

    it("forces the setup when MFA_REQUIRED=true", async () => {
        process.env.MFA_REQUIRED = "true";
        Users.findById.mockResolvedValue({ mfaEnabled: false });
        await expect(mfa.getLoginMfaStep(USER_ID)).resolves.toBe("SETUP");
    });
});

describe("enableMfa", () => {
    it("confirms the pending secret and returns recovery codes", async () => {
        const secret = authenticator.generateSecret();
        Users.findById.mockResolvedValue({ mfaEnabled: false });
        UserLogins.findOne.mockResolvedValue(loginWith({ pendingSecret: encrypt(secret) }));

        const { recoveryCodes } = await mfa.enableMfa(USER_ID, authenticator.generate(secret));

        expect(recoveryCodes).toHaveLength(10);
        const saved = UserLogins.findByIdAndUpdate.mock.calls[0][1].$set.mfa;
        expect(decrypt(saved.secret)).toBe(secret);
        expect(saved.recoveryCodes).not.toContain(recoveryCodes[0]);
        expect(Users.findByIdAndUpdate).toHaveBeenCalledWith(USER_ID, { $set: { mfaEnabled: true } });
    });

    it("refuses a wrong code", async () => {
        Users.findById.mockResolvedValue({ mfaEnabled: false });
        UserLogins.findOne.mockResolvedValue(loginWith({ pendingSecret: encrypt(authenticator.generateSecret()) }));

        await expect(mfa.enableMfa(USER_ID, "000000")).rejects.toThrow(/Wrong code/);
        expect(Users.findByIdAndUpdate).not.toHaveBeenCalled();
    });
});

describe("verifyLoginCode", () => {
    const token = () => mfa.createMfaToken(USER_ID);

    beforeEach(() => {
        Users.findById.mockResolvedValue({ mfaEnabled: true });
    });

    it("accepts a current app code once", async () => {
        const secret = authenticator.generateSecret();
        const code = authenticator.generate(secret);
        UserLogins.findOne.mockResolvedValue(loginWith({ secret: encrypt(secret) }));

        await expect(mfa.verifyLoginCode(token(), code)).resolves.toBe(USER_ID);

        // the same code again, now that its step is recorded
        const lastStep = UserLogins.findByIdAndUpdate.mock.calls[0][1].$set["mfa.lastStep"];
        UserLogins.findOne.mockResolvedValue(loginWith({ secret: encrypt(secret), lastStep }));
        await expect(mfa.verifyLoginCode(token(), code)).rejects.toThrow(/Wrong code/);
    });

    it("uses up a recovery code", async () => {
        const hashed = hashString("abcde12345");
        UserLogins.findOne.mockResolvedValue(loginWith({ secret: encrypt(authenticator.generateSecret()), recoveryCodes: [hashed, "other"] }));

        await expect(mfa.verifyLoginCode(token(), "ABCDE-12345")).resolves.toBe(USER_ID);
        expect(UserLogins.findByIdAndUpdate.mock.calls[0][1].$set["mfa.recoveryCodes"]).toEqual(["other"]);
    });

    it("locks after too many wrong codes", async () => {
        UserLogins.findOne.mockResolvedValue(loginWith({ secret: encrypt(authenticator.generateSecret()), failedAttempts: 4 }));

        await expect(mfa.verifyLoginCode(token(), "000000")).rejects.toThrow(/Too many wrong codes/);
        expect(UserLogins.findByIdAndUpdate.mock.calls[0][1].$set["mfa.lockedUntil"]).toBeInstanceOf(Date);
    });

    it("refuses while locked, even with a right code", async () => {
        const secret = authenticator.generateSecret();
        UserLogins.findOne.mockResolvedValue(loginWith({ secret: encrypt(secret), lockedUntil: new Date(Date.now() + 60000) }));

        await expect(mfa.verifyLoginCode(token(), authenticator.generate(secret))).rejects.toThrow(/Too many wrong codes/);
    });
});

describe("disableMfa", () => {
    it("is refused while MFA_REQUIRED=true", async () => {
        process.env.MFA_REQUIRED = "true";
        Users.findById.mockResolvedValue({ mfaEnabled: true });
        UserLogins.findOne.mockResolvedValue(loginWith({ secret: encrypt(authenticator.generateSecret()) }));

        await expect(mfa.disableMfa(USER_ID, "123456")).rejects.toThrow(/required/);
    });
});
