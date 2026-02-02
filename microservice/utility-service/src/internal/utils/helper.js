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

module.exports = {
    evaluateAlertFilter,
}