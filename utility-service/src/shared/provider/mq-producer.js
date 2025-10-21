#!/usr/bin/env node

// @ts-check

var amqp = require('amqplib');
const { useMQProducer } = require("common/hooks")

const { logger } = require('../logger');

const produce = useMQProducer({
    amqp,
    log: logger,
})

module.exports = {
    submitIntoQueue: (queue) => produce(queue),
    submitIntoFanout: (queue) => produce(queue, true),
}