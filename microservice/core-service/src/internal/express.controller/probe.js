//@ts-check

const { NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE, SUCCESS_ERR_CODE, SUCCESS_ERR_MESSAGE, FORBIDDEN_ERR_CODE, NOT_FOUND_ERR_CODE, NOT_FOUND_ERR_MESSAGE } = require("common/constant");
const { HttpError, HttpResponse } = require("common/function");
const { createProbe, findProbeById, updateProbe, removeProbe, paginateProbe } = require("../service/probe");
const { canUserAccessProject } = require("../utils/helper");

module.exports = {
    /**
     * 
     * @param {*} req 
     * @param {*} res 
     */
    async ProbeCreate(req, res) {
        if (!req?.user) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        const canAccessProject = await canUserAccessProject(req?.user?.id, req?.body?.project)
        if (!canAccessProject) {
            throw HttpError(FORBIDDEN_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        const data = await createProbe(req?.body)

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
    async ProbeGet(req, res) {
        if (!req?.user) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }


        const data = await findProbeById(req?.params?.id)

        const canAccessProject = await canUserAccessProject(req?.user?.id, req?.params?.id)
        if (!canAccessProject) {
            throw HttpError(FORBIDDEN_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

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
    async ProbeUpdate(req, res) {
        if (!req?.user) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        const probe = await findProbeById(req?.params?.id)
        if (!probe) {
            throw HttpError(NOT_FOUND_ERR_CODE, NOT_FOUND_ERR_MESSAGE)
        }

        const canAccessProject = await canUserAccessProject(req?.user?.id, probe?.project?.toString())
        if (!canAccessProject) {
            throw HttpError(FORBIDDEN_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }


        const data = await updateProbe(req?.params?.id, req?.body)

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
    async ProbeRemove(req, res) {
        if (!req?.user) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        const probe = await findProbeById(req?.params?.id)
        if (!probe) {
            throw HttpError(NOT_FOUND_ERR_CODE, NOT_FOUND_ERR_MESSAGE)
        }

        const canAccessProject = await canUserAccessProject(req?.user?.id, probe?.project?.toString())
        if (!canAccessProject) {
            throw HttpError(FORBIDDEN_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        await removeProbe(req?.params?.id)

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
    async ProbeList(req, res) {
        if (!req?.user) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        const {
            search,
            project,
            sortBy,
            limit,
            page
        } = req?.query ?? {}

        const data = await paginateProbe({
            search,
            project,
            user: req?.user?.id
        }, sortBy, limit, page)

        HttpResponse(res).json({
            error: SUCCESS_ERR_CODE,
            message: SUCCESS_ERR_MESSAGE,
            data,
        });
    },
}