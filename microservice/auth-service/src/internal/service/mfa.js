//@ts-check

const crypto = require("crypto")
const jwt = require("jsonwebtoken")
const QRCode = require("qrcode")
const { authenticator } = require("otplib")
const { HttpError, hashString, encrypt, decrypt, decryptSecret } = require("common/function")
const {
    INVALID_INPUT_ERR_CODE,
    NO_ACCESS_ERR_CODE,
    NOT_FOUND_ERR_CODE,
    NOT_FOUND_ERR_MESSAGE,
    EMAIL_PASSWORD_LOGIN_TYPE,
    MFA_TOKEN_PURPOSE,
} = require("common/constant")
const { UserLogins, Users } = require("../model")
const { mongoose, isValidObjectId } = require("../../shared/mongoose")
const { updateUserCache } = require("../../shared/cache")
const { logger: Log } = require("../../shared/logger")

const { ObjectId } = mongoose.Types

const USER_AUTHENTICATION_JWT_SECRET = decryptSecret(process?.env?.ENC_USER_AUTHENTICATION_JWT_SECRET)

// The middleware accepts any token signed with the session secret as a session, so the token between the
// password and the code is signed with a key derived from it: it can never be used as a session.
const MFA_TOKEN_SECRET = crypto.createHmac("sha256", USER_AUTHENTICATION_JWT_SECRET || "").update(MFA_TOKEN_PURPOSE).digest("hex")

const ISSUER = "Logstyx"
// the code step after the password, and the forced setup, must finish within this
const MFA_TOKEN_TTL_SECONDS = 10 * 60
const RECOVERY_CODE_COUNT = 10
const MAX_FAILED_ATTEMPTS = 5
const LOCK_MINUTES = 15
const TOTP_STEP_SECONDS = 30

// accept the previous and next 30 second code too, for clock drift
authenticator.options = { window: 1, step: TOTP_STEP_SECONDS }

/**
 * Every user must use two-factor authentication when the installer set MFA_REQUIRED=true.
 */
const isMfaRequired = () => process?.env?.MFA_REQUIRED === "true"

/**
 * Read from the database, not the cache: the cache is updated through the queue and may lag behind a change.
 * @param {string} userId
 */
const findUser = async (userId) => {
    if (!isValidObjectId(userId)) {
        return null
    }
    return Users.findById(userId)
}

/**
 * @param {string} userId
 */
const findEmailLogin = async (userId) => {
    if (!isValidObjectId(userId)) {
        return null
    }
    return UserLogins.findOne({ user: new ObjectId(userId), type: EMAIL_PASSWORD_LOGIN_TYPE })
}

/**
 * Token for the step between the password and the 2FA code (or the forced setup). Not a session.
 * @param {string} userId
 */
const createMfaToken = (userId) => jwt.sign(
    { id: userId, purpose: MFA_TOKEN_PURPOSE },
    MFA_TOKEN_SECRET,
    { expiresIn: MFA_TOKEN_TTL_SECONDS }
)

/**
 * @param {*} token
 * @returns {string} user id
 */
const readMfaToken = (token) => {
    try {
        const decoded = jwt.verify(typeof token === "string" ? token : "", MFA_TOKEN_SECRET)
        if (typeof decoded === "object" && decoded?.purpose === MFA_TOKEN_PURPOSE && isValidObjectId(decoded?.id)) {
            return decoded.id
        }
    } catch {
        // expired or tampered
    }
    throw HttpError(NO_ACCESS_ERR_CODE, `Your sign in expired. Please sign in again.`)
}

/**
 * What the login has to do after a correct password.
 * @param {string} userId
 * @returns {Promise<"VERIFY"|"SETUP"|null>} VERIFY: ask for a code, SETUP: must turn 2FA on first, null: no 2FA step
 */
const getLoginMfaStep = async (userId) => {
    const user = await findUser(userId)
    if (user?.mfaEnabled) {
        return "VERIFY"
    }
    return isMfaRequired() ? "SETUP" : null
}

/**
 * @param {*} mfa - userLogin.mfa
 * @param {"secret"|"pendingSecret"} key
 */
const readSecret = (mfa, key) => (typeof mfa?.[key] === "string" && mfa[key] ? decrypt(mfa[key]) : null)

const newRecoveryCodes = () => Array.from({ length: RECOVERY_CODE_COUNT }, () => {
    const raw = crypto.randomBytes(5).toString("hex")
    return `${raw.slice(0, 5)}-${raw.slice(5)}`
})

/**
 * @param {string} code
 */
const normalizeRecoveryCode = (code) => code.toLowerCase().replace(/[^0-9a-f]/g, "")

/**
 * Check a 6 digit code from the app, or a recovery code (used up). Counts failures and locks the login
 * for a while after too many, so the 6 digits cannot be guessed.
 * @param {*} login - userLogin with mfa enabled
 * @param {*} code
 */
const verifyCode = async (login, code) => {
    const mfa = login?.mfa ?? {}

    if (mfa.lockedUntil && new Date(mfa.lockedUntil).getTime() > Date.now()) {
        throw HttpError(INVALID_INPUT_ERR_CODE, `Too many wrong codes. Try again in ${LOCK_MINUTES} minutes.`)
    }

    const input = typeof code === "string" ? code.trim() : ""
    const digits = input.replace(/\s/g, "")
    const secret = readSecret(mfa, "secret")

    /** @type {Record<string, any> | null} */
    let success = null

    if (secret && /^\d{6}$/.test(digits)) {
        const delta = authenticator.checkDelta(digits, secret)
        if (delta !== null) {
            // a code works once: refuse the same (or an older) 30 second step again
            const step = Math.floor(Date.now() / 1000 / TOTP_STEP_SECONDS) + delta
            if (!mfa.lastStep || step > mfa.lastStep) {
                success = { "mfa.lastStep": step }
            }
        }
    } else if (input) {
        const hashed = hashString(normalizeRecoveryCode(input))
        const codes = mfa.recoveryCodes ?? []
        if (codes.includes(hashed)) {
            success = { "mfa.recoveryCodes": codes.filter((n) => n !== hashed) }
        }
    }

    if (success) {
        await UserLogins.findByIdAndUpdate(login.id, { $set: { ...success, "mfa.failedAttempts": 0 }, $unset: { "mfa.lockedUntil": 1 } })
        return true
    }

    const failedAttempts = (mfa.failedAttempts ?? 0) + 1
    const locked = failedAttempts >= MAX_FAILED_ATTEMPTS
    await UserLogins.findByIdAndUpdate(login.id, {
        $set: locked
            ? { "mfa.failedAttempts": 0, "mfa.lockedUntil": new Date(Date.now() + LOCK_MINUTES * 60 * 1000) }
            : { "mfa.failedAttempts": failedAttempts },
    })

    throw HttpError(INVALID_INPUT_ERR_CODE, locked
        ? `Too many wrong codes. Try again in ${LOCK_MINUTES} minutes.`
        : `Wrong code. Check your authenticator app and try again.`)
}

/**
 * Step two of the login. Returns the user id to start the session for.
 * @param {*} mfaToken
 * @param {*} code
 */
const verifyLoginCode = async (mfaToken, code) => {
    const userId = readMfaToken(mfaToken)
    const user = await findUser(userId)
    const login = await findEmailLogin(userId)
    if (!user || !login || !user.mfaEnabled) {
        throw HttpError(NO_ACCESS_ERR_CODE, `Your sign in expired. Please sign in again.`)
    }

    await verifyCode(login, code)
    return userId
}

/**
 * Start turning 2FA on: a new secret, kept as pending until a code from the app confirms it.
 * @param {string} userId
 */
const startMfaSetup = async (userId) => {
    const user = await findUser(userId)
    const login = await findEmailLogin(userId)
    if (!user || !login) {
        throw HttpError(NOT_FOUND_ERR_CODE, NOT_FOUND_ERR_MESSAGE)
    }
    if (user.mfaEnabled) {
        throw HttpError(INVALID_INPUT_ERR_CODE, `Two-factor authentication is already on`)
    }

    const secret = authenticator.generateSecret()
    await UserLogins.findByIdAndUpdate(login.id, { $set: { "mfa.pendingSecret": encrypt(secret) } })

    const otpauthUrl = authenticator.keyuri(user.email || user.fullname, ISSUER, secret)
    return {
        secret,
        otpauthUrl,
        qrCode: await QRCode.toDataURL(otpauthUrl, { margin: 1, width: 220 }),
    }
}

/**
 * @param {string} userId
 * @param {boolean} enabled
 */
const setUserMfaEnabled = async (userId, enabled) => {
    await Users.findByIdAndUpdate(userId, { $set: { mfaEnabled: enabled } })
    await updateUserCache(userId).catch((e) => Log?.error?.(e))
}

/**
 * Finish turning 2FA on with the first code from the app. Returns the recovery codes, shown only this once.
 * @param {string} userId
 * @param {*} code
 */
const enableMfa = async (userId, code) => {
    const user = await findUser(userId)
    const login = await findEmailLogin(userId)
    if (!user || !login) {
        throw HttpError(NOT_FOUND_ERR_CODE, NOT_FOUND_ERR_MESSAGE)
    }
    if (user.mfaEnabled) {
        throw HttpError(INVALID_INPUT_ERR_CODE, `Two-factor authentication is already on`)
    }

    const pending = readSecret(login.mfa, "pendingSecret")
    const digits = typeof code === "string" ? code.replace(/\s/g, "") : ""
    if (!pending) {
        throw HttpError(INVALID_INPUT_ERR_CODE, `Start the setup again`)
    }
    const delta = /^\d{6}$/.test(digits) ? authenticator.checkDelta(digits, pending) : null
    if (delta === null) {
        throw HttpError(INVALID_INPUT_ERR_CODE, `Wrong code. Check your authenticator app and try again.`)
    }

    const recoveryCodes = newRecoveryCodes()
    await UserLogins.findByIdAndUpdate(login.id, {
        $set: {
            mfa: {
                secret: encrypt(pending),
                recoveryCodes: recoveryCodes.map((n) => hashString(normalizeRecoveryCode(n))),
                lastStep: Math.floor(Date.now() / 1000 / TOTP_STEP_SECONDS) + delta,
                failedAttempts: 0,
                enabledAt: new Date(),
            },
        },
    })
    await setUserMfaEnabled(userId, true)

    return { recoveryCodes }
}

/**
 * Turn 2FA off with a current code. Not allowed while the installation requires it.
 * @param {string} userId
 * @param {*} code
 */
const disableMfa = async (userId, code) => {
    const user = await findUser(userId)
    const login = await findEmailLogin(userId)
    if (!user || !login || !user.mfaEnabled) {
        throw HttpError(INVALID_INPUT_ERR_CODE, `Two-factor authentication is not on`)
    }
    if (isMfaRequired()) {
        throw HttpError(INVALID_INPUT_ERR_CODE, `Two-factor authentication is required on this installation`)
    }

    await verifyCode(login, code)
    await UserLogins.findByIdAndUpdate(login.id, { $unset: { mfa: 1 } })
    await setUserMfaEnabled(userId, false)
    return null
}

/**
 * New recovery codes with a current code; the old ones stop working.
 * @param {string} userId
 * @param {*} code
 */
const regenerateRecoveryCodes = async (userId, code) => {
    const user = await findUser(userId)
    const login = await findEmailLogin(userId)
    if (!user || !login || !user.mfaEnabled) {
        throw HttpError(INVALID_INPUT_ERR_CODE, `Two-factor authentication is not on`)
    }

    await verifyCode(login, code)
    const recoveryCodes = newRecoveryCodes()
    await UserLogins.findByIdAndUpdate(login.id, {
        $set: { "mfa.recoveryCodes": recoveryCodes.map((n) => hashString(normalizeRecoveryCode(n))) },
    })
    return { recoveryCodes }
}

/**
 * An admin clears another user's 2FA (lost phone and recovery codes). When 2FA is required the user
 * sets it up again at the next sign in.
 * @param {string} userId
 * @param {string} actorId
 */
const resetUserMfa = async (userId, actorId) => {
    const user = await findUser(userId)
    if (!user) {
        throw HttpError(NOT_FOUND_ERR_CODE, NOT_FOUND_ERR_MESSAGE)
    }

    const login = await findEmailLogin(userId)
    if (login) {
        await UserLogins.findByIdAndUpdate(login.id, { $unset: { mfa: 1 } })
    }
    await setUserMfaEnabled(userId, false)

    Log?.warn?.({
        title: "Two-factor authentication reset",
        message: `User ${actorId} reset two-factor authentication of user ${userId}`,
        context: { user: userId, actor: actorId },
    })
    return null
}

module.exports = {
    isMfaRequired,
    createMfaToken,
    readMfaToken,
    getLoginMfaStep,
    verifyLoginCode,
    startMfaSetup,
    enableMfa,
    disableMfa,
    regenerateRecoveryCodes,
    resetUserMfa,
}
