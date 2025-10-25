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

const sanitizeForHTML = (data, options = {}, striptags) => {
    function sanitizeValue(value) {
        if (typeof value === 'string') {
            return striptags?.(value, options);
        }

        if (Array.isArray(value)) {
            return value.map(sanitizeValue);
        }

        if (value && typeof value === 'object' && value.constructor === Object) {
            const sanitized = {};
            for (const [key, val] of Object.entries(value)) {
                // Don't sanitize keys unless they're suspicious
                const sanitizedKey = typeof key === 'string' && key.includes('<')
                    ? striptags?.(key, options)
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

module.exports = {
    parseSortBy,
    sanitizeForHTML,
    JSONParseX,
    createSlug,
    sanitizeObject,
    redactObject,
    sanitizeEmail,
    getNestedValue
}