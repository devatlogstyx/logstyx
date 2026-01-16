//@ts-check

import Axios from "./AxiosClient";

/**
 * 
 * @param {*} signal 
 * @param {object} payload 
 * @returns 
 */
export const createUserInvitation = async (signal, payload) => {
    let { data } = await Axios.post("/v1/user-invitations", payload, {
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
export const updateUserInvitation = async (signal, id, payload) => {
    let { data } = await Axios.put(`/v1/user-invitations/${id}`, payload, {
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
export const paginateUserInvitation = async (signal, params) => {
    let { data } = await Axios.get("/v1/user-invitations", {
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
export const listAllUserInvitation = async (signal) => {

    const firstPage = await paginateUserInvitation(signal, {});

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
                await paginateUserInvitation(signal, {
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

    return res;

}

/**
 * 
 * @param {*} signal 
 * @param {string} id 
 * @returns 
 */
export const removeUserInvitation = async (signal, id) => {
    let { data } = await Axios.delete(`/v1/user-invitations/${id}`, {
        signal
    });
    return data?.data;
}

/**
 * 
 * @param {*} signal 
 * @param {string | undefined} id 
 * @param {object} payload 
 * @returns 
 */
export const validateUserInvitation = async (signal, id, payload) => {
    let { data } = await Axios.post(`/v1/user-invitations/${id}/validate`, payload, {
        signal
    });
    return data?.data;
}