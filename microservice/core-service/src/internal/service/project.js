//@ts-check
const { INVALID_INPUT_ERR_CODE, NOT_FOUND_ERR_CODE, USER_NOT_FOUND_ERR_MESSAGE, PROJECT_NOT_FOUND_ERR_MESSAGE, ALREADY_A_MEMBER_ERR_MESSAGE, NOT_A_MEMBER_ERR_MESSAGE, NOT_FOUND_ERR_MESSAGE } = require("common/constant");
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
const logModel = require("../model/log.model");
const logstampModel = require("../model/logstamp.model");
const { mapProjectUser } = require("../utils/mapper");
const { validateCustomIndex, getLogModel, isRecent } = require("../utils/helper");
const { initLogger } = require("./../utils/helper");
const moment = require("moment-timezone")

/**
 * 
 * @param {object} params 
 * @param {string} params.creator 
 * @param {string} params.title
 * @param {string} [params.slug]
 * @param {object} [params.settings]
 * @param {string[]} [params.settings.indexes] 
 * @param {string[]} [params.settings.allowedOrigin]
 * @param {number | string} [params.settings.retentionDays]
 */
const createProject = async (params) => {

    const v = new Validator(params, {
        title: "required|string",
        slug: "string",
        creator: "required|string",
        "settings.indexes": "arrayUnique",
        "settings.allowedOrigin": "arrayUnique",
        "settings.retentionDays": "numeric",
    });

    let match = await v.check();
    if (!match) {
        throw HttpError(INVALID_INPUT_ERR_CODE, v.errors);
    }

    const creator = await findUserById(params?.creator)
    if (!creator) {
        throw HttpError(NOT_FOUND_ERR_CODE, USER_NOT_FOUND_ERR_MESSAGE)
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
        const projects = await projectModel.create([
            sanitizeObject({
                title: striptags(params?.title),
                slug: createSlug(params?.slug || params?.title),
                secret,
                settings: {
                    indexes: params?.settings?.indexes?.filter((n) => validateCustomIndex(n)),
                    allowedOrigin: params?.settings?.allowedOrigin?.map((n) => striptags(n)),
                    retentionDays: params?.settings?.retentionDays || 1
                }
            })
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
        initLogger(project)
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
 * @param {string[]} [params.allowedOrigin]
 */
const updateProject = async (id, params) => {
    const project = await getProjectFromCache(id)
    if (!project) {
        throw HttpError(NOT_FOUND_ERR_CODE, NOT_FOUND_ERR_MESSAGE)
    }

    const v = new Validator(params, {
        title: "required|string",
        slug: "string",
        indexes: "arrayUnique",
        allowedOrigin: "arrayUnique"
    });

    let match = await v.check();
    if (!match) {
        throw HttpError(INVALID_INPUT_ERR_CODE, v.errors);
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    await projectModel.findByIdAndUpdate(id,
        {
            $set: {
                title: striptags(params?.title),
                slug: createSlug(params?.slug || params?.title),
                indexes: params?.indexes?.filter((n) => validateCustomIndex(n)),
                allowedOrigin: params?.allowedOrigin?.map((n) => striptags(n))
            }
        }
    )

    const updated = await updateProjectCache(id)
    initLogger(updated)

    return updated

}

/**
 * 
 * @param {string} userId 
 * @param {string} projectId 
 */
const canUserModifyProject = async (userId, projectId) => {

    return projectUserModel.exists({
        project: ObjectId.createFromHexString(projectId?.toString()),
        "user.userId": ObjectId.createFromHexString(userId?.toString())
    });

}

/**
 * 
 * @param {string} id 
 */
const removeProject = async (id) => {
    const project = await getProjectFromCache(id)
    if (!project) {
        throw HttpError(NOT_FOUND_ERR_CODE, PROJECT_NOT_FOUND_ERR_MESSAGE)
    }

    const projectObjId = ObjectId.createFromHexString(id.toString());

    await Promise.all([
        projectModel.findByIdAndDelete(id),
        projectUserModel.deleteMany({ project: projectObjId, }),
        logModel.deleteMany({ project: projectObjId, }),
        logstampModel.deleteMany({ project: projectObjId, })
    ])
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
    if (params.search) {
        queryProject.$or = [
            {
                title: {
                    $regex: params?.search,
                    $options: "i"
                }
            }
        ]
    }

    if (params?.user) {
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
    const project = await getProjectFromCache(projectId);
    if (!project)
        throw HttpError(NOT_FOUND_ERR_CODE, PROJECT_NOT_FOUND_ERR_MESSAGE);

    const projectObjId = ObjectId.createFromHexString(projectId.toString());
    const list = await projectUserModel.find({
        project: projectObjId
    })

    return list?.map(mapProjectUser);
};

const getUsersDashboardProjectsStats = async (userId) => {
    // 1. Get all projects for the user
    const projectUsers = await projectUserModel.find({ 'user.userId': ObjectId.createFromHexString(userId) })

    const projectsWithStats = await Promise.all(
        projectUsers.map(async (pu) => {
            const project = await getProjectFromCache(pu.project?.toString());

            const { log, logstamp } = await getLogModel(project?.id?.toString())

            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);

            // ⭐ PUT THE ULTRA-OPTIMIZED QUERY HERE ⭐
            const [result] = await logstamp.aggregate([
                {
                    $facet: {
                        // Logs today
                        logsToday: [
                            { $match: { createdAt: { $gte: todayStart } } },
                            { $count: "count" }
                        ],

                        // Last log
                        lastLog: [
                            { $sort: { createdAt: -1 } },
                            { $limit: 1 },
                            { $project: { createdAt: 1 } }
                        ],

                        // Activity per hour
                        activity: [
                            {
                                $match: {
                                    createdAt: { $gte: new Date(Date.now() - 7 * 60 * 60 * 1000) }
                                }
                            },
                            {
                                $group: {
                                    _id: {
                                        $dateToString: {
                                            format: "%Y-%m-%d-%H",
                                            date: "$createdAt"
                                        }
                                    },
                                    count: { $sum: 1 }
                                }
                            },
                            { $sort: { _id: 1 } }
                        ],

                        // Errors today
                        errorsToday: [
                            {
                                $match: {
                                    createdAt: { $gte: todayStart },
                                    level: { $regex: /error/i }
                                }
                            },
                            { $count: "count" }
                        ],

                        // Critical today
                        criticalToday: [
                            {
                                $match: {
                                    createdAt: { $gte: todayStart },
                                    level: { $regex: /critical|fatal/i }
                                }
                            },
                            { $count: "count" }
                        ]
                    }
                }
            ]);

            // Extract data from aggregation result
            const logsToday = result.logsToday[0]?.count || 0;
            const lastLogData = result.lastLog[0];
            const errorCount = result.errorsToday[0]?.count || 0;
            const criticalCount = result.criticalToday[0]?.count || 0;

            // Process activity data (fill gaps for missing hours)
            const activityMap = new Map(
                result.activity.map(item => [item._id, item.count])
            );

            const activity = Array.from({ length: 7 }, (_, i) => {
                const date = new Date(Date.now() - (6 - i) * 60 * 60 * 1000);
                const key = date.toISOString().slice(0, 13).replace('T', '-');
                return activityMap.get(key) || 0;
            });

            // Return formatted project data
            return {
                id: project.id,
                title: project.title,
                slug: project.slug,
                status: lastLogData && isRecent(lastLogData.createdAt) ? 'active' : 'inactive',
                lastLog: lastLogData ? moment(lastLogData.createdAt).fromNow() : 'Never',
                logsToday: logsToday,
                errorCount: errorCount,
                criticalCount: criticalCount,
                activity: activity
            };
        })
    );

    return projectsWithStats;
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
    getUsersDashboardProjectsStats
}