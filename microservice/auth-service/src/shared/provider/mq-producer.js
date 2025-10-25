#!/usr/bin/env node

// @ts-check

var amqp = require('amqplib');
const { useMQProducer } = require("common/hooks")
const {
    CACHE_CREATE_MQ_QUEUE,
    CACHE_REMOVE_MQ_QUEUE,
    CREATE_PROJECT_MQ_QUEUE,
} = require("common/routes/mq-queue");
const { useLogger } = require("common/hooks");
const { createLog } = require('./core.service');

const log = useLogger({
    Context: {
        service: "Auth Service"
    },
    Sender: createLog
})
const produce = useMQProducer({
    amqp,
    log,
})

module.exports = {
    submitRemoveCache: produce(CACHE_REMOVE_MQ_QUEUE),
    submitCreateCache: produce(CACHE_CREATE_MQ_QUEUE),
    submitCreateProject: produce(CREATE_PROJECT_MQ_QUEUE),
}