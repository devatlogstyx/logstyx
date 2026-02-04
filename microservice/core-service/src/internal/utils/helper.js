//@ts-check

const { NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE, FULL_PAYLOAD_DEDUPLICATION_STRATEGY, NONE_DEDUPLICATION_STRATEGY, INDEX_ONLY_DEDUPLICATION_STRATEGY } = require("common/constant");
const { HttpError, num2Int, getNestedValue, hashString, evaluateCondition } = require("common/function");
const { default: striptags } = require("striptags")
const crypto = require("crypto");

/**
 * 
 * @param {string} field 
 * @returns 
 */
const validateCustomIndex = (field, maxDepth = 5) => {
    const cleaned = striptags(field);

    // Must start with context or data
    if (!/^(context|data)\./.test(cleaned)) {
        return false;
    }

    // Check valid identifier pattern
    if (!/^(context|data)(\.[a-zA-Z_$][\w$]*)+$/.test(cleaned)) {
        return false;
    }

    // Limit depth (prevent data.a.b.c.d.e.f.g.h.i.j...)
    const depth = cleaned.split('.').length - 1; // -1 because first is context/data
    if (depth > maxDepth) {
        return false;
    }

    return true;
}


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
 * @param {*} project 
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
            const hashKey = fieldPath.replace(/\./g, '_');

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
            const safeFieldName = field.replace(/\./g, '_');
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


const buildMongoFilterQuery = (filters = {}, project = null) => {
    /**
     * 
     * @param {*} field 
     * @param {*} operator 
     * @param {*} val 
     * @returns 
     */
    const makeCond = (field, operator, val) => {
        if (field === 'level') {
            if (operator === 'ne') return { level: { $ne: val } };
            if (operator === 'contains' && typeof val === 'string') return { level: { $regex: String(val), $options: 'i' } };
            return { level: val };
        }
        const path = field.replace(/\./g, '_');
        const hashKey = `hash.${path}`;
        const rawKey = `raw.${path}`;
        const isRaw = project?.settings?.rawIndexes?.includes(field);

        if (isRaw) {
            if (['gt', 'gte', 'lt', 'lte'].includes(operator)) {
                const num = isNaN(Number(val)) ? val : Number(val);
                return { [rawKey]: { [`$${operator}`]: num } };
            }
            if (operator === 'ne') return { [rawKey]: { $ne: val } };
            if (operator === 'contains' && typeof val === 'string') return { [rawKey]: { $regex: String(val), $options: 'i' } };
            return { [rawKey]: val };
        } else {
            const hashed = hashString(String(val), field);
            if (operator === 'ne') return { [hashKey]: { $ne: hashed } };
            return { [hashKey]: hashed };
        }
    };

    if (Array.isArray(filters)) {
        const andConds = [];
        for (const f of filters) {
            if (!f || !f.field) continue;
            const operator = f.operator || 'eq';
            andConds.push(makeCond(f.field, operator, f.value));
        }
        return andConds.length ? { $and: andConds } : {};
    }

    const query = {};
    if (!filters || typeof filters !== 'object') return query;
    for (const [key, value] of Object.entries(filters)) {
        Object.assign(query, makeCond(key, 'eq', value));
    }
    return query;
}

/**
 * 
 * @param {*} data 
 * @param {*} filters 
 * @returns 
 */
const evaluateBucketFilter = (data, filters) => {
    return filters.every(filter => evaluateCondition(data, filter));
};


module.exports = {
    validateCustomIndex,
    validateOrigin,
    validateSignature,
    generateIndexedHashes,
    isRecent,
    generateRawValues,
    generateLogKey,
    buildMongoFilterQuery,
    evaluateBucketFilter
}