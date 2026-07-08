//@ts-check

const { isValidObjectId, mongoose } = require("../../shared/mongoose")
const { NONE_PROBE_AUTH_TYPE, BEARER_PROBE_AUTH_TYPE, BASIC_PROBE_AUTH_TYPE, PROBESTYX_PROBE_AUTH_TYPE, CUSTOM_PROBE_AUTH_TYPE } = require("common/constant")
const { ObjectId } = mongoose.Types
const crypto = require('crypto');

/**
 *
 * @param {object} [params]
 * @param {string} [params.search]
 * @param {string} [params.project]
 * @param {string} [params.user]
 * @returns
 */
const buildProbeSearchQuery = (params = {}) => {
    let queryProbe = {};
    let queryUser = {};

    if (params.search && typeof params.search === "string") {
        queryProbe.$or = [
            {
                title: {
                    $regex: params?.search,
                    $options: "i"
                }
            }
        ];
    }

    if (params?.project && isValidObjectId(params?.project)) {
        queryProbe.project = ObjectId.createFromHexString(params?.project);
    }

    if (params?.user && isValidObjectId(params?.user)) {
        queryUser["user.userId"] = ObjectId.createFromHexString(params?.user);
    }

    return {
        queryUser,
        queryProbe
    };
};

/**
 * Generate HMAC signature for Probestyx authentication
 * @param {string} secret
 * @returns
 */
const generateProbestyxAuth = (secret) => {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(timestamp);
    const signature = hmac.digest('hex');

    return { timestamp, signature };
};

/**
 * Build auth headers based on connection auth type
 *
 * @param {*} auth
 * @returns
 */
const buildAuthHeaders = (auth) => {
    const headers = {};

    switch (auth.type) {
        case NONE_PROBE_AUTH_TYPE:
            // No auth headers
            break;

        case BEARER_PROBE_AUTH_TYPE:
            headers['Authorization'] = `Bearer ${auth.token}`;
            break;

        case BASIC_PROBE_AUTH_TYPE:
            const encoded = Buffer
                .from(`${auth.username}:${auth.password}`)
                .toString('base64');
            headers['Authorization'] = `Basic ${encoded}`;
            break;

        case PROBESTYX_PROBE_AUTH_TYPE:
            const { timestamp, signature } = generateProbestyxAuth(auth.secret);
            headers['X-Timestamp'] = timestamp;
            headers['X-Signature'] = signature;
            break;

        case CUSTOM_PROBE_AUTH_TYPE:
            // Custom headers directly from auth config
            Object.assign(headers, auth.headers || {});
            break;
    }

    return headers;
};

module.exports = {
    buildProbeSearchQuery,
    generateProbestyxAuth,
    buildAuthHeaders
}
