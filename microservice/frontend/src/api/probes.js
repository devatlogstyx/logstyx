//@ts-check
import Axios from "./AxiosClient";

/**
 * 
 * @param {*} signal 
 * @param {*} payload 
 * @returns 
 */
export const createProbe = async (signal, payload) => {
    let { data } = await Axios.post(`/v1/probes`, payload, {
        signal
    });
    return data?.data;
}


/**
 * 
 * @param {*} signal 
 * @param {*} id 
 * @param {*} payload 
 * @returns 
 */
export const updateProbe = async (signal, id, payload) => {
    let { data } = await Axios.put(`/v1/probes/${id}`, payload, {
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
export const findProbeById = async (signal, id) => {
    let { data } = await Axios.get(`/v1/probes/${id}`, {
        signal
    });
    return data?.data;
}

/**
 * 
 * @param {*} signal 
 * @param {*} params 
 * @returns 
 */
export const paginateProbe = async (signal, params) => {
    let { data } = await Axios.get(`/v1/probes`, {
        signal,
        params
    });
    return data?.data;
}

/**
 * 
 * @param {*} signal 
 * @param {*} payload 
 * @returns 
 */
export const testProbeConnection = async (signal, payload) => {
    let { data } = await Axios.post(`/v1/probes/test-connection`, payload, { signal });
    return data?.data;
}

/**
 * 
 * @param {*} signal 
 * @param {*} id 
 * @returns 
 */
export const removeProbe = async (signal, id) => {
    let { data } = await Axios.delete(`/v1/probes/${id}`, {
        signal
    });
    return data?.data;
}