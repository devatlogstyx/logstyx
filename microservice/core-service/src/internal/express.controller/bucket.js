//@ts-check

const { NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE, SUCCESS_ERR_CODE, SUCCESS_ERR_MESSAGE, WRITE_BUCKET_USER_ROLE, FORBIDDEN_ERR_CODE, READ_BUCKET_USER_ROLE } = require("common/constant")
const { HttpError, HttpResponse } = require("common/function")
const { createBucket, updateBucket, paginateBucket, removeBucket } = require("../service/bucket")
const { initLogger, getLogModel } = require("../service/logger")
const { canUserModifyProject } = require("../service/project")
const { canUserDo } = require("../../shared/provider/auth.service")
const { getBucketFromCache } = require("../../shared/cache")


module.exports = {
    /**
     * 
     * @param {*} req 
     * @param {*} res 
     */
    async BucketCreate(req, res) {

        if (!req?.user) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        const canManage = await canUserDo(req?.user?.id, WRITE_BUCKET_USER_ROLE)
        if (!canManage) {
            throw HttpError(FORBIDDEN_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        const data = await createBucket({
            ...req.body,
            creator: req?.user?.id
        }, {
            initLogger,
            canUserModifyProject
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
    async BucketUpdate(req, res) {

        if (!req?.user) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        const canManage = await canUserDo(req?.user?.id, WRITE_BUCKET_USER_ROLE)
        if (!canManage) {
            throw HttpError(FORBIDDEN_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        const canModify = await Promise.all(req?.body?.projects?.map((n) => canUserModifyProject(req?.user?.id, n)))
        if (req?.body?.projects?.length < 1 || canModify.some(allowed => !allowed)) {
            throw HttpError(FORBIDDEN_ERR_CODE, `You don't have permission to modify one or more of the provided projects`)
        }


        const data = await updateBucket(req?.params?.id, req?.body, {
            initLogger,
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
    async BucketPaginate(req, res) {

        if (!req?.user) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        const canManage = await canUserDo(req?.user?.id, READ_BUCKET_USER_ROLE)
        if (!canManage) {
            throw HttpError(FORBIDDEN_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        const {
            search,
            project,
            sortBy,
            limit,
            page
        } = req?.query ?? {}

        const data = await paginateBucket({ search, project, user: req?.user?.id }, sortBy, limit, page)

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
    async BucketRemove(req, res) {

        if (!req?.user) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        const canManage = await canUserDo(req?.user?.id, WRITE_BUCKET_USER_ROLE)
        if (!canManage) {
            throw HttpError(FORBIDDEN_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        const bucket = await getBucketFromCache(req?.params?.id)

        const canModify = await Promise.all(bucket?.projects.map((n) => canUserModifyProject(req?.user?.id, n)))
        if (canModify.some(allowed => !allowed)) {
            throw HttpError(FORBIDDEN_ERR_CODE, `You don't have permission to modify one or more of the provided projects`)
        }

        await removeBucket(req?.params?.id, { getLogModel })

        HttpResponse(res).json({
            error: SUCCESS_ERR_CODE,
            message: SUCCESS_ERR_MESSAGE,
        })

    },

}