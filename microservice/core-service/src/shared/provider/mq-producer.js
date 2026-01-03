#!/usr/bin/env node

// @ts-check

var amqp = require('amqplib');
const { useMQProducer } = require("common/hooks")
const {
    CACHE_CREATE_MQ_QUEUE,
    CACHE_REMOVE_MQ_QUEUE,
    WRITE_LOG_MQ_QUEUE,
    CREATE_LOG_MQ_QUEUE,
    EXECUTE_PROBE_WORKER_MQ_QUEUE,
    CREATE_AGENDA_JOB_MQ_QUEUE,
} = require("common/routes/mq-queue");
const { useLogger } = require("common/hooks");

const log = useLogger({
    Context: {
        service: "Core Service"
    },
    Sender: console.error
})
const produce = useMQProducer({
    amqp,
    log,
})

module.exports = {
    submitRemoveCache: produce(CACHE_REMOVE_MQ_QUEUE),
    submitCreateCache: produce(CACHE_CREATE_MQ_QUEUE),
    submitWriteLog: produce(WRITE_LOG_MQ_QUEUE),
    submitCreateLog: produce(CREATE_LOG_MQ_QUEUE),
    submitExecuteProbeWorker: produce(EXECUTE_PROBE_WORKER_MQ_QUEUE),
    submitCreateAgendaJob: produce(CREATE_AGENDA_JOB_MQ_QUEUE),
}