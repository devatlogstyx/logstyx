//@ts-check

const { INVALID_INPUT_ERR_CODE, NOT_FOUND_ERR_CODE, USER_NOT_FOUND_ERR_MESSAGE, INDEX_ONLY_DEDUPLICATION_STRATEGY, FULL_PAYLOAD_DEDUPLICATION_STRATEGY, INVALID_ID_ERR_MESSAGE, NOT_FOUND_ERR_MESSAGE, FORBIDDEN_ERR_CODE, ERROR_LOG_LEVEL, CRITICAL_LOG_LEVEL } = require("common/constant");
const { HttpError, sanitizeObject, num2Ceil, num2Floor, parseSortBy } = require("common/function");
const { Validator } = require("node-input-validator");
const { findUserById } = require("../../shared/provider/auth.service");
const { mongoose, isValidObjectId } = require("./../../shared/mongoose");
const { striptags } = require("striptags");
const projectModel = require("../model/project.model");
const { validateCustomIndex, isRecent } = require("../utils/helper");
const bucketModel = require("../model/bucket.model");
const { updateBucketCache, getBucketFromCache } = require("../../shared/cache");
const probeModel = require("../model/probe.model");
const widgetModel = require("../model/widget.model");
const projectUserModel = require("../model/project.user.model");
const { mapBucket } = require("../utils/mapper");
const { ObjectId } = mongoose.Types
const moment = require("moment-timezone")

/**
 * 
 * @param {*} params 
 * @param {*} param1 
 * @returns 
 */
const createBucket = async (params, { initLogger, canUserModifyProject }) => {
    const v = new Validator(params, {
        title: "required|string",
        projects: "required|arrayUnique",
        "settings.indexes": "arrayUnique",
        "settings.filter": "arrayUnique",
        "settings.rawIndexes": "arrayUnique",
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
                `Bucket "${params.title}" uses INDEX_ONLY deduplication but has no indexes defined. `
            );
        }
    }

    const projects = await projectModel.find({
        _id: { $in: params?.projects?.map((n) => ObjectId.createFromHexString(n?.toString())) }
    })

    if (projects?.length < 1) {
        throw HttpError(INVALID_INPUT_ERR_CODE, `No valid project is provided`)
    }

    const canModify = await Promise.all(projects.map((n) => canUserModifyProject(creator?.id, n?._id?.toString())))
    if (canModify.some(allowed => !allowed)) {
        throw HttpError(FORBIDDEN_ERR_CODE, `You don't have permission to modify one or more of the provided projects`)
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    let bucket
    try {

        const payload = sanitizeObject({
            title: striptags(params?.title),
            projects: projects.map((n) => n?._id),
            settings: {
                filter: params?.config?.filter,
                indexes: params?.settings?.indexes?.filter((n) => validateCustomIndex(n)),
                rawIndexes: params?.settings?.rawIndexes?.filter((n) => validateCustomIndex(n)),
                deduplicationStrategy: params?.settings?.deduplicationStrategy || FULL_PAYLOAD_DEDUPLICATION_STRATEGY,
                retentionHours: params?.settings?.retentionHours || 1
            }
        })

        const [rawBucket] = await bucketModel.create([
            payload
        ], { session })

        bucket = rawBucket?.toJSON()

        await session.commitTransaction()


    } catch (e) {
        await session.abortTransaction();
        throw e;
    } finally {
        session.endSession()
    }

    await updateBucketCache(bucket?.id)

    initLogger(bucket)?.catch(console.error)

    return bucket

}

/**
 * 
 * @param {*} id 
 * @param {*} params 
 * @param {*} param2 
 * @returns 
 */
const updateBucket = async (id, params, { initLogger }) => {

    if (!isValidObjectId(id)) {
        throw HttpError(INVALID_INPUT_ERR_CODE, INVALID_ID_ERR_MESSAGE)
    }

    const bucket = await getBucketFromCache(id)
    if (!bucket) {
        throw HttpError(NOT_FOUND_ERR_CODE, NOT_FOUND_ERR_MESSAGE)
    }

    const v = new Validator(params, {
        title: "required|string",
        indexes: "arrayUnique",
        filter: "arrayUnique",
        rawIndexes: "arrayUnique",
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
                `Bucket "${bucket.title}" uses INDEX_ONLY deduplication but has no indexes defined. `
            );
        }
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    await bucketModel.findByIdAndUpdate(id,
        {
            $set: sanitizeObject({
                title: striptags(params?.title),
                "settings.filter": params?.config?.filter,
                "settings.indexes": params?.indexes?.filter((n) => validateCustomIndex(n)),
                "settings.rawIndexes": params?.rawIndexes?.filter((n) => validateCustomIndex(n)),
                "settings.deduplicationStrategy": params?.deduplicationStrategy || FULL_PAYLOAD_DEDUPLICATION_STRATEGY,
                "settings.retentionHours": params?.retentionHours || 1
            })
        }
    )

    const updated = await updateBucketCache(id)

    initLogger(updated)

    return updated
}

/**
 * 
 * @param {string} id 
 * @param {*} param1 
 * @returns 
 */
const removeBucket = async (id, { getLogModel }) => {
    if (!isValidObjectId(id)) {
        throw HttpError(INVALID_INPUT_ERR_CODE, INVALID_ID_ERR_MESSAGE)
    }

    const bucket = await getBucketFromCache(id)
    if (!bucket) {
        throw HttpError(NOT_FOUND_ERR_CODE, NOT_FOUND_ERR_MESSAGE)
    }

    const bucketObjectId = ObjectId.createFromHexString(id.toString());
    const { log, logstamp } = await getLogModel(id)

    await Promise.all([
        bucketModel.findByIdAndDelete(id),
        log.collection.drop(),
        logstamp.collection.drop(),
        probeModel.deleteMany({ bucket: bucketObjectId }),
        widgetModel.deleteMany({ bucket: bucketObjectId })
    ])

    return null

}

/**
 * 
 * @param {*} params 
 * @returns 
 */
const buildBucketSearchQuery = (params = {}) => {
    let queryBucket = {};
    let queryUser = {};

    if (params.search && typeof params.search === "string") {
        queryBucket.$or = [
            {
                title: {
                    $regex: params?.search,
                    $options: "i"
                }
            }
        ];
    }

    if (params?.project && isValidObjectId(params?.project)) {
        queryBucket.projects = ObjectId.createFromHexString(params?.project);
    }

    if (params?.user && isValidObjectId(params?.user)) {
        queryUser["user.userId"] = ObjectId.createFromHexString(params?.user);
    }

    return {
        queryUser,
        queryBucket
    };
};


const paginateBucket = async (query = {}, sortBy = "createdAt:desc", limit = 10, page = 1) => {
    const {
        queryUser,
        queryBucket
    } = buildBucketSearchQuery(query);

    limit = num2Ceil(num2Floor(limit, 1), 50);
    page = num2Floor(page, 1);
    const sort = parseSortBy(sortBy);

    const aggregate = projectUserModel.aggregate([
        { $match: queryUser }, // Filter by user first
        {
            $lookup: {
                from: "buckets", // Join with probes collection
                localField: "project",
                foreignField: "projects",
                as: "buckets",
            },
        },
        { $unwind: "$buckets" }, // Unwind probes array
        { $replaceRoot: { newRoot: "$buckets" } }, // Replace root with probe
        { $match: queryBucket }, // Apply probe filters (search, project)
        {
            $lookup: {
                from: "projects", // Get project details
                localField: "project",
                foreignField: "_id",
                as: "projectData",
            },
        },
        { $unwind: "$projectData" },
        {
            $sort: {
                ...sort
            }
        }
    ]);

    let options = { page, limit };

    let res = await projectUserModel.aggregatePaginate(aggregate, options);

    let list = {
        results: await Promise.all(res?.docs?.map(async (n) => {
            return {
                id: n?._id?.toString(),
                title: n?.title,
                project: {
                    id: n?.project?.toString(),
                    title: n?.projectData?.title,
                    slug: n?.projectData?.slug
                },
                createdAt: n?.createdAt,
                updatedAt: n?.updatedAt,

            };
        })),
        page,
        totalResults: res.total,
        totalPages: res.pages,
    };

    return list;
};

const listUserBucket = async (userId) => {

    if (!isValidObjectId(userId)) {
        throw HttpError(INVALID_INPUT_ERR_CODE, INVALID_ID_ERR_MESSAGE)
    }

    const bucket = await projectUserModel.aggregate([
        {
            $match: { 'user.userId': ObjectId.createFromHexString(userId) }
        },
        {
            $lookup: {
                from: 'buckets', // your projects collection name
                localField: 'project',
                foreignField: 'projects',
                as: 'bucketDetails'
            }
        },
        {
            $unwind: '$bucketDetails'
        },
        {
            $replaceRoot: { newRoot: '$bucketDetails' }
        }
    ]);

    return bucket?.map(mapBucket)
}

const generateHourlyActivity = (activityMap, hoursToTrack) => {
    return Array.from({ length: hoursToTrack }, (_, i) => {
        const date = new Date(Date.now() - (hoursToTrack - 1 - i) * 60 * 60 * 1000);
        const key = date.toISOString().slice(0, 13).replace('T', '-');
        return activityMap.get(key) || 0;
    });
};

const getUsersBucketStats = async (userId, getLogModel) => {
    if (!isValidObjectId(userId)) {
        throw HttpError(INVALID_INPUT_ERR_CODE, INVALID_ID_ERR_MESSAGE);
    }

    const HOURS_TO_TRACK = 7;
    const MILLISECONDS_PER_HOUR = 60 * 60 * 1000;
    const activityCutoff = new Date(Date.now() - HOURS_TO_TRACK * MILLISECONDS_PER_HOUR);

    // Get all user buckets with bucket details in one query
    const usersBuckets = await projectUserModel.aggregate([
        {
            $match: {
                'user.userId': ObjectId.createFromHexString(userId)
            }
        },
        {
            $lookup: {
                from: "buckets",
                localField: "project",
                foreignField: "projects",
                as: "bucket"
            }
        },
        { $unwind: "$bucket" },
        {
            $group: {
                _id: "$bucket._id",
                title: { $first: "$bucket.title" }
            }
        },
        {
            $project: {
                _id: 0,
                id: "$_id",
                title: "$title"
            }
        }
    ]);

    if (!usersBuckets.length) {
        return [];
    }

    const logModelPromises = usersBuckets.map(bucket =>
        getLogModel(bucket.id)
            .then(logModel => ({ bucketId: bucket.id, logModel }))
            .catch((err) => {
                console.log('Error getting log model for bucket:', bucket.id, err);
                return null;
            })
    );

    const logModelsArray = await Promise.all(logModelPromises);
    const logModelsMap = new Map(
        logModelsArray
            .filter(item => item !== null)
            .map(({ bucketId, logModel }) => [bucketId, logModel])
    );

    // Process all bucket aggregations in parallel
    const bucketsWithStats = await Promise.allSettled(
        usersBuckets.map(async (bucket) => {
            const bucketId = bucket.id.toString();

            const logModelData = logModelsMap.get(bucket.id);
            if (!logModelData) {
                console.log(`No log model for bucket: ${bucketId}`);
                return {
                    id: bucketId,
                    title: bucket.title,
                    status: 'inactive',
                    lastLog: 'Never',
                    totalLogs: 0,
                    errorCount: 0,
                    criticalCount: 0,
                    activity: generateHourlyActivity(new Map(), HOURS_TO_TRACK)
                };
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

                const lastLogDate = result.lastLog[0]
                    ? new Date(result.lastLog[0].updatedAt)
                    : null;

                const activityMap = new Map(
                    result.activity.map(item => [item._id, item.count])
                );

                const errorStats = new Map(
                    result.errorStats.map(item => [item._id, item.total])
                );

                return {
                    id: bucketId,
                    title: bucket.title,
                    status: lastLogDate && isRecent(lastLogDate) ? 'active' : 'inactive',
                    lastLog: lastLogDate ? moment(lastLogDate).fromNow() : 'Never',
                    totalLogs: result.totalLogs[0]?.total || 0,
                    errorCount: errorStats.get(ERROR_LOG_LEVEL) || 0,
                    criticalCount: errorStats.get(CRITICAL_LOG_LEVEL) || 0,
                    activity: generateHourlyActivity(activityMap, HOURS_TO_TRACK)
                };
            } catch (error) {
                console.log(`Error aggregating logs for bucket: ${bucketId}`, error);
                return {
                    id: bucketId,
                    title: bucket.title,
                    status: 'inactive',
                    lastLog: 'Never',
                    totalLogs: 0,
                    errorCount: 0,
                    criticalCount: 0,
                    activity: generateHourlyActivity(new Map(), HOURS_TO_TRACK)
                };
            }
        })
    );

    return bucketsWithStats
        .filter(result => result.status === 'fulfilled')
        .map(result => result.value);
};

module.exports = {
    createBucket,
    updateBucket,
    removeBucket,
    paginateBucket,
    listUserBucket,
    getUsersBucketStats
}