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
    NOT_FOUND_ERR_CODE,
    NOT_FOUND_ERR_MESSAGE,

} = require("common/constant");
const { createProject, canUserModifyProject, removeProject, paginateProject, addUserToProject, removeUserFromProject, listUserFromProject, updateProject, findProjectBySlug, findProjectById, canUserReadProject, getProjectLogStats } = require("../service/project");
const { paginateLogs, getDistinctValue } = require("../service/logger");

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

        let project = await findProjectBySlug(req?.params?.id)
        if (!project) {
            project = await findProjectById(req?.params?.id)
        }

        if (!project) {
            throw HttpError(NOT_FOUND_ERR_CODE, NOT_FOUND_ERR_MESSAGE)
        }

        const canAccess = await canUserModifyProject(req?.user?.id, project?.id)
        if (!canAccess) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        await removeProject(project?.id)

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
        data.results = data?.results?.map((/** @type {{ secret: any; }} */ n) => {
            delete n.secret
            return n
        })
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
    /**
     * 
     * @param {*} req 
     * @param {*} res 
     */
    async ProjectListUser(req, res) {
        if (!req?.user) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        const canAccess = await canUserReadProject(req?.user?.id, req?.params?.id)
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
    /**
     * 
     * @param {*} req 
     * @param {*} res 
     */
    async ProjectGet(req, res) {
        if (!req?.user) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }


        let project = await findProjectBySlug(req?.params?.id)
        if (!project) {
            project = await findProjectById(req?.params?.id)
        }

        if (!project) {
            throw HttpError(NOT_FOUND_ERR_CODE, NOT_FOUND_ERR_MESSAGE)
        }

        const canAccess = await canUserReadProject(req?.user?.id, project?.id)
        if (!canAccess) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        HttpResponse(res).json({
            error: SUCCESS_ERR_CODE,
            message: SUCCESS_ERR_MESSAGE,
            data: project
        });
    },
    /**
     * 
     * @param {*} req 
     * @param {*} res 
     */
    async ProjectGetLogStatistic(req, res) {
        if (!req?.user) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }


        let project = await findProjectBySlug(req?.params?.id)
        if (!project) {
            project = await findProjectById(req?.params?.id)
        }

        if (!project) {
            throw HttpError(NOT_FOUND_ERR_CODE, NOT_FOUND_ERR_MESSAGE)
        }

        const canAccess = await canUserReadProject(req?.user?.id, project?.id)
        if (!canAccess) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        const data = await getProjectLogStats(project?.id)

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
    async ProjectPaginateLogs(req, res) {
        if (!req?.user) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }


        let project = await findProjectBySlug(req?.params?.id)
        if (!project) {
            project = await findProjectById(req?.params?.id)
        }

        if (!project) {
            throw HttpError(NOT_FOUND_ERR_CODE, NOT_FOUND_ERR_MESSAGE)
        }

        const canAccess = await canUserReadProject(req?.user?.id, project?.id)
        if (!canAccess) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        const {
            filterField,
            filterValue,
            'filterField[]': filterFieldArray,
            'filterValue[]': filterValueArray,
            sortBy,
            limit,
            page
        } = req?.query ?? {}

        // Handle both formats: with and without [] suffix
        const filterFields = filterFieldArray || filterField
        const filterValues = filterValueArray || filterValue

        // Convert to arrays if they're not already
        const filterFieldsArray = Array.isArray(filterFields) ? filterFields : (filterFields ? [filterFields] : [])
        const filterValuesArray = Array.isArray(filterValues) ? filterValues : (filterValues ? [filterValues] : [])

        const params = { project: project?.id, filterFields: filterFieldsArray, filterValues: filterValuesArray }

        const data = await paginateLogs(params, sortBy, limit, page)

        HttpResponse(res).json({
            error: SUCCESS_ERR_CODE,
            message: SUCCESS_ERR_MESSAGE,
            data
        });
    },
    async ProjectListDistinctValues(req, res) {
        if (!req?.user) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }


        let project = await findProjectBySlug(req?.params?.id)
        if (!project) {
            project = await findProjectById(req?.params?.id)
        }

        if (!project) {
            throw HttpError(NOT_FOUND_ERR_CODE, NOT_FOUND_ERR_MESSAGE)
        }

        const canAccess = await canUserReadProject(req?.user?.id, project?.id)
        if (!canAccess) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }


        const data = await getDistinctValue(project?.id, req?.query?.field)

        HttpResponse(res).json({
            error: SUCCESS_ERR_CODE,
            message: SUCCESS_ERR_MESSAGE,
            data
        });
    },
};

