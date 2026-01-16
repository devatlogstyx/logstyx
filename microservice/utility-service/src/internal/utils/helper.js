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

module.exports = {
    extractMustacheVars
}