#!/usr/bin/env node

// @ts-check

var amqp = require('amqplib');
const { useMQProducer } = require("common/hooks")

const { useLogger } = require("common/hooks");

const log = useLogger({
    Sender: console.error
})
const produce = useMQProducer({
    amqp,
    log,
})

module.exports = {
    
    
}