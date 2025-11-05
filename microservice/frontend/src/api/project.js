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