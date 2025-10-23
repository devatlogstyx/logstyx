#!/usr/bin/env node

// @ts-check
var amqp = require("amqplib");

const { useMQConsumer } = require("common/hooks");

const { WRITE_LOG_MQ_QUEUE } = require("common/routes/mq-queue");

const { logger: log } = require("./../shared/logger");
const { processWriteLog } = require("../internal/service/logger");

const consumer = useMQConsumer({
    amqp,
    log
})

consumer.use(WRITE_LOG_MQ_QUEUE, processWriteLog);

consumer.start()
