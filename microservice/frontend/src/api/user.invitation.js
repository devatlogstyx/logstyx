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
    let page = 1
    /**
     * @type {any[]}
     */
    let res = [];

    while (true) {
        let list = await paginateUserInvitation(signal, {
            page,
            limit: 50
        });


        res = [...res, ...(list?.results || [])];  // Append new results
        if (!list?.totalPages || page >= list?.totalPages) {
            break;
        }

        page += 1;

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