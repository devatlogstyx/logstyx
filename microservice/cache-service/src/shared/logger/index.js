//@ts-check

const { useLogger } = require("common/hooks")

module.exports = {
    logger: useLogger({
        Context: {
            service: "Cache Service"
        },
        Sender: console.error
    }),
}