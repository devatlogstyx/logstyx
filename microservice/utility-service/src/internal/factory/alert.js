//@ts-check

const { getNestedValue, evaluateCondition } = require("common/function");

/**
 *
 * @param {*} data
 * @param {*} filters
 * @returns
 */
const evaluateAlertFilter = (data, filters) => {
    return filters.every(filter => evaluateCondition(data, filter));
};

/**
 *
 * @param {object} [params]
 * @param {string} [params.search]
 * @returns
 */
const buildAlertSearchQuery = (params = {}) => {
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
    evaluateAlertFilter,
    buildAlertSearchQuery
}
