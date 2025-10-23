//@ts-check

const { useLogger } = require("common/hooks")

module.exports = {
    logger: useLogger({
        Sender: console.error
    }),
}