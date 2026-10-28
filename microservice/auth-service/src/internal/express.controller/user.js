// @ts-check

const {
    HttpError,
    HttpResponse,
} = require("common/function")

const {
    FORBIDDEN_ERR_CODE,
    NO_ACCESS_ERR_CODE,
    NO_ACCESS_ERR_MESSAGE,
    SUCCESS_ERR_CODE,
    SUCCESS_ERR_MESSAGE,
    INVALID_INPUT_ERR_CODE,
    BROWSER_CLIENT_TYPE,
    USER_TOKEN_COOKIE_NAME,
    REFRESH_TOKEN_COOKIE_NAME,
    CREATE_COOKIE_OPTION,
    CLEAR_COOKIE_OPTION,
    WRITE_USER_USER_ROLE,
    READ_USER_USER_ROLE,

} = require("common/constant");
const { paginateUser, removeUser, handleUserLogin, createUserToken, patchUserPermission, updateUserProfile, patchUserPassword, seedUser } = require("../service/user");
const { createRefreshToken, expireRefreshToken } = require("../service/auth");
const { listUsersProject, listUsersBucket, getUserBucketStats, getUserProjectStats } = require("../../shared/provider/core.service");
const { getUserFromCache } = require("../../shared/cache");
const { canUserDo, getLastLogin } = require("../factory/user");
const {
    isMfaRequired, createMfaToken, readMfaToken, getLoginMfaStep, verifyLoginCode, startMfaSetup, enableMfa, disableMfa,
    regenerateRecoveryCodes, resetUserMfa,
} = require("../service/mfa");

/**
 * Sign the user in: cookies for a browser, the tokens in the body for anything else.
 * @param {*} req
 * @param {*} res
 * @param {*} user
 * @param {object} [extra] - more data for the response, e.g. the recovery codes after a forced setup
 */
const startSession = async (req, res, user, extra) => {
    const refreshToken = await createRefreshToken(user?.id)
    const token = await createUserToken(user, refreshToken)

    let response = {
        error: SUCCESS_ERR_CODE,
        message: SUCCESS_ERR_MESSAGE,
    }

    if (req?.device?.client?.type === BROWSER_CLIENT_TYPE) {
        res.cookie(USER_TOKEN_COOKIE_NAME, token, CREATE_COOKIE_OPTION);
        res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, CREATE_COOKIE_OPTION);
        if (extra) {
            response.data = extra
        }
    } else {
        response.data = {
            ...extra,
            token,
            refreshToken
        }
    }

    HttpResponse(res).json(response);
}

module.exports = {
    /**
     * 
     * @param {*} req 
     * @param {*} res 
     */
    async UserGetMe(req, res) {
        if (!req?.user) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        const user = await getUserFromCache(req?.user?.id)
        const data = user && { ...(user?.toJSON?.() ?? user), mfaEnabled: !!user?.mfaEnabled, mfaRequired: isMfaRequired() }

        HttpResponse(res).json({
            error: SUCCESS_ERR_CODE,
            message: SUCCESS_ERR_MESSAGE,
            data
        });
    },
    /**
     *
     * @param {*} req
     * @param {*} res
     */
    async UserPaginate(req, res) {
        if (!req?.user) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        const canManage = await canUserDo(req?.user?.id, READ_USER_USER_ROLE)
        if (!canManage) {
            throw HttpError(FORBIDDEN_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        const {
            search,
            sortBy,
            limit,
            page,
        } = req?.query ?? {}

        const data = await paginateUser(
            {
                search
            },
            sortBy,
            limit,
            page,
        )

        HttpResponse(res).json({
            error: SUCCESS_ERR_CODE,
            message: SUCCESS_ERR_MESSAGE,
            data,
        });
    },
    /**
     * 
     * @param {*} req 
     * @param {*} res 
     */
    async UserRemove(req, res) {
        if (!req?.user) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        const canManage = await canUserDo(req?.user?.id, WRITE_USER_USER_ROLE)
        if (!canManage) {
            throw HttpError(FORBIDDEN_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        if (req?.params?.id === req?.user?.id) {
            throw HttpError(INVALID_INPUT_ERR_CODE, `You cant remove yourself`)
        }

        await removeUser(req?.params?.id)

        HttpResponse(res).json({
            error: SUCCESS_ERR_CODE,
            message: SUCCESS_ERR_MESSAGE,
        });
    },
    /**
     * 
     * @param {*} req 
     * @param {*} res 
     */
    async UserUpdate(req, res) {
        if (!req?.user) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        const canManage = await canUserDo(req?.user?.id, WRITE_USER_USER_ROLE)
        if (!canManage) {
            throw HttpError(FORBIDDEN_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        if (req?.params?.id === req?.user?.id) {
            throw HttpError(INVALID_INPUT_ERR_CODE, `You cant remove yourself`)
        }

        await patchUserPermission(req?.params?.id, req?.body?.permissions)

        HttpResponse(res).json({
            error: SUCCESS_ERR_CODE,
            message: SUCCESS_ERR_MESSAGE,
        });
    },
    /**
     * 
     * @param {*} req 
     * @param {*} res 
     */
    async UserLogin(req, res) {

        const lastLogin = getLastLogin(req)
        const user = await handleUserLogin({
            ...req?.body,
            lastLogin
        })

        if (!user) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE);
        }

        // with 2FA on (or required but not set up yet) the password alone gives no session
        const step = await getLoginMfaStep(user?.id)
        if (step) {
            HttpResponse(res).json({
                error: SUCCESS_ERR_CODE,
                message: SUCCESS_ERR_MESSAGE,
                data: {
                    mfaToken: createMfaToken(user?.id),
                    ...(step === "VERIFY" ? { mfaRequired: true } : { mfaSetupRequired: true }),
                },
            });
            return
        }

        await startSession(req, res, user)
    },
    /**
     * Login step two. Body: { mfaToken, code } where code is from the authenticator app or a recovery code.
     * @param {*} req
     * @param {*} res
     */
    async UserLoginMfa(req, res) {
        const userId = await verifyLoginCode(req?.body?.mfaToken, req?.body?.code)

        const user = await getUserFromCache(userId)
        if (!user) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE);
        }

        await startSession(req, res, user)
    },
    /**
     * Forced setup during login (MFA_REQUIRED). Body: { mfaToken }. Returns { secret, otpauthUrl, qrCode }.
     * @param {*} req
     * @param {*} res
     */
    async UserLoginMfaSetup(req, res) {
        const userId = readMfaToken(req?.body?.mfaToken)

        HttpResponse(res).json({
            error: SUCCESS_ERR_CODE,
            message: SUCCESS_ERR_MESSAGE,
            data: await startMfaSetup(userId),
        });
    },
    /**
     * Finish the forced setup and sign in. Body: { mfaToken, code }. Returns the recovery codes.
     * @param {*} req
     * @param {*} res
     */
    async UserLoginMfaEnable(req, res) {
        const userId = readMfaToken(req?.body?.mfaToken)
        const data = await enableMfa(userId, req?.body?.code)

        const user = await getUserFromCache(userId)
        if (!user) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE);
        }

        await startSession(req, res, user, data)
    },
    /**
     * Turn 2FA on from the profile: returns { secret, otpauthUrl, qrCode }.
     * @param {*} req
     * @param {*} res
     */
    async UserMfaSetup(req, res) {
        if (!req?.user) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        HttpResponse(res).json({
            error: SUCCESS_ERR_CODE,
            message: SUCCESS_ERR_MESSAGE,
            data: await startMfaSetup(req.user.id),
        });
    },
    /**
     * Body: { code }. Returns the recovery codes, shown only once.
     * @param {*} req
     * @param {*} res
     */
    async UserMfaEnable(req, res) {
        if (!req?.user) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        HttpResponse(res).json({
            error: SUCCESS_ERR_CODE,
            message: SUCCESS_ERR_MESSAGE,
            data: await enableMfa(req.user.id, req?.body?.code),
        });
    },
    /**
     * Body: { code }. Refused while the installation requires 2FA.
     * @param {*} req
     * @param {*} res
     */
    async UserMfaDisable(req, res) {
        if (!req?.user) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        await disableMfa(req.user.id, req?.body?.code)

        HttpResponse(res).json({
            error: SUCCESS_ERR_CODE,
            message: SUCCESS_ERR_MESSAGE,
        });
    },
    /**
     * Body: { code }. Returns new recovery codes; the old ones stop working.
     * @param {*} req
     * @param {*} res
     */
    async UserMfaRecoveryCodes(req, res) {
        if (!req?.user) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        HttpResponse(res).json({
            error: SUCCESS_ERR_CODE,
            message: SUCCESS_ERR_MESSAGE,
            data: await regenerateRecoveryCodes(req.user.id, req?.body?.code),
        });
    },
    /**
     * Clear another user's 2FA (lost phone and recovery codes). Needs WRITE_USER.
     * @param {*} req
     * @param {*} res
     */
    async UserMfaReset(req, res) {
        if (!req?.user) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        const canManage = await canUserDo(req?.user?.id, WRITE_USER_USER_ROLE)
        if (!canManage) {
            throw HttpError(FORBIDDEN_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        if (req?.params?.id === req?.user?.id) {
            throw HttpError(FORBIDDEN_ERR_CODE, `Turn your own two-factor authentication off from your profile`)
        }

        await resetUserMfa(req?.params?.id, req.user.id)

        HttpResponse(res).json({
            error: SUCCESS_ERR_CODE,
            message: SUCCESS_ERR_MESSAGE,
        });
    },
    /**
     * 
     * @param {*} req 
     * @param {*} res 
     */
    async UserLogout(req, res) {
        if (req?.user?.refreshToken) {
            await expireRefreshToken(req?.user?.refreshToken)
        }

        res.clearCookie(USER_TOKEN_COOKIE_NAME, CLEAR_COOKIE_OPTION);
        res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, CLEAR_COOKIE_OPTION);

        HttpResponse(res).json({
            error: SUCCESS_ERR_CODE,
            message: SUCCESS_ERR_MESSAGE,
        });
    },
    /**
     * 
     * @param {*} req 
     * @param {*} res 
     */
    async UserGetMyProjectStats(req, res) {
        if (!req?.user) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        const data = await getUserProjectStats(req?.user?.id)

        HttpResponse(res).json({
            error: SUCCESS_ERR_CODE,
            message: SUCCESS_ERR_MESSAGE,
            data
        });
    },
    /**
     * 
     * @param {*} req 
     * @param {*} res 
     */
    async UserGetMyBucketStats(req, res) {
        if (!req?.user) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        const data = await getUserBucketStats(req?.user?.id)

        HttpResponse(res).json({
            error: SUCCESS_ERR_CODE,
            message: SUCCESS_ERR_MESSAGE,
            data
        });
    },

    /**
     * 
     * @param {*} req 
     * @param {*} res 
     */
    async UserListProject(req, res) {
        if (!req?.user) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        const data = await listUsersProject(req?.user?.id)

        HttpResponse(res).json({
            error: SUCCESS_ERR_CODE,
            message: SUCCESS_ERR_MESSAGE,
            data
        });
    },
    /**
     * 
     * @param {*} req 
     * @param {*} res 
     */
    async UserListBucket(req, res) {
        if (!req?.user) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        const data = await listUsersBucket(req?.user?.id)

        HttpResponse(res).json({
            error: SUCCESS_ERR_CODE,
            message: SUCCESS_ERR_MESSAGE,
            data
        });
    },

    /**
     * 
     * @param {*} req 
     * @param {*} res 
     */
    async UserUpdateProfile(req, res) {
        if (!req?.user) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        await updateUserProfile(req?.user?.id, req?.body)

        HttpResponse(res).json({
            error: SUCCESS_ERR_CODE,
            message: SUCCESS_ERR_MESSAGE,
        });
    },
    /**
     * 
     * @param {*} req 
     * @param {*} res 
     */
    async UserPatchPassword(req, res) {
        if (!req?.user) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        await patchUserPassword(req?.user?.id, req?.body)

        HttpResponse(res).json({
            error: SUCCESS_ERR_CODE,
            message: SUCCESS_ERR_MESSAGE,
        });
    },
    /**
     * 
     * @param {*} req 
     * @param {*} res 
     */
    async UserSeed(req, res) {

        await seedUser(req?.body)

        HttpResponse(res).json({
            error: SUCCESS_ERR_CODE,
            message: SUCCESS_ERR_MESSAGE,
        });
    },
};
