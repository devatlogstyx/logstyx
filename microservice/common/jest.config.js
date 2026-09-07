module.exports = {
    testEnvironment: "node",
    testMatch: ["<rootDir>/test/**/*.test.js"],
    collectCoverageFrom: [
        "constant/**/*.js",
        "function/**/*.js",
        "hooks/**/*.js",
        "routes/**/*.js",
    ],
};
