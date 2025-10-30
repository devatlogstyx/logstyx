#!/usr/bin/env node

// @ts-check

var amqp = require('amqplib');
const { useMQProducer } = require("common/hooks")

const { useLogger } = require("common/hooks");

const log = useLogger({
    Context: {
        service: "Core Service"
    },
    Sender: createLog
})

const { CREATE_LOG_MQ_QUEUE } = require('common/routes/mq-queue');
const { createLog } = require('./core.service');

const produce = useMQProducer({
    amqp,
    log,
})

module.exports = {
    submitIntoQueue: (queue) => produce(queue),
    submitIntoFanout: (queue) => produce(queue, true),
    submitCreateLog: produce(CREATE_LOG_MQ_QUEUE),
}