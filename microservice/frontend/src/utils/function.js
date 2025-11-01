import { UNKNOWN_ERR_CODE, UNKNOWN_ERR_MESSAGE } from "./constant";

export const parseError = (e) => {
    return {
        error: e.error || UNKNOWN_ERR_CODE,
        message: e?.response?.data?.message || e.message || UNKNOWN_ERR_MESSAGE,
    };
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
