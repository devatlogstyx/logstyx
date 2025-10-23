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

} = require("common/constant");
const { createProject, canUserModifyProject, removeProject, paginateProject, addUserToProject, removeUserFromProject, listUserFromProject, updateProject } = require("../service/project");

module.exports = {

    /**
     * 
     * @param {*} req 
     * @param {*} res 
     */
    async ProjectCreate(req, res) {
        if (!req?.user) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        const data = await createProject({
            ...req?.body,
            creator: req?.user?.id
        })

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
    async ProjectUpdate(req, res) {
        if (!req?.user) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        const canAccess = await canUserModifyProject(req?.user?.id, req?.params?.id)
        if (!canAccess) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        const data = await updateProject(req?.params?.id, req?.body)

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
    async ProjectRemove(req, res) {
        if (!req?.user) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        const canAccess = await canUserModifyProject(req?.user?.id, req?.params?.id)
        if (!canAccess) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        await removeProject(req?.params?.id)

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
    async ProjectPaginate(req, res) {
        if (!req?.user) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        const {
            search,
            sortBy,
            limit,
            page
        } = req?.query ?? {}

        const data = await paginateProject({ search, user: req?.user?.id }, sortBy, limit, page)

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
    async ProjectAddUser(req, res) {
        if (!req?.user) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        const canAccess = await canUserModifyProject(req?.user?.id, req?.params?.id)
        if (!canAccess) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        const data = await addUserToProject(req?.params?.userId, req?.params?.id)

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
    async ProjectRemoveUser(req, res) {
        if (!req?.user) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        const canAccess = await canUserModifyProject(req?.user?.id, req?.params?.id)
        if (!canAccess) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        await removeUserFromProject(req?.params?.userId, req?.params?.id)

        HttpResponse(res).json({
            error: SUCCESS_ERR_CODE,
            message: SUCCESS_ERR_MESSAGE,
        });
    },
    async ProjectListUser(req, res) {
        if (!req?.user) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        const canAccess = await canUserModifyProject(req?.user?.id, req?.params?.id)
        if (!canAccess) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        const data = await listUserFromProject(req?.params?.id)

        HttpResponse(res).json({
            error: SUCCESS_ERR_CODE,
            message: SUCCESS_ERR_MESSAGE,
            data
        });
    },
};
