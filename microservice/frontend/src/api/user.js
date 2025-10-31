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