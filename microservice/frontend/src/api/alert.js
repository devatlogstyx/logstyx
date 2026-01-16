import Axios from "./AxiosClient";

export const createAlert = async (payload) => {
    const { data } = await Axios.post('/v1/alerts', payload);
    return data?.data;
};

export const paginateAlerts = async (params = {}) => {
    const { data } = await Axios.get('/v1/alerts', { params });
    return data?.data;
};

export const updateAlert = async (id, payload) => {
    const { data } = await Axios.put(`/v1/alerts/${id}`, payload);
    return data?.data;
};

export const deleteAlert = async (id) => {
    const { data } = await Axios.delete(`/v1/alerts/${id}`);
    return data?.data;
};

export const findAlertById = async (id) => {
    const { data } = await Axios.get(`/v1/alerts/${id}`);
    return data?.data;
};
