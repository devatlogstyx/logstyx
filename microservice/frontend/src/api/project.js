//@ts-check
import axios from "axios"
import { API_HOST } from "../utils/constant";

const Axios = axios.create({
    baseURL: API_HOST,
    withCredentials: true,
});

/**
 * 
 * @param {*} signal 
 * @param {string} slug 
 * @returns 
 */
export const findProjectBySlug = async (signal, slug) => {

    let { data } = await Axios.get(`/v1/projects/${slug}`, {
        signal
    });
    return data?.data;
}

/**
 * 
 * @param {*} signal 
 * @param {string} projectid
 * @returns 
 */
export const listProjectUser = async (signal, projectid) => {
    let { data } = await Axios.get(`/v1/projects/${projectid}/users`, {
        signal
    });
    return data?.data;
}

/**
 * 
 * @param {*} signal 
 * @param {string} projectId 
 * @param {string} userId 
 * @returns 
 */
export const removeUserFromProject = async (signal, projectId, userId) => {
    let { data } = await Axios.delete(`/v1/projects/${projectId}/users/${userId}`, {
        signal
    });
    return data?.data;
}

/**
 * 
 * @param {*} signal 
 * @param {string} projectId 
 * @param {string} userId 
 * @returns 
 */
export const addUserToProject = async (signal, projectId, userId) => {
    let { data } = await Axios.patch(`/v1/projects/${projectId}/users/${userId}`, {}, {
        signal
    });
    return data?.data;
}

/**
 * 
 * @param {*} signal 
 * @param {string} projectId 
 * @returns 
 */
export const getProjectLogStats = async (signal, projectId) => {
    let { data } = await Axios.get(`/v1/projects/${projectId}/logs-statistic`, {
        signal
    });
    return data?.data;
}

/**
 * 
 * @param {*} signal 
 * @param {string} projectId 
 * @param {object} params 
 * @returns 
 */
export const paginateProjectLogs = async (signal, projectId, params) => {
    let { data } = await Axios.get(`/v1/projects/${projectId}/logs`, {
        signal,
        params
    });
    return data?.data;
}

/**
 * 
 * @param {*} signal 
 * @param {string} projectId 
 * @param {string} logKey 
 * @returns 
 */
export const getLogTimeline = async (signal, projectId, logKey) => {
    let { data } = await Axios.get(`/v1/projects/${projectId}/logs/${logKey}/timeline`, {
        signal
    });
    return data?.data;
}

export const updateProject = async (signal, projectId, payload) => {
    let { data } = await Axios.put(`/v1/projects/${projectId}`, payload, {
        signal
    });
    return data?.data;
}