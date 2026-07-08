//@ts-check

/**
 *
 * @param {object} [params]
 * @param {string} [params.search]
 * @returns
 */
const buildWebhookSearchQuery = (params = {}) => {
    let query = {}

    if (params?.search && typeof params?.search === "string") {
        query.$or = [
            {
                title: {
                    $regex: params.search,
                    $options: "i"
                }
            }
        ]
    }

    return query
}

module.exports = {
    buildWebhookSearchQuery
}
