//@ts-check

const { NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE, WRITE_ALERT_USER_ROLE, FORBIDDEN_ERR_CODE, SUCCESS_ERR_CODE, SUCCESS_ERR_MESSAGE, READ_ALERT_USER_ROLE } = require("common/constant")
const { HttpError, HttpResponse } = require("common/function")
const { canUserDo } = require("../../shared/provider/auth.service")
const { createAlert, updateAlert, findAlertById, removeAlert, paginateAlert } = require("../service/alert")


module.exports = {
    /**
     * 
     * @param {*} req 
     * @param {*} res 
     */
    async AlertCreate(req, res) {
        if (!req?.user) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        const canDo = await canUserDo(req?.user?.id, WRITE_ALERT_USER_ROLE)
        if (!canDo) {
            throw HttpError(FORBIDDEN_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        const data = await createAlert(req?.body)

        HttpResponse(res).json({
            error: SUCCESS_ERR_CODE,
            message: SUCCESS_ERR_MESSAGE,
            data
        })
    },
    /**
     * 
     * @param {*} req 
     * @param {*} res 
     */
    async AlertUpdate(req, res) {
        if (!req?.user) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        const canDo = await canUserDo(req?.user?.id, WRITE_ALERT_USER_ROLE)
        if (!canDo) {
            throw HttpError(FORBIDDEN_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        const data = await updateAlert(req?.params?.id, req?.body)

        HttpResponse(res).json({
            error: SUCCESS_ERR_CODE,
            message: SUCCESS_ERR_MESSAGE,
            data
        })
    },
    /**
     * 
     * @param {*} req 
     * @param {*} res 
     */
    async AlertGet(req, res) {
        if (!req?.user) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        const canDo = await canUserDo(req?.user?.id, READ_ALERT_USER_ROLE)
        if (!canDo) {
            throw HttpError(FORBIDDEN_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        const data = await findAlertById(req?.params?.id)

        HttpResponse(res).json({
            error: SUCCESS_ERR_CODE,
            message: SUCCESS_ERR_MESSAGE,
            data
        })
    },
    /**
     * 
     * @param {*} req 
     * @param {*} res 
     */
    async AlertRemove(req, res) {
        if (!req?.user) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        const canDo = await canUserDo(req?.user?.id, WRITE_ALERT_USER_ROLE)
        if (!canDo) {
            throw HttpError(FORBIDDEN_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        await removeAlert(req?.params?.id)

        HttpResponse(res).json({
            error: SUCCESS_ERR_CODE,
            message: SUCCESS_ERR_MESSAGE,
        })
    },
    /**
     * 
     * @param {*} req 
     * @param {*} res 
     */
    async AlertPaginate(req, res) {
        if (!req?.user) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        const canDo = await canUserDo(req?.user?.id, READ_ALERT_USER_ROLE)
        if (!canDo) {
            throw HttpError(FORBIDDEN_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        const {
            search,
            sortBy,
            limit,
            page
        } = req?.query ?? {}

        const data = await paginateAlert({ search }, sortBy, limit, page)

        HttpResponse(res).json({
            error: SUCCESS_ERR_CODE,
            message: SUCCESS_ERR_MESSAGE,
            data
        })
    }
}