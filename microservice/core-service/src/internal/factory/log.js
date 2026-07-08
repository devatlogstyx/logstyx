//@ts-check

const { NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE, FULL_PAYLOAD_DEDUPLICATION_STRATEGY, NONE_DEDUPLICATION_STRATEGY, INDEX_ONLY_DEDUPLICATION_STRATEGY } = require("common/constant");
const { HttpError, num2Int, getNestedValue, hashString, evaluateCondition, decryptAndDecompress } = require("common/function");
const { validateCustomIndex, sanitizeFieldName } = require("./bucket");
const crypto = require("crypto");

/**
 *
 * @param {object} project
 * @param {object} project.settings
 * @param {string[]} project.settings.allowedOrigin
 * @param {string} origin
 */
const validateOrigin = (project, origin) => {

    if (!project?.settings?.allowedOrigin?.includes(origin)) {
        throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
    }

    return true

}

/**
 *
 * @param {*} project
 * @param {*} headers
 * @param {*} body
 */
const validateSignature = (project, headers, body) => {
    const { level, projectId, device, context, data } = body

    const { timestamp, signature } = headers;

    const payload = {
        level,
        projectId,
        device,
        context,
        data
    };

    let params = JSON.stringify(payload);
    const Hash = projectId + params + num2Int(timestamp);

    const serverSignature = crypto
        .createHmac(`SHA256`, project?.secret)
        .update(Hash)
        .digest("hex")
        .toUpperCase();

    if (serverSignature !== signature) {
        throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
    }

    return true
}

/**
 *
 * @param {*} log
 * @param {*} bucket
 * @returns
 */
const generateIndexedHashes = (log, bucket) => {
    const hashes = {};

    // Loop through bucket's indexed fields
    for (const fieldPath of bucket.settings.indexes) {
        // Extract value from log (context.userId, data.errorMessage, etc.)
        const value = getNestedValue(log, fieldPath);

        // Only hash if value exists
        if (value !== undefined && value !== null) {
            // Convert field path to hash key: "context.userId" -> "context_userId"
            const hashKey = sanitizeFieldName(fieldPath);

            // Hash with salt (bucket + field for isolation)
            // @ts-ignore
            hashes[hashKey] = hashString(
                String(value),
                fieldPath
            );
        }
    }

    return hashes;
}

/**
 *
 * @param {*} data
 * @param {*} bucket
 * @returns
 */
const generateRawValues = (data, bucket) => {

    if (!bucket?.settings?.rawIndexes || bucket.settings.rawIndexes.length === 0) {
        return {};
    }

    const rawValues = {};

    for (const field of bucket.settings.rawIndexes) {
        // Search in the original data structure, not flattened
        const value = getNestedValue(data, field);

        if (value !== undefined && value !== null) {
            const safeFieldName = sanitizeFieldName(field);
            rawValues[safeFieldName] = value;
        }
    }

    return rawValues;
};

/**
 *
 * @param {number} date
 * @param {number} thresholdHours
 * @returns
 */
function isRecent(date, thresholdHours = 24) {
    const hoursSince = (new Date() - date) / (1000 * 60 * 60);
    return hoursSince < thresholdHours;
}

/**
 *
 * @param {*} params
 * @param {*} bucket
 * @returns
 */
const generateLogKey = (params, bucket) => {
    const strategy = bucket?.settings?.deduplicationStrategy || FULL_PAYLOAD_DEDUPLICATION_STRATEGY;

    switch (strategy) {
        case NONE_DEDUPLICATION_STRATEGY: {
            // Every log is unique - generate random key
            // Use timestamp + random to ensure uniqueness
            return hashString(
                `${Date.now()}_${Math.random()}_${JSON.stringify(params)}`
            );
        }

        case INDEX_ONLY_DEDUPLICATION_STRATEGY: {
            // Hash only level + indexed fields
            const keyData = {
                level: params?.level,
            };

            // Extract values from indexed fields
            const indexes = bucket?.settings?.indexes || [];
            for (const fieldPath of indexes) {
                const value = getNestedValue({
                    context: params?.context,
                    data: params?.data
                }, fieldPath);

                if (value !== undefined && value !== null) {
                    // Use fieldPath as key to maintain structure
                    keyData[fieldPath] = value;
                }
            }

            return hashString(JSON.stringify(keyData));
        }

        case FULL_PAYLOAD_DEDUPLICATION_STRATEGY:
        default: {
            // Hash everything (level, device, context, data)
            const fullPayload = {
                level: params?.level,
                ...params?.device,
                ...params?.context,
                ...params?.data
            };

            return hashString(JSON.stringify(fullPayload));
        }
    }
};

/**
 *
 * @param {*} data
 * @param {*} filters
 * @returns
 */
const evaluateBucketFilter = (data, filters) => {
    return filters.every(filter => evaluateCondition(data, filter));
};

/**
 *
 * @param {object} [params]
 * @param {string[]} [params.filterFields]
 * @param {string[]} [params.filterValues]
 * @param {string[]} [params.filterOperators]
 * @param {object} [bucket]
 * @returns
 */
const buildLogsSearchQuery = (params = {}, bucket) => {
    let query = {}

    if (params.filterFields && params.filterValues &&
        params.filterFields.length > 0 &&
        params.filterFields.length === params.filterValues.length) {

        params.filterFields.forEach((field, index) => {
            const value = params?.filterValues?.[index]
            const operator = params?.filterOperators?.[index] || 'eq' // Default to equals

            if (field && value !== undefined && value !== null) {

                // Check if field is in rawIndexes
                if (bucket?.settings?.rawIndexes?.includes(field)) {
                    const safeFieldName = sanitizeFieldName(field)
                    const queryField = `raw.${safeFieldName}`

                    // Support range operators for numeric fields
                    switch (operator) {
                        case 'gt':
                            query[queryField] = { $gt: Number(value) }
                            break
                        case 'gte':
                            query[queryField] = { $gte: Number(value) }
                            break
                        case 'lt':
                            query[queryField] = { $lt: Number(value) }
                            break
                        case 'lte':
                            query[queryField] = { $lte: Number(value) }
                            break
                        case 'eq':
                        default:
                            query[queryField] = Number(value)
                    }

                } else if (validateCustomIndex(field)) {
                    // Hashed fields only support exact match
                    query[`hash.${sanitizeFieldName(field)}`] = hashString(
                        String(value),
                        field
                    )
                } else {
                    // Regular fields
                    query[field] = value
                }
            }
        })
    }

    return query
}

/**
 *
 * @param {*} json
 * @returns
 */
const mapLog = async (json) => {
    return {
        id: json?.id || json?._id?.toString(),
        key: json?.key,
        level: json?.level,
        device: json?.device,
        context: await decryptAndDecompress(json?.context),
        data: await decryptAndDecompress(json?.data),
        hash: json?.hash,
        count: json?.count,
        createdAt: json?.createdAt,
        updatedAt: json?.updatedAt,
    }
}

const HToMs = (num) => num2Int(num) * 60 * 60 * 1000;

module.exports = {
    validateOrigin,
    validateSignature,
    generateIndexedHashes,
    generateRawValues,
    isRecent,
    generateLogKey,
    evaluateBucketFilter,
    buildLogsSearchQuery,
    mapLog,
    HToMs
}
