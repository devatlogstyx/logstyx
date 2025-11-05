//@ts-check

const { NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE, WRITE_USER_INVITATION_USER_ROLE, SUCCESS_ERR_CODE, SUCCESS_ERR_MESSAGE, READ_USER_INVITATION_USER_ROLE } = require("common/constant")
const { HttpError, HttpResponse } = require("common/function")
const { CanUserDo } = require("../utils/helper")
const { createUserInvitation, paginateUserInvitation, removeUserInvitation, updateUserInvitation, validateUserInvitation } = require("../service/user.invitation")

module.exports = {
    /**
     * 
     * @param {*} req 
     * @param {*} res 
     */
    async UserInvitationCreate(req, res) {
        if (!req?.user) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        const canManage = await CanUserDo(req?.user?.id, WRITE_USER_INVITATION_USER_ROLE)
        if (!canManage) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        const data = await createUserInvitation({
            ...req?.body,
            creator: req?.user?.id
        })
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
    async UserInvitationPaginate(req, res) {
        if (!req?.user) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        const canManage = await CanUserDo(req?.user?.id, READ_USER_INVITATION_USER_ROLE)
        if (!canManage) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        const {
            search,
            permissions,
            sortBy,
            limit,
            page
        } = req?.query ?? {}


        const data = await paginateUserInvitation({
            search,
            permissions
        }, sortBy, limit, page)

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
    async UserInvitationUpdate(req, res) {
        if (!req?.user) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        const canManage = await CanUserDo(req?.user?.id, WRITE_USER_INVITATION_USER_ROLE)
        if (!canManage) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        const data = await updateUserInvitation(req?.params?.id, {
            ...req?.body,
            creator: req?.user?.id
        })
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
    async UserInvitationRemove(req, res) {
        if (!req?.user) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        const canManage = await CanUserDo(req?.user?.id, WRITE_USER_INVITATION_USER_ROLE)
        if (!canManage) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        await removeUserInvitation(req?.params?.id)
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
    async UserInvitationValidate(req, res) {

        await validateUserInvitation(req?.params?.id, req?.body)

        HttpResponse(res).json({
            error: SUCCESS_ERR_CODE,
            message: SUCCESS_ERR_MESSAGE,
        })
    },

}