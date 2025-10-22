//@ts-check

const { default: striptags } = require("striptags")
/**
 * 
 * @param {string} field 
 * @returns 
 */
const validateCustomIndex = (field) => {
    return /^(context|data)\.[a-zA-Z_$][\w$]*$/.test(striptags(field));
}

module.exports = {
    validateCustomIndex
}