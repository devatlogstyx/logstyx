//@ts-check

const { useLogger } = require("common/hooks")

module.exports = {
    logger: useLogger({
        Context:{
            service:"Auth Service"
        },
        Sender: console.error
    }),
}