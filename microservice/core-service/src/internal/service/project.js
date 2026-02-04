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
const { updateProjectCache, getProjectFromCache, updateAllowedOriginCache } = require("../../shared/cache");
const { mapProjectUser, mapProject } = require("../utils/mapper");
const { validateCustomIndex, isRecent } = require("../utils/helper");
const moment = require("moment-timezone");
const { isValidObjectId } = require("../../shared/mongoose");
const bucketModel = require("../model/bucket.model");

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
 * @param {*} params1
 */
const createProject = async (params, {
    createBucket,
    initLogger
}) => {

    const v = new Validator(params, {
        title: "required|string",
        slug: "string",
        creator: "required|string",
        "settings.filter": "arrayUnique",
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

    let createdProject = null

    try {

        const secret = randomstring.generate(32)
        const payload = sanitizeObject({
            title: striptags(params?.title),
            slug: await generateUniqueSlug(createSlug(params?.slug || params?.title)),
            secret,
            settings: {
                allowedOrigin: params?.settings?.allowedOrigin?.map((n) => striptags(n)),
            }
        })

        const [newProject] = await projectModel.create([
            payload
        ], { session })

        await projectUserModel.create([
            {
                project: newProject?._id,
                user: {
                    userId: ObjectId.createFromHexString(creator?.id),
                    fullname: creator?.fullname,
                },
            }
        ])

        createdProject = newProject;

        await session.commitTransaction()

    } catch (e) {
        await session.abortTransaction();
        throw e;
    } finally {
        session.endSession()
    }

    const project = await updateProjectCache(createdProject?._id?.toString())

    updateAllowedOriginCache()?.catch(console.error)

    await createBucket({
        title: `${project?.title}'s Default Bucket`,
        projects: [project?.id],
        settings: {
            filter: params?.settings?.filter,
            indexes: params?.settings?.indexes?.filter((n) => validateCustomIndex(n)),
            rawIndexes: params?.settings?.rawIndexes?.filter((n) => validateCustomIndex(n)),
            deduplicationStrategy: params?.settings?.deduplicationStrategy || FULL_PAYLOAD_DEDUPLICATION_STRATEGY,
            retentionHours: params?.settings?.retentionHours || 1
        },
        creator: creator?.id
    }, { initLogger, canUserModifyProject })

    return project

}

/**
 * 
 * @param {string} id 
 * @param {object} params 
 * @param {string} params.title
 * @param {string} [params.slug]
 * @param {string[]} [params.allowedOrigin]
 */
const updateProject = async (id, params) => {

    if (!isValidObjectId(id)) {
        throw HttpError(INVALID_INPUT_ERR_CODE, INVALID_ID_ERR_MESSAGE)
    }

    const project = await getProjectFromCache(id)
    if (!project) {
        throw HttpError(NOT_FOUND_ERR_CODE, NOT_FOUND_ERR_MESSAGE)
    }

    const v = new Validator(params, {
        title: "required|string",
        allowedOrigin: "arrayUnique",

    });

    let match = await v.check();
    if (!match) {
        throw HttpError(INVALID_INPUT_ERR_CODE, v.errors);
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    await projectModel.findByIdAndUpdate(id,
        {
            $set: sanitizeObject({
                title: striptags(params?.title),
                "settings.allowedOrigin": params?.allowedOrigin?.map((n) => striptags(n)),
            })
        }
    )

    const updated = await updateProjectCache(id)

    updateAllowedOriginCache()?.catch(console.error)

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
 * @param {*} param1 
 * @returns 
 */
const removeProject = async (id, { getLogModel }) => {
    const project = await getProjectFromCache(id)
    if (!project) {
        throw HttpError(NOT_FOUND_ERR_CODE, PROJECT_NOT_FOUND_ERR_MESSAGE)
    }

    const projectObjId = ObjectId.createFromHexString(id.toString());

    await Promise.all([
        projectModel.findByIdAndDelete(id),
        projectUserModel.deleteMany({ project: projectObjId, }),
        bucketModel.updateMany({
            projects: projectObjId
        }, {
            $pull: {
                projects: projectObjId
            }
        })
    ])

    const emptyBuckets = bucketModel.find({
        projects: { $size: 0 }
    }).cursor();

    for await (const bucket of emptyBuckets) {
        const { log, logstamp } = await getLogModel(bucket._id.toString())
        await Promise.all([
            log.collection.drop(),
            logstamp.collection.drop(),
            bucketModel.findByIdAndDelete(bucket._id)
        ])
    }

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

/**
 * 
 * @param {string} userId 
 * @param {Function} getLogModelFunc 
 * @returns 
 */
const getUsersProjectsStats = async (userId, getLogModelFunc) => {
    if (!isValidObjectId(userId)) {
        throw HttpError(INVALID_INPUT_ERR_CODE, INVALID_ID_ERR_MESSAGE);
    }
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

    const projectIds = usersProjects.map((n) => n?.project?._id);

    // Get buckets for all projects
    const buckets = await bucketModel.find({
        projects: {
            $in: projectIds
        }
    });

    // Create a map of projectId to array of bucket objects (with id and title)
    const projectToBucketsMap = new Map();
    buckets.forEach(bucket => {
        bucket.projects.forEach(projectId => {
            const projectIdStr = projectId.toString();
            if (!projectToBucketsMap.has(projectIdStr)) {
                projectToBucketsMap.set(projectIdStr, []);
            }
            projectToBucketsMap.get(projectIdStr).push({
                id: bucket._id.toString(),
                title: bucket.title
            });
        });
    });

    // Get all unique log models
    const uniqueBucketIds = [...new Set(buckets.map(b => b._id.toString()))];

    const logModelPromises = uniqueBucketIds.map(bucketId =>
        getLogModelFunc(bucketId)
            .then(logModel => ({ bucketId, logModel }))
            .catch((err) => {
                console.log('Error getting log model for bucket:', bucketId, err);
                return null;
            })
    );
    const logModelsArray = await Promise.all(logModelPromises);
    const logModelsMap = new Map(
        logModelsArray
            .filter(item => item !== null)
            .map(({ bucketId, logModel }) => [bucketId, logModel])
    );


    // Process all log aggregations in parallel
    const projectsWithStats = await Promise.allSettled(
        usersProjects.map(async (userProject) => {
            const project = userProject.project;
            const projectId = project._id.toString();
            const projectBuckets = projectToBucketsMap.get(projectId) || [];
            const bucketIds = projectBuckets.map(b => b.id);

            if (!bucketIds || bucketIds.length === 0) {
                // Return empty stats if no buckets found
                return {
                    id: projectId,
                    title: project.title,
                    slug: project.slug,
                    buckets: [],
                    status: 'inactive',
                    lastLog: 'Never',
                    totalLogs: 0,
                    errorCount: 0,
                    criticalCount: 0,
                };
            }

            // Aggregate data from all buckets for this project
            const allResults = await Promise.all(
                bucketIds.map(async (bucketId) => {
                    const logModelData = logModelsMap.get(bucketId);
                    if (!logModelData) {
                        console.log(`No log model for bucket: ${bucketId}`);
                        return null;
                    }

                    const { log } = logModelData;

                    try {
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

                        return result;
                    } catch (error) {

                        return null;
                    }
                })
            );

            // Filter out null results and combine all data
            const validResults = allResults.filter(r => r !== null);

            if (validResults.length === 0) {
                return {
                    id: projectId,
                    title: project.title,
                    slug: project.slug,
                    buckets: projectBuckets,
                    status: 'inactive',
                    lastLog: 'Never',
                    totalLogs: 0,
                    errorCount: 0,
                    criticalCount: 0,
                };
            }

            // Combine results from all buckets
            let totalLogs = 0;
            let lastLogDate = null;
            const combinedErrorStats = new Map();

            validResults.forEach(result => {
                // Sum total logs
                totalLogs += result.totalLogs[0]?.total || 0;

                // Find most recent last log
                if (result.lastLog[0]) {
                    const currentLastLog = new Date(result.lastLog[0].updatedAt);
                    if (!lastLogDate || currentLastLog > lastLogDate) {
                        lastLogDate = currentLastLog;
                    }
                }

                // Combine error stats
                result.errorStats.forEach(item => {
                    const existing = combinedErrorStats.get(item._id) || 0;
                    combinedErrorStats.set(item._id, existing + item.total);
                });
            });

            return {
                id: projectId,
                title: project.title,
                slug: project.slug,
                buckets: projectBuckets,
                status: lastLogDate && isRecent(lastLogDate) ? 'active' : 'inactive',
                lastLog: lastLogDate ? moment(lastLogDate).fromNow() : 'Never',
                totalLogs,
                errorCount: combinedErrorStats.get(ERROR_LOG_LEVEL) || 0,
                criticalCount: combinedErrorStats.get(CRITICAL_LOG_LEVEL) || 0,
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

    // Find all buckets that contain this project
    const buckets = await bucketModel.find({
        projects: ObjectId.createFromHexString(projectId)
    });

    if (!buckets || buckets.length === 0) {
        return [];
    }

    // Get log models for all buckets
    const logModelPromises = buckets.map(bucket =>
        getLogModelFunc(bucket._id.toString())
            .then(logModel => ({ bucketId: bucket._id.toString(), logModel }))
            .catch(() => null)
    );
    const logModelsArray = await Promise.all(logModelPromises);
    const validLogModels = logModelsArray.filter(item => item !== null);

    if (validLogModels.length === 0) {
        return [];
    }

    // Aggregate stats from all buckets
    const allStats = await Promise.all(
        validLogModels.map(async ({ logModel }) => {
            try {
                const { log } = logModel;
                const stats = await log.aggregate([
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
                    }
                ]);
                return stats;
            } catch (error) {
                return [];
            }
        })
    );

    // Combine stats from all buckets by level
    const combinedStatsMap = new Map();

    allStats.flat().forEach(stat => {
        const existing = combinedStatsMap.get(stat.level) || 0;
        combinedStatsMap.set(stat.level, existing + stat.count);
    });

    // Convert map back to array format
    const logsStats = Array.from(combinedStatsMap.entries()).map(([level, count]) => ({
        level,
        count
    }));

    // Sort by count descending
    logsStats.sort((a, b) => b.count - a.count);

    return logsStats;
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
    getUsersProjectsStats,
    findProjectById,
    findProjectBySlug,
    canUserReadProject,
    listUserProject,
    processRemoveUserFromAllProject,
    getProjectLogStats,
}