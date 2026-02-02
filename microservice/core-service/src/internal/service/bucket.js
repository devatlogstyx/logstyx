//@ts-check

const { INVALID_INPUT_ERR_CODE, NOT_FOUND_ERR_CODE, USER_NOT_FOUND_ERR_MESSAGE, INDEX_ONLY_DEDUPLICATION_STRATEGY, FULL_PAYLOAD_DEDUPLICATION_STRATEGY, INVALID_ID_ERR_MESSAGE, NOT_FOUND_ERR_MESSAGE } = require("common/constant");
const { HttpError, sanitizeObject, num2Ceil, num2Floor, parseSortBy } = require("common/function");
const { Validator } = require("node-input-validator");
const { findUserById } = require("../../shared/provider/auth.service");
const { mongoose, isValidObjectId } = require("./../../shared/mongoose");
const { striptags } = require("striptags");
const projectModel = require("../model/project.model");
const { validateCustomIndex } = require("../utils/helper");
const bucketModel = require("../model/bucket.model");
const { updateBucketCache, getBucketFromCache } = require("../../shared/cache");
const probeModel = require("../model/probe.model");
const widgetModel = require("../model/widget.model");
const projectUserModel = require("../model/project.user.model");
const { ObjectId } = mongoose.Types


/**
 * 
 * @param {*} params 
 * @param {*} param1 
 * @returns 
 */
const createBucket = async (params, { initLoggerFunc }) => {

    const v = new Validator(params, {
        title: "required|string",
        projects: "required|arrayUnique",
        "settings.indexes": "arrayUnique",
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

    const session = await mongoose.startSession();
    session.startTransaction();

    try {

        const payload = sanitizeObject({
            title: striptags(params?.title),
            settings: {
                indexes: params?.settings?.indexes?.filter((n) => validateCustomIndex(n)),
                rawIndexes: params?.settings?.rawIndexes?.filter((n) => validateCustomIndex(n)),
                deduplicationStrategy: params?.settings?.deduplicationStrategy || FULL_PAYLOAD_DEDUPLICATION_STRATEGY,
                retentionHours: params?.settings?.retentionHours || 1
            }
        })

        const [rawBucket] = await bucketModel.create([
            payload
        ], { session })


        await session.commitTransaction()

        const bucket = await updateBucketCache(rawBucket?._id)

        initLoggerFunc(bucket)?.catch(console.error)

        return bucket

    } catch (e) {
        await session.abortTransaction();
        throw e;
    } finally {
        session.endSession()
    }

}

/**
 * 
 * @param {*} id 
 * @param {*} params 
 * @param {*} param2 
 * @returns 
 */
const updateBucket = async (id, params, { initLoggerFunc }) => {

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
                "settings.indexes": params?.indexes?.filter((n) => validateCustomIndex(n)),
                "settings.rawIndexes": params?.rawIndexes?.filter((n) => validateCustomIndex(n)),
                "settings.deduplicationStrategy": params?.deduplicationStrategy || FULL_PAYLOAD_DEDUPLICATION_STRATEGY,
                "settings.retentionHours": params?.retentionHours || 1
            })
        }
    )

    const updated = await updateBucketCache(id)

    initLoggerFunc(updated)

    return updated
}

/**
 * 
 * @param {string} id 
 */
const removeBucket = async (id, { getLogModelFunc }) => {
    if (!isValidObjectId(id)) {
        throw HttpError(INVALID_INPUT_ERR_CODE, INVALID_ID_ERR_MESSAGE)
    }

    const bucket = await getBucketFromCache(id)
    if (!bucket) {
        throw HttpError(NOT_FOUND_ERR_CODE, NOT_FOUND_ERR_MESSAGE)
    }

    const bucketObjectId = ObjectId.createFromHexString(id.toString());
    const { log, logstamp } = await getLogModelFunc(id)

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

module.exports = {
    createBucket,
    updateBucket,
    removeBucket,
    paginateBucket,
}