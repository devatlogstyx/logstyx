const { ALLOWED_HTML_TAGS } = require("../constant");

const sanitizeEmail = (email = "") => {

    let [name, domain] = email?.toString()?.split("@");
    let [realname, extra] = name?.toString()?.split("+")
    return `${realname}@${domain}`
}

const redactObject = (obj = {}, SENSITIVE_KEYS = ["password", "token", "email", "mobile", "nric"]) => {
    if (!obj || typeof obj !== "object") return obj;
    const out = Array.isArray(obj) ? [] : {};
    for (const [k, v] of Object.entries(obj)) {
        if (SENSITIVE_KEYS.includes(k.toLowerCase())) {
            out[k] = "[REDACTED]";
        } else if (typeof v === "object") {
            out[k] = redactObject(v, SENSITIVE_KEYS);
        } else {
            out[k] = v;
        }
    }
    return out;
}

const sanitizeObject = (params) => {
    return Object.entries(params).reduce((acc, [key, value]) => {
        if (
            value !== undefined &&
            value !== null &&
            value !== "" &&
            !(Array.isArray(value) && value.length === 0) && // Exclude empty arrays
            !(typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0 && value.constructor === Object) // Exclude empty plain objects
        ) {
            acc[key] = value;
        }
        return acc;
    }, {});
};

const createSlug = (string) => {
    return string
        .normalize("NFD") // Normalize accented characters
        .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
        .replace(/[+(){}\[\]]/g, " ") // Convert `+`, `()`, `{}`, `[]` to spaces
        .trim() // Trim spaces *after* replacing special characters
        .toLowerCase()
        .replace(/\s+/g, "-") // Convert spaces to hyphens
        .replace(/[^\w-]/g, "") // Remove non-word characters except "-"
        .replace(/-{2,}/g, "-"); // Prevent multiple consecutive "-"
};

const JSONParseX = (str) => {
    return new Promise((resolve, reject) => {
        try {
            resolve(JSON.parse(str));
        } catch (err) {
            reject(err);
        }
    });
};

const sanitizeForHTML = (data, striptags) => {
    function sanitizeValue(value) {
        if (typeof value === 'string') {
            return striptags?.(value, {
                allowedTags: new Set(ALLOWED_HTML_TAGS)
            });
        }

        if (Array.isArray(value)) {
            return value.map(sanitizeValue);
        }

        if (value && typeof value === 'object' && value.constructor === Object) {
            const sanitized = {};
            for (const [key, val] of Object.entries(value)) {
                // Don't sanitize keys unless they're suspicious
                const sanitizedKey = typeof key === 'string' && key.includes('<')
                    ? striptags?.(key, options?.allowedTags)
                    : key;
                sanitized[sanitizedKey] = sanitizeValue(val);
            }
            return sanitized;
        }

        return value; // Numbers, booleans, null, undefined, dates, etc.
    }

    return sanitizeValue(data);
}


const parseSortBy = (sortBy) => {
    let sortField = {};

    sortBy.split(",").forEach((sortOption) => {
        const [key, order] = sortOption.split(":");
        sortField[key] = order === "desc" ? -1 : 1;
    });

    return sortField;
};

const getNestedValue = (obj, path) => {
    return path.split('.').reduce((current, key) => current?.[key], obj);
}


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
            return fieldValue === value;

        case 'ne':
            return fieldValue != value;

        case 'contains':
            if (typeof fieldValue === 'string') {
                return fieldValue.toLowerCase().includes(String(value).toLowerCase());
            }
            if (Array.isArray(fieldValue)) {
                return fieldValue.includes(value);
            }
            return false;

        case 'in':
            if (!Array.isArray(value)) {
                return false;
            }
            return value.includes(fieldValue);

        case 'nin':
            if (!Array.isArray(value)) {
                return false;
            }
            return !value.includes(fieldValue);

        default:
            return false;
    }
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
    parseSortBy,
    sanitizeForHTML,
    JSONParseX,
    createSlug,
    sanitizeObject,
    redactObject,
    sanitizeEmail,
    getNestedValue,
    evaluateCondition,
    extractMustacheVars,
    parseMustacheTemplate
}