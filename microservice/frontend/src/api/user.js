//@ts-check

import Axios from "./AxiosClient";


/**
 * 
 * @param {*} signal 
 * @returns 
 */
export const getCurrentUser = async (signal) => {
    let { data } = await Axios.get("/v1/users/me", {
        signal
    });
    return data?.data;
}

/**
 * 
 * @param {object} payload 
 * @param {*} signal 
 * @returns 
 */
export const userLogin = async (payload, signal) => {
    let { data } = await Axios.post("/v1/users/login", payload, {
        signal
    });
    return data?.data;
}

/**
 * 
 * @param {*} signal 
 * @returns 
 */
export const userLogout = async (signal) => {
    let { data } = await Axios.post("/v1/users/logout", {}, {
        signal
    });
    return data?.data;
}


/**
 * 
 * @param {*} signal 
 * @returns 
 */
export const getUserProjectStats = async (signal) => {
    let { data } = await Axios.get("/v1/users/me/project-stats", {
        signal
    });
    return data?.data;
}

/**
 * 
 * @param {*} signal 
 * @returns 
 */
export const getUserBucketStats = async (signal) => {
    let { data } = await Axios.get("/v1/users/me/bucket-stats", {
        signal
    });
    return data?.data;
}

/**
 * 
 * @param {*} signal 
 * @param {object} params 
 * @returns 
 */
export const paginateUser = async (signal, params) => {
    let { data } = await Axios.get("/v1/users", {
        params,
        signal
    });
    return data?.data;
}

/**
 * 
 * @param {*} signal 
 * @returns 
 */
export const listAllUser = async (signal) => {

    const firstPage = await paginateUser(signal, {});

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
                await paginateUser(signal, {
                    page,
                    limit: 50
                })
            );
        }

        const remainingPages = await Promise.all(pagePromises);
        remainingPages.forEach(pageData => {
            if (pageData?.results?.length) {
                res.push(...pageData.results);
            }
        });
    }

    return res?.sort((a, b) => a.fullname.localeCompare(b.fullname));
}

/**
 * 
 * @param {*} signal 
 * @param {string} id 
 * @returns 
 */
export const removeUser = async (signal, id) => {
    let { data } = await Axios.delete(`/v1/users/${id}`, {
        signal
    });
    return data?.data;
}

/**
 * 
 * @param {*} signal 
 * @param {string} id 
 * @param {object} payload 
 * @returns 
 */
export const updateUser = async (signal, id, payload) => {
    let { data } = await Axios.put(`/v1/users/${id}`, payload, {
        signal
    });
    return data?.data;
}

/**
 * 
 * @param {*} signal 
 * @returns 
 */
export const listMyProject = async (signal) => {
    let { data } = await Axios.get("/v1/users/me/projects", {
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
export const updateMyProfile = async (signal, payload) => {
    let { data } = await Axios.put(`/v1/users/me`, payload, {
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
export const updateMyPassword = async (signal, payload) => {
    let { data } = await Axios.patch(`/v1/users/me/password`, payload, {
        signal
    });
    return data?.data;
}