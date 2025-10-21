#!/usr/bin/env node

// @ts-check

var amqp = require('amqplib');
const { useMQProducer } = require("common/hooks")
const {
    CREATE_LOG_MQ_QUEUE
} = require("common/routes/mq-queue");
const { useLogger } = require("common/hooks");
const { createLog } = require('./log.service');
const log = useLogger({
    Sender: createLog
})
const produce = useMQProducer({
    amqp,
    log,
})

module.exports = {
    
    submitCreateLog: produce(CREATE_LOG_MQ_QUEUE)
}