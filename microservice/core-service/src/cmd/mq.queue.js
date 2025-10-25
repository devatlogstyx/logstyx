#!/usr/bin/env node

// @ts-check
var amqp = require("amqplib");

const { useMQConsumer } = require("common/hooks");

const { WRITE_LOG_MQ_QUEUE, CREATE_LOG_MQ_QUEUE, CREATE_PROJECT_MQ_QUEUE } = require("common/routes/mq-queue");

const { logger: log } = require("./../shared/logger");
const { processWriteLog, processCreateLog } = require("../internal/service/logger");
const { createProject } = require("../internal/service/project");

const consumer = useMQConsumer({
    amqp,
    log
})

consumer.use(WRITE_LOG_MQ_QUEUE, processWriteLog);
consumer.use(CREATE_LOG_MQ_QUEUE, processCreateLog);
consumer.use(CREATE_PROJECT_MQ_QUEUE, createProject);

consumer.start()
