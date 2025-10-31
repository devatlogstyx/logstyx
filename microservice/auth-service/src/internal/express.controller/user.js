// @ts-check

const {
    HttpError,
    HttpResponse,
} = require("common/function")

const {
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

} = require("common/constant");
const { paginateUser, removeUser, handleUserLogin, createUserToken } = require("../service/user");
const { createRefreshToken, expireRefreshToken } = require("../service/auth");
const { getUserDashboardProjectStats } = require("../../shared/provider/core.service");

module.exports = {

    async UserGetMe(req, res) {
        if (!req?.user) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        HttpResponse(res).json({
            error: SUCCESS_ERR_CODE,
            message: SUCCESS_ERR_MESSAGE,
            data: req?.user,
        });
    },
    async UserPaginate(req, res) {
        if (!req?.user) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        const {
            search,
            sortBy,
            limit,
            page,
            expand
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
    async UserRemove(req, res) {
        if (!req?.user) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        await removeUser(req?.params?.id)

        HttpResponse(res).json({
            error: SUCCESS_ERR_CODE,
            message: SUCCESS_ERR_MESSAGE,
        });
    },

    async UserLogin(req, res) {

        const user = await handleUserLogin(req?.body)
        if (!user) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE);
        }

        let refreshToken = await createRefreshToken(user?.id)
        const token = await createUserToken(user, refreshToken)

        let response = {
            error: SUCCESS_ERR_CODE,
            message: SUCCESS_ERR_MESSAGE,
        }

        if (req?.device?.client?.type === BROWSER_CLIENT_TYPE) {
            res.cookie(USER_TOKEN_COOKIE_NAME, token, CREATE_COOKIE_OPTION);
            res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, CREATE_COOKIE_OPTION);
        } else {
            response.data = {
                token,
                refreshToken
            }
        }

        HttpResponse(res).json(response);
    },
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
    async UserGetMyDashboardProjectStats(req, res) {
        if (!req?.user) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        const data = await getUserDashboardProjectStats(req?.user?.id)

        HttpResponse(res).json({
            error: SUCCESS_ERR_CODE,
            message: SUCCESS_ERR_MESSAGE,
            data
        });
    },
};
