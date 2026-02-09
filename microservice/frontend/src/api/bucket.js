//@ts-check


import Axios from "./AxiosClient";

/**
 * 
 * @param {*} signal 
 * @param {*} params 
 * @returns 
 */
export const listMyBucket = async (signal) => {
    let { data } = await Axios.get(`/v1/users/me/buckets`, {
        signal,
    });
    return data?.data;
}


/**
 * 
 * @param {*} signal 
 * @param {*} bucketId 
 * @returns 
 */
export const findBucketById = async (signal, bucketId) => {
    let { data } = await Axios.get(`/v1/buckets/${bucketId}`, {
        signal
    });
    return data?.data;
}

/**
 * 
 * @param {*} signal 
 * @param {*} bucketId 
 * @returns 
 */
export const getBucketLogStats = async (signal, bucketId) => {
    let { data } = await Axios.get(`/v1/buckets/${bucketId}/logs-statistic`, {
        signal
    });
    return data?.data;
}

/**
 * 
 * @param {*} signal 
 * @param {string} bucketId 
 * @param {string} logKey 
 * @returns 
 */
export const getLogTimeline = async (signal, bucketId, logKey) => {
    let { data } = await Axios.get(`/v1/buckets/${bucketId}/logs/${logKey}/timeline`, {
        signal
    });
    return data?.data;
}

export const listBucketTimeline = async (signal, bucketId, params) => {
    let { data } = await Axios.get(`/v1/buckets/${bucketId}/logs/timeline`, {
        signal,
        params
    });
    return data?.data;
}

/**
 * 
 * @param {*} signal 
 * @param {string} bucketId 
 * @param {object} params 
 * @returns 
 */
export const paginateBucketLogs = async (signal, bucketId, params) => {
    let { data } = await Axios.get(`/v1/buckets/${bucketId}/logs`, {
        signal,
        params
    });
    return data?.data;
}

/**
 * 
 * @param {*} signal 
 * @param {string} bucketId 
 * @param {string} field 
 * @returns 
 */
export const listBucketDistinctValues = async (signal, bucketId, field) => {
    let { data } = await Axios.get(`/v1/buckets/${bucketId}/logs/field-values`, {
        signal,
        params: {
            field
        }
    });
    return data?.data;
}



/**
 * 
 * @param {*} signal 
 * @param {string} bucketId 
 * @param {object} payload 
 * @returns 
 */
export const updateBucket = async (signal, bucketId, payload) => {
    let { data } = await Axios.put(`/v1/buckets/${bucketId}`, payload, {
        signal
    });
    return data?.data;
}

/**
 * 
 * @param {*} signal 
 * @param {*} id 
 * @returns 
 */
export const deleteBucket = async (signal, id) => {
    const { data } = await Axios.delete(`/v1/buckets/${id}`, { signal });
    return data?.data;
};

/**
 * 
 * @param {*} signal 
 * @param {*} payload 
 * @returns 
 */
export const createBucket = async (signal, payload) => {
    let { data } = await Axios.post(`/v1/buckets`, payload, {
        signal
    });
    return data?.data;
}