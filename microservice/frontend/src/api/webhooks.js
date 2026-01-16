import Axios from "./AxiosClient";

export const createWebhook = async (payload) => {
    const { data } = await Axios.post('/v1/webhooks', payload);
    return data?.data;
};

export const paginateWebhooks = async (params = {}) => {
    const { data } = await Axios.get('/v1/webhooks', { params });
    return data?.data;
};

export const updateWebhook = async (id, payload) => {
    const { data } = await Axios.put(`/v1/webhooks/${id}`, payload);
    return data?.data;
};

export const deleteWebhook = async (id) => {
    const { data } = await Axios.delete(`/v1/webhooks/${id}`);
    return data?.data;
};

export const findWebhookById = async (id) => {
    const { data } = await Axios.get(`/v1/webhooks/${id}`);
    return data?.data;
};
