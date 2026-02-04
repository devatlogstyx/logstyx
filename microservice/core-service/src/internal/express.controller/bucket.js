//@ts-check

const { NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE, SUCCESS_ERR_CODE, SUCCESS_ERR_MESSAGE, WRITE_BUCKET_USER_ROLE, FORBIDDEN_ERR_CODE, READ_BUCKET_USER_ROLE, NOT_FOUND_ERR_CODE, NOT_FOUND_ERR_MESSAGE } = require("common/constant")
const { HttpError, HttpResponse } = require("common/function")
const { createBucket, updateBucket, paginateBucket, removeBucket, getBucketLogStats, listBucketTimeline } = require("../service/bucket")
const { initLogger, getLogModel, paginateLogs, getDistinctValue } = require("../service/logger")
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
    async BucketGet(req, res) {

        if (!req?.user) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        const canManage = await canUserDo(req?.user?.id, READ_BUCKET_USER_ROLE)
        if (!canManage) {
            throw HttpError(FORBIDDEN_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        const data = await getBucketFromCache(req?.params?.id)

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
    /**
     * 
     * @param {*} req 
     * @param {*} res 
     */
    async BucketGetLogStatistic(req, res) {

        if (!req?.user) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        const canManage = await canUserDo(req?.user?.id, READ_BUCKET_USER_ROLE)
        if (!canManage) {
            throw HttpError(FORBIDDEN_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        const data = await getBucketLogStats(req?.params?.id, { getLogModel })

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
    async BucketPaginateLogs(req, res) {
        if (!req?.user) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }


        let bucket = await getBucketFromCache(req?.params?.id)
        if (!bucket) {
            throw HttpError(NOT_FOUND_ERR_CODE, NOT_FOUND_ERR_MESSAGE)
        }

        const canAccess = await canUserDo(req?.user?.id, READ_BUCKET_USER_ROLE)
        if (!canAccess) {
            throw HttpError(FORBIDDEN_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        const {
            filterField,
            filterValue,
            filterOperator,
            'filterField[]': filterFieldArray,
            'filterValue[]': filterValueArray,
            'filterOperator[]': filterOperatorArray,
            sortBy,
            limit,
            page
        } = req?.query ?? {}

        // Handle both formats: with and without [] suffix
        const filterFields = filterFieldArray || filterField
        const filterValues = filterValueArray || filterValue
        const filterOperators = filterOperatorArray || filterOperator
        // Convert to arrays if they're not already
        const filterFieldsArray = Array.isArray(filterFields) ? filterFields : (filterFields ? [filterFields] : [])
        const filterValuesArray = Array.isArray(filterValues) ? filterValues : (filterValues ? [filterValues] : [])
        const filterOperatorsArray = Array.isArray(filterOperators) ? filterOperators : (filterOperators ? [filterOperators] : [])

        const params = { bucket: bucket?.id, filterFields: filterFieldsArray, filterValues: filterValuesArray, filterOperators: filterOperatorsArray }

        const data = await paginateLogs(params, sortBy, limit, page)

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
    async BucketListDistinctValues(req, res) {
        if (!req?.user) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }


        let bucket = await getBucketFromCache(req?.params?.id)
        if (!bucket) {
            throw HttpError(NOT_FOUND_ERR_CODE, NOT_FOUND_ERR_MESSAGE)
        }

        const canAccess = await canUserDo(req?.user?.id, READ_BUCKET_USER_ROLE)
        if (!canAccess) {
            throw HttpError(FORBIDDEN_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }


        const data = await getDistinctValue(bucket?.id, req?.query?.field)

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
    async BucketListTimeline(req, res) {
        if (!req?.user) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }


        let bucket = await getBucketFromCache(req?.params?.id)
        if (!bucket) {
            throw HttpError(NOT_FOUND_ERR_CODE, NOT_FOUND_ERR_MESSAGE)
        }

        const canAccess = await canUserDo(req?.user?.id, READ_BUCKET_USER_ROLE)
        if (!canAccess) {
            throw HttpError(FORBIDDEN_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        const data = await listBucketTimeline(bucket?.id, req?.query, { getLogModel })

        HttpResponse(res).json({
            error: SUCCESS_ERR_CODE,
            message: SUCCESS_ERR_MESSAGE,
            data
        });
    },
};