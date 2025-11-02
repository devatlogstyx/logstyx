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
export const getUserDashboardProjectStats = async (signal) => {
    let { data } = await Axios.get("/v1/users/me/dashboard-project-stats", {
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
    let page = 1
    /**
     * @type {any[]}
     */
    let res = [];

    while (true) {
        let list = await paginateUser(signal, {
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