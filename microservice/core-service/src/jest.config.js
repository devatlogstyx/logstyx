module.exports = {
    testEnvironment: "node",
    testMatch: ["<rootDir>/test/**/*.test.js"],
    collectCoverageFrom: ["internal/**/*.js", "shared/**/*.js"],
    coveragePathIgnorePatterns: ["/node_modules/", "/build/"],
};
