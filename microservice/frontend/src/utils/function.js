import { CRITICAL_LOG_LEVEL, ERROR_LOG_LEVEL, INFO_LOG_LEVEL, SUCCESS_LOG_LEVEL, UNKNOWN_ERR_CODE, UNKNOWN_ERR_MESSAGE, WARNING_LOG_LEVEL } from "./constant";

export const parseError = (e) => {
    return {
        error: e.error || UNKNOWN_ERR_CODE,
        message: e?.response?.data?.message || e.message || UNKNOWN_ERR_MESSAGE,
    };
};

export const sanitizeObject = (params) => {
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

export const generateColor = (text) => {
    const colors = [
        'bg-blue-500',
        'bg-purple-500',
        'bg-green-500',
        'bg-orange-500',
        'bg-pink-500',
        'bg-indigo-500',
        'bg-red-500',
        'bg-teal-500'
    ];

    const hash = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
}

export const num2Int = (number) => {
    if (isNaN(number)) {
        return 0;
    }

    return parseInt(number);
};
export const sumInt = (arr) => {
    let sum = arr.reduce((total, count) => {
        return num2Int(total) + num2Int(count);
    }, 0);
    return sum;
};

export const getLevelColor = (level) => {
    switch (level) {
        case CRITICAL_LOG_LEVEL:
            return 'red';
        case ERROR_LOG_LEVEL:
            return 'orange';
        case WARNING_LOG_LEVEL:
            return 'yellow';
        case INFO_LOG_LEVEL:
            return 'blue';
        case SUCCESS_LOG_LEVEL:
            return 'green';
        default:
            return 'gray';
    }
};

export const getNestedValue = (obj, path) => {
    return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

export const extractMustacheVars = (templateStr) => {
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