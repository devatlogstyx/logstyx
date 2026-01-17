import Axios from "./AxiosClient";

export const createWebhook = async (signal, payload) => {
    const { data } = await Axios.post('/v1/webhooks', payload, { signal });
    return data?.data;
};

export const paginateWebhooks = async (signal, params = {}) => {
    const { data } = await Axios.get('/v1/webhooks', { signal, params });
    return data?.data;
};

export const updateWebhook = async (signal, id, payload) => {
    const { data } = await Axios.put(`/v1/webhooks/${id}`, payload, { signal });
    return data?.data;
};

export const deleteWebhook = async (signal, id) => {
    const { data } = await Axios.delete(`/v1/webhooks/${id}`, { signal });
    return data?.data;
};

export const findWebhookById = async (signal, id) => {
    const { data } = await Axios.get(`/v1/webhooks/${id}`, { signal });
    return data?.data;
};

export const listAllWebhook = async (signal) => {

    const firstPage = await paginateWebhooks(signal, {});

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
                await paginateWebhooks(signal, {
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

    return res?.sort((a, b) => a.title.localeCompare(b.title));
}