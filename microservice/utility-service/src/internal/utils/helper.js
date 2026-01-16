//@ts-check

/**
 * 
 * @param {string} templateStr 
 * @returns 
 */
const extractMustacheVars = (templateStr) => {
    if (!templateStr) return [];
    const regex = /\{\{([^}]+)\}\}/g;
    const matches = [];
    let match;

    while ((match = regex.exec(templateStr)) !== null) {
        const varName = match[1].trim();
        if (!matches.includes(varName)) {
            matches.push(varName);
        }
    }

    return matches;
};

/**
 * 
 * @param {*} obj 
 * @param {*} path 
 * @returns 
 */
const getNestedValue = (obj, path) => {
    return path.split('.').reduce((current, key) => {
        return current?.[key];
    }, obj);
};

/**
 * 
 * @param {*} data 
 * @param {*} filter 
 * @returns 
 */
const evaluateCondition = (data, filter) => {
    const { field, operator, value } = filter;
    const fieldValue = getNestedValue(data, field);

    // Handle null/undefined field values
    if (fieldValue === undefined || fieldValue === null) {
        return false;
    }

    switch (operator) {
        case 'gt':
            return Number(fieldValue) > Number(value);

        case 'gte':
            return Number(fieldValue) >= Number(value);

        case 'lt':
            return Number(fieldValue) < Number(value);

        case 'lte':
            return Number(fieldValue) <= Number(value);

        case 'eq':
            return fieldValue == value;

        case 'contain':
            if (typeof fieldValue === 'string') {
                return fieldValue.toLowerCase().includes(String(value).toLowerCase());
            }
            if (Array.isArray(fieldValue)) {
                return fieldValue.includes(value);
            }
            return false;

        default:
            return false;
    }
};


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
 * @param {*} template 
 * @param {*} data 
 * @returns 
 */
const parseMustacheTemplate = (template, data) => {

    // Helper function to replace mustache variables in a string
    const replaceMustache = (str, data) => {
        if (typeof str !== 'string') {
            return str;
        }

        // Match {{variable}} or {{nested.variable}}
        return str.replace(/\{\{([^}]+)\}\}/g, (match, variable) => {
            const trimmedVar = variable.trim();
            const value = getNestedValue(data, trimmedVar);

            // Return the value or empty string if undefined/null
            return value !== undefined && value !== null ? value : '';
        });
    };

    // Recursively parse template
    const parseValue = (value, data) => {
        if (typeof value === 'string') {
            return replaceMustache(value, data);
        }

        if (Array.isArray(value)) {
            return value.map(item => parseValue(item, data));
        }

        if (value !== null && typeof value === 'object') {
            const parsed = {};
            for (const key in value) {
                parsed[key] = parseValue(value[key], data);
            }
            return parsed;
        }

        return value;
    };

    return parseValue(template, data);
};


module.exports = {
    extractMustacheVars,
    evaluateAlertFilter,
    getNestedValue,
    parseMustacheTemplate
}