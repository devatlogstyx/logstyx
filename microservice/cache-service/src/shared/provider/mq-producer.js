#!/usr/bin/env node

// @ts-check

var amqp = require('amqplib');
const { useMQProducer } = require("common/hooks")

const { useLogger } = require("common/hooks");
const { createLog } = require('./core.service');

const log = useLogger({
    Context: {
        service: "Cache Service"
    },
    Sender: createLog
})

const produce = useMQProducer({
    amqp,
    log,
})

module.exports = {


}