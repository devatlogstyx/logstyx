//@ts-check
const { INVALID_INPUT_ERR_CODE, NOT_FOUND_ERR_CODE, USER_NOT_FOUND_ERR_MESSAGE, PROJECT_NOT_FOUND_ERR_MESSAGE, ALREADY_A_MEMBER_ERR_MESSAGE, NOT_A_MEMBER_ERR_MESSAGE, NOT_FOUND_ERR_MESSAGE, ERROR_LOG_LEVEL, CRITICAL_LOG_LEVEL, WRITE_PROJECT_USER_ROLE, INDEX_ONLY_DEDUPLICATION_STRATEGY, FULL_PAYLOAD_DEDUPLICATION_STRATEGY, INVALID_ID_ERR_MESSAGE } = require("common/constant");
const { HttpError, num2Ceil, num2Floor, parseSortBy, sanitizeObject, createSlug } = require("common/function");
const { Validator } = require("node-input-validator");
const { findUserById } = require("../../shared/provider/auth.service");
const mongoose = require("mongoose");
const projectModel = require("../model/project.model");
const { ObjectId } = mongoose.Types
const { striptags } = require("striptags")
const randomstring = require("randomstring");
const projectUserModel = require("../model/project.user.model");
const { updateProjectCache, getProjectFromCache } = require("../../shared/cache");
const { mapProjectUser, mapProject } = require("../utils/mapper");
const { validateCustomIndex, isRecent } = require("../utils/helper");
const moment = require("moment-timezone");
const probeModel = require("../model/probe.model");
const widgetModel = require("../model/widget.model");
const { isValidObjectId } = require("../../shared/mongoose");

/**
 * 
 * @param {string} baseSlug 
 * @returns 
 */
const generateUniqueSlug = async (baseSlug) => {
    let slug = baseSlug?.toString()
    let counter = 1

    while (await projectModel.exists({ slug })) {
        slug = `${baseSlug}-${counter}`
        counter++
    }

    return slug
}


/**
 * 
 * @param {object} params 
 * @param {string} params.creator 
 * @param {string} params.title
 * @param {string} [params.slug]
 * @param {object} [params.settings]
 * @param {string[]} [params.settings.indexes] 
 * @param {string[]} [params.settings.rawIndexes]
 * @param {string[]} [params.settings.allowedOrigin]
 * @param {string} [params.settings.deduplicationStrategy]
 * @param {number | string} [params.settings.retentionHours]
 * @param {Function} initLoggerFunc
 */
const createProject = async (params, initLoggerFunc) => {

    const v = new Validator(params, {
        title: "required|string",
        slug: "string",
        creator: "required|string",
        "settings.indexes": "arrayUnique",
        "settings.rawIndexes": "arrayUnique",
        "settings.allowedOrigin": "arrayUnique",
        "settings.retentionHours": "numeric",
        "settings.deduplicationStrategy": "string",

    });

    let match = await v.check();
    if (!match) {
        throw HttpError(INVALID_INPUT_ERR_CODE, v.errors);
    }

    const creator = await findUserById(params?.creator)
    if (!creator) {
        throw HttpError(NOT_FOUND_ERR_CODE, USER_NOT_FOUND_ERR_MESSAGE)
    }

    if (params?.settings?.deduplicationStrategy === INDEX_ONLY_DEDUPLICATION_STRATEGY) {
        const hasIndexes = params?.settings?.indexes && params.settings.indexes.length > 0;
        if (!hasIndexes) {
            throw HttpError(INVALID_INPUT_ERR_CODE,
                `Project "${params.title}" uses INDEX_ONLY deduplication but has no indexes defined. `
            );
        }
    }

    const existingProject = await projectModel.findOne({
        slug: createSlug(params?.slug || params?.title),
    })
    if (existingProject) {
        return existingProject?.toJSON()
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {

        const secret = randomstring.generate(32)
        const payload = sanitizeObject({
            title: striptags(params?.title),
            slug: await generateUniqueSlug(createSlug(params?.slug || params?.title)),
            secret,
            settings: {
                indexes: params?.settings?.indexes?.filter((n) => validateCustomIndex(n)),
                rawIndexes: params?.settings?.rawIndexes?.filter((n) => validateCustomIndex(n)),
                allowedOrigin: params?.settings?.allowedOrigin?.map((n) => striptags(n)),
                deduplicationStrategy: params?.settings?.deduplicationStrategy || FULL_PAYLOAD_DEDUPLICATION_STRATEGY,
                retentionHours: params?.settings?.retentionHours || 1
            }
        })

        const projects = await projectModel.create([
            payload
        ], { session })

        await projectUserModel.create([
            {
                project: projects?.[0]?._id,
                user: {
                    userId: ObjectId.createFromHexString(creator?.id),
                    fullname: creator?.fullname,
                },
            }
        ])

        await session.commitTransaction()

        const project = await updateProjectCache(projects?.[0]?._id?.toString())

        initLoggerFunc(project)?.catch(console.error)

        return project

    } catch (e) {
        await session.abortTransaction();
        throw e;
    } finally {
        session.endSession()
    }

}

/**
 * 
 * @param {string} id 
 * @param {object} params 
 * @param {string} params.title
 * @param {string} [params.slug]
 * @param {string[]} [params.indexes] 
 * @param {string[]} [params.rawIndexes] 
 * @param {string[]} [params.allowedOrigin]
 * @param {string} [params.deduplicationStrategy]
 * @param {string} [params.retentionHours]
 * @param {Function} initLoggerFunc
 */
const updateProject = async (id, params, initLoggerFunc) => {

    if (!isValidObjectId(id)) {
        throw HttpError(INVALID_INPUT_ERR_CODE, INVALID_ID_ERR_MESSAGE)
    }

    const project = await getProjectFromCache(id)
    if (!project) {
        throw HttpError(NOT_FOUND_ERR_CODE, NOT_FOUND_ERR_MESSAGE)
    }

    const v = new Validator(params, {
        title: "required|string",
        indexes: "arrayUnique",
        rawIndexes: "arrayUnique",
        allowedOrigin: "arrayUnique",
        deduplicationStrategy: "string",
        retentionHours: "numeric"
    });

    let match = await v.check();
    if (!match) {
        throw HttpError(INVALID_INPUT_ERR_CODE, v.errors);
    }

    if (params?.deduplicationStrategy === INDEX_ONLY_DEDUPLICATION_STRATEGY) {
        const hasIndexes = params?.indexes && params.indexes.length > 0;
        if (!hasIndexes) {
            throw HttpError(INVALID_INPUT_ERR_CODE,
                `Project "${project.title}" uses INDEX_ONLY deduplication but has no indexes defined. `
            );
        }
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    await projectModel.findByIdAndUpdate(id,
        {
            $set: sanitizeObject({
                title: striptags(params?.title),
                "settings.indexes": params?.indexes?.filter((n) => validateCustomIndex(n)),
                "settings.rawIndexes": params?.rawIndexes?.filter((n) => validateCustomIndex(n)),
                "settings.allowedOrigin": params?.allowedOrigin?.map((n) => striptags(n)),
                "settings.deduplicationStrategy": params?.deduplicationStrategy || FULL_PAYLOAD_DEDUPLICATION_STRATEGY,
                "settings.retentionHours": params?.retentionHours || 1
            })
        }
    )

    const updated = await updateProjectCache(id)
    initLoggerFunc(updated)

    return updated

}

/**
 * 
 * @param {string} userId 
 * @param {string} projectId 
 */
const canUserModifyProject = async (userId, projectId) => {
    if (!isValidObjectId(userId) || !isValidObjectId(projectId)) {
        return false
    }

    const user = await findUserById(userId)
    if (!user) {
        return false
    }

    if (!user?.permissions?.includes(WRITE_PROJECT_USER_ROLE)) {
        return false
    }

    return projectUserModel.exists({
        project: ObjectId.createFromHexString(projectId?.toString()),
        "user.userId": ObjectId.createFromHexString(userId?.toString())
    });

}

/**
 * 
 * @param {string} userId 
 * @param {string} projectId 
 * @returns 
 */
const canUserReadProject = async (userId, projectId) => {
    if (!isValidObjectId(userId) || !isValidObjectId(projectId)) {
        return false
    }

    return projectUserModel.exists({
        project: ObjectId.createFromHexString(projectId?.toString()),
        "user.userId": ObjectId.createFromHexString(userId?.toString())
    });

}

/**
 * 
 * @param {string} id 
 * @param {Function}  getLogModelFunc
 */
const removeProject = async (id, getLogModelFunc) => {
    const project = await getProjectFromCache(id)
    if (!project) {
        throw HttpError(NOT_FOUND_ERR_CODE, PROJECT_NOT_FOUND_ERR_MESSAGE)
    }

    const projectObjId = ObjectId.createFromHexString(id.toString());
    const { log, logstamp } = await getLogModelFunc(id)

    await Promise.all([
        projectModel.findByIdAndDelete(id),
        projectUserModel.deleteMany({ project: projectObjId, }),
        log.collection.drop(),
        logstamp.collection.drop(),
        probeModel.deleteMany({ project: projectObjId }),
        widgetModel.deleteMany({ project: projectObjId })

    ])

    return null

}

/**
 * 
 * @param {object} [params]
 * @param {string} [params.search]
 * @param {string} [params.user]
 * @returns 
 */
const buildProjectSearchQuery = (params = {}) => {
    let queryProject = {}
    let queryUser = {}
    if (params.search && typeof params.search === "string") {
        queryProject.$or = [
            {
                title: {
                    $regex: params?.search,
                    $options: "i"
                }
            }
        ]
    }

    if (params.ids && Array.isArray(params.ids)) {
        queryProject._id = {
            $in: params?.ids?.map((n) => ObjectId.createFromHexString(n))
        }
    }

    if (params?.user && typeof params.user === "string") {
        queryUser["user.userId"] = ObjectId.createFromHexString(params?.user)
    }

    return {
        queryUser,
        queryProject
    }
}

const paginateProject = async (query = {}, sortBy = "createdAt:desc", limit = 10, page = 1) => {

    const {
        queryUser,
        queryProject
    } = buildProjectSearchQuery(query)
    limit = num2Ceil(num2Floor(limit, 1), 50)
    page = num2Floor(page, 1)
    const sort = parseSortBy(sortBy)

    const aggregate = projectUserModel.aggregate([
        { $match: queryUser },
        {
            $lookup: {
                from: "projects", // collection name in MongoDB
                localField: "project",
                foreignField: "_id",
                as: "project",
            },
        },
        { $unwind: "$project" },
        { $replaceRoot: { newRoot: "$project" } },
        { $match: queryProject },
        {
            $sort: {
                ...sort
            }
        }
    ]);

    let options = { page, limit };

    let res = await projectUserModel.aggregatePaginate(aggregate, options);

    let list = {
        results: res?.docs?.map((n) => {
            return {
                id: n?._id?.toString(),
                title: n?.title,
                slug: n?.slug,
                settings: n?.settings
            }
        }),
        page,
        totalResults: res.total,
        totalPages: res.pages,
    };

    return list

}

/**
 * 
 * @param {string} userId 
 * @param {string} projectId 
 */
const addUserToProject = async (userId, projectId) => {

    if (!isValidObjectId(userId) || !isValidObjectId(projectId)) {
        throw HttpError(INVALID_INPUT_ERR_CODE, INVALID_ID_ERR_MESSAGE)
    }

    const project = await getProjectFromCache(projectId);
    if (!project)
        throw HttpError(NOT_FOUND_ERR_CODE, PROJECT_NOT_FOUND_ERR_MESSAGE);

    const projectObjId = ObjectId.createFromHexString(projectId.toString());
    const userObjId = ObjectId.createFromHexString(userId.toString());

    const exists = await projectUserModel.exists({
        project: projectObjId,
        "user.userId": userObjId
    });
    if (exists)
        throw HttpError(INVALID_INPUT_ERR_CODE, ALREADY_A_MEMBER_ERR_MESSAGE);

    const user = await findUserById(userId);
    if (!user)
        throw HttpError(NOT_FOUND_ERR_CODE, USER_NOT_FOUND_ERR_MESSAGE);

    await projectUserModel.create({
        project: projectObjId,
        user: {
            userId: userObjId,
            fullname: user.fullname
        }
    });

    return true;
};


/**
 * 
 * @param {string} userId 
 * @param {string} projectId 
 * @returns 
 */
const removeUserFromProject = async (userId, projectId) => {

    if (!isValidObjectId(userId) || !isValidObjectId(projectId)) {
        throw HttpError(INVALID_INPUT_ERR_CODE, INVALID_ID_ERR_MESSAGE)
    }

    const project = await getProjectFromCache(projectId);
    if (!project)
        throw HttpError(NOT_FOUND_ERR_CODE, PROJECT_NOT_FOUND_ERR_MESSAGE);

    const projectObjId = ObjectId.createFromHexString(projectId.toString());
    const userObjId = ObjectId.createFromHexString(userId.toString());

    const isMember = await projectUserModel.exists({
        project: projectObjId,
        "user.userId": userObjId
    });

    if (!isMember)
        throw HttpError(INVALID_INPUT_ERR_CODE, NOT_A_MEMBER_ERR_MESSAGE);

    await projectUserModel.deleteMany({
        project: projectObjId,
        "user.userId": userObjId
    });

    return true;
};

/**
 * 
 * @param {string} projectId 
 * @returns 
 */
const listUserFromProject = async (projectId) => {
    if (!isValidObjectId(projectId)) {
        throw HttpError(INVALID_INPUT_ERR_CODE, INVALID_ID_ERR_MESSAGE)
    }

    const project = await getProjectFromCache(projectId);
    if (!project)
        throw HttpError(NOT_FOUND_ERR_CODE, PROJECT_NOT_FOUND_ERR_MESSAGE);

    const projectObjId = ObjectId.createFromHexString(projectId.toString());
    const list = await projectUserModel.find({
        project: projectObjId
    })

    return list?.map(mapProjectUser);
};

const generateHourlyActivity = (activityMap, hoursToTrack) => {
    return Array.from({ length: hoursToTrack }, (_, i) => {
        const date = new Date(Date.now() - (hoursToTrack - 1 - i) * 60 * 60 * 1000);
        const key = date.toISOString().slice(0, 13).replace('T', '-');
        return activityMap.get(key) || 0;
    });
};

/**
 * 
 * @param {string} userId 
 * @param {Function} getLogModelFunc 
 * @returns 
 */
const getUsersDashboardProjectsStats = async (userId, getLogModelFunc) => {
    if (!isValidObjectId(userId)) {
        throw HttpError(INVALID_INPUT_ERR_CODE, INVALID_ID_ERR_MESSAGE);
    }

    const HOURS_TO_TRACK = 7;
    const MILLISECONDS_PER_HOUR = 60 * 60 * 1000;
    const activityCutoff = new Date(Date.now() - HOURS_TO_TRACK * MILLISECONDS_PER_HOUR);

    // Get all user projects with project details in one query
    const usersProjects = await projectUserModel.aggregate([
        {
            $match: {
                'user.userId': ObjectId.createFromHexString(userId)
            }
        },
        {
            $lookup: {
                from: "projects",
                localField: "project",
                foreignField: "_id",
                as: "project"
            }
        },
        { $unwind: "$project" },
        {
            $project: {
                'project._id': 1,
                'project.title': 1,
                'project.slug': 1
            }
        }
    ]);

    if (!usersProjects.length) {
        return [];
    }

    // Get all log models in parallel
    const logModels = await Promise.all(
        usersProjects.map(up => getLogModelFunc(up.project._id.toString()))
    );

    // Process all log aggregations in parallel
    const projectsWithStats = await Promise.allSettled(
        usersProjects.map(async (userProject, index) => {
            const { log } = logModels[index];
            const project = userProject.project;

            const [result] = await log.aggregate([
                {
                    $facet: {
                        totalLogs: [
                            { $group: { _id: null, total: { $sum: "$count" } } }
                        ],
                        lastLog: [
                            { $sort: { updatedAt: -1 } },
                            { $limit: 1 },
                            { $project: { updatedAt: 1 } }
                        ],
                        activity: [
                            { $match: { updatedAt: { $gte: activityCutoff } } },
                            {
                                $group: {
                                    _id: {
                                        $dateToString: {
                                            format: "%Y-%m-%d-%H",
                                            date: "$updatedAt"
                                        }
                                    },
                                    count: { $sum: "$count" }
                                }
                            },
                            { $sort: { _id: 1 } }
                        ],
                        errorStats: [
                            {
                                $match: {
                                    level: { $in: [ERROR_LOG_LEVEL, CRITICAL_LOG_LEVEL] }
                                }
                            },
                            {
                                $group: {
                                    _id: "$level",
                                    total: { $sum: "$count" }
                                }
                            }
                        ]
                    }
                }
            ]);

            const errorStatsMap = new Map(
                result.errorStats.map(item => [item._id, item.total])
            );

            const activityMap = new Map(
                result.activity.map(item => [item._id, item.count])
            );

            const activity = generateHourlyActivity(activityMap, HOURS_TO_TRACK);
            const lastLogData = result.lastLog[0];

            return {
                id: project._id?.toString(),
                title: project.title,
                slug: project.slug,
                status: lastLogData && isRecent(lastLogData.updatedAt) ? 'active' : 'inactive',
                lastLog: lastLogData ? moment(lastLogData.updatedAt).fromNow() : 'Never',
                totalLogs: result.totalLogs[0]?.total || 0,
                errorCount: errorStatsMap.get(ERROR_LOG_LEVEL) || 0,
                criticalCount: errorStatsMap.get(CRITICAL_LOG_LEVEL) || 0,
                activity
            };
        })
    );

    return projectsWithStats
        .filter(result => result.status === 'fulfilled')
        .map(result => result.value);
};


/**
 * 
 * @param {string} userId 
 * @returns 
 */
const listUserProject = async (userId) => {

    if (!isValidObjectId(userId)) {
        throw HttpError(INVALID_INPUT_ERR_CODE, INVALID_ID_ERR_MESSAGE)
    }

    const projects = await projectUserModel.aggregate([
        {
            $match: { 'user.userId': ObjectId.createFromHexString(userId) }
        },
        {
            $lookup: {
                from: 'projects', // your projects collection name
                localField: 'project',
                foreignField: '_id',
                as: 'projectDetails'
            }
        },
        {
            $unwind: '$projectDetails'
        },
        {
            $replaceRoot: { newRoot: '$projectDetails' }
        }
    ]);

    return projects?.map(mapProject)
}
/**
 * 
 * @param {string} id 
 * @returns 
 */
const findProjectById = async (id) => {
    if (!isValidObjectId(id)) {
        throw HttpError(INVALID_INPUT_ERR_CODE, INVALID_ID_ERR_MESSAGE)
    }

    const raw = await getProjectFromCache(id)
    if (!raw) {
        return null
    }

    return raw
}

/**
 * 
 * @param {string} slug 
 * @returns 
 */
const findProjectBySlug = async (slug) => {
    const raw = await projectModel.findOne({ slug })
    if (!raw) {
        return null
    }

    return updateProjectCache(raw?._id?.toString())
}

/**
 * 
 * @param {string} userId 
 */
const processRemoveUserFromAllProject = async (userId) => {

    if (!isValidObjectId(userId)) {
        throw HttpError(INVALID_INPUT_ERR_CODE, INVALID_ID_ERR_MESSAGE)
    }

    await projectUserModel.deleteMany({
        "user.userId": ObjectId.createFromHexString(userId)
    });

    return null
}

/**
 * 
 * @param {string} projectId 
 * @param {Function} getLogModelFunc 
 */
const getProjectLogStats = async (projectId, getLogModelFunc) => {

    if (!isValidObjectId(projectId)) {
        throw HttpError(INVALID_INPUT_ERR_CODE, `invalid id`)
    }

    const { log: logModel } = await getLogModelFunc(projectId)

    const logsStats = await logModel.aggregate([
        {
            $group: {
                _id: "$level",
                count: { $sum: "$count" }
            }
        },
        {
            $project: {
                level: "$_id",
                count: 1,
                _id: 0
            }
        },
        {
            $sort: { count: -1 } // Optional: sort by count descending
        }
    ]);


    return logsStats
}


module.exports = {
    createProject,
    updateProject,
    canUserModifyProject,
    removeProject,
    paginateProject,
    addUserToProject,
    removeUserFromProject,
    listUserFromProject,
    getUsersDashboardProjectsStats,
    findProjectById,
    findProjectBySlug,
    canUserReadProject,
    listUserProject,
    processRemoveUserFromAllProject,
    getProjectLogStats
}