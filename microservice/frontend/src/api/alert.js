import Axios from "./AxiosClient";

export const createAlert = async (signal, payload) => {
    const { data } = await Axios.post('/v1/alerts', payload, { signal });
    return data?.data;
};

export const paginateAlerts = async (signal, params = {}) => {
    const { data } = await Axios.get('/v1/alerts', { params, signal });
    return data?.data;
};

export const updateAlert = async (signal, id, payload) => {
    const { data } = await Axios.put(`/v1/alerts/${id}`, payload, { signal });
    return data?.data;
};

export const deleteAlert = async (signal, id) => {
    const { data } = await Axios.delete(`/v1/alerts/${id}`, { signal });
    return data?.data;
};

export const findAlertById = async (signal, id) => {
    const { data } = await Axios.get(`/v1/alerts/${id}`, { signal });
    return data?.data;
};
