//@ts-check

import Axios from "./AxiosClient";

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
 * @param {string} field 
 * @returns 
 */
export const listProjectDistinctValues = async (signal, projectId, field) => {
    let { data } = await Axios.get(`/v1/projects/${projectId}/logs/field-values`, {
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

export const listProjectTimeline = async (signal, projectId, params) => {
    let { data } = await Axios.get(`/v1/projects/${projectId}/logs/timeline`, {
        signal,
        params
    });
    return data?.data;
}

/**
 * 
 * @param {*} signal 
 * @param {string} projectId 
 * @param {object} payload 
 * @returns 
 */
export const updateProject = async (signal, projectId, payload) => {
    let { data } = await Axios.put(`/v1/projects/${projectId}`, payload, {
        signal
    });
    return data?.data;
}

/**
 * 
 * @param {*} signal 
 * @param {object} payload 
 * @returns 
 */
export const createProject = async (signal, payload) => {
    let { data } = await Axios.post(`/v1/projects`, payload, {
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
export const removeProject = async (signal, projectId = "") => {
    let { data } = await Axios.delete(`/v1/projects/${projectId}`, {
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
export const paginateProject = async (signal, params) => {
    let { data } = await Axios.get(`/v1/projects`, {
        signal,
        params
    });
    return data?.data;
}

/**
 * 
 * @param {*} signal 
 * @returns 
 */
export const listAllMyProject = async (signal) => {
    const firstPage = await paginateProject(signal, { page: 1 })

    if (!firstPage?.results) {
        return [];
    }

    const res = [...firstPage.results];
    const totalPages = firstPage.totalPages || 1;

    // Fetch remaining pages in parallel
    if (totalPages > 1) {
        const pagePromises = [];
        for (let page = 2; page <= totalPages; page++) {
            pagePromises.push(
                paginateProject(signal, { page })
            );
        }

        const remainingPages = await Promise.all(pagePromises);
        remainingPages.forEach(pageData => {
            if (pageData?.results?.length) {
                res.push(...pageData.results);
            }
        });
    }

    return res?.sort((a, b) => a.title.localeCompare(b?.title))
}