//@ts-check

const { useLogger } = require("common/hooks")
const { submitCreateLog } = require("./../provider/mq-producer")

module.exports = {
    logger: useLogger({
        Sender: submitCreateLog
    }),
}