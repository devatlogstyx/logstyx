#!/usr/bin/env node

// @ts-check
var amqp = require("amqplib");

const { useMQConsumer } = require("common/hooks");

const {
    CREATE_AGENDA_JOB_MQ_QUEUE,
    CANCEL_AGENDA_JOB_MQ_QUEUE,
    PROCESS_LOG_ALERT_MQ_QUEUE,
    PROCESS_SEND_WEBHOOK_MQ_QUEUE,
} = require("common/routes/mq-queue");

const { createAgendaJob, cancelAgendaJob } = require("../internal/service/agenda");
const { logger } = require("../shared/logger");
const { processLogAlert } = require("../internal/service/alert");
const { processSendWebhook } = require("../internal/service/webhook");

const consumer = useMQConsumer({
    amqp,
    log: logger,
})

consumer.use(CREATE_AGENDA_JOB_MQ_QUEUE, ({ scheduledAt, name, params }) => createAgendaJob({ scheduledAt, name, params }));
consumer.use(CANCEL_AGENDA_JOB_MQ_QUEUE, (params) => cancelAgendaJob(params));

consumer.use(PROCESS_LOG_ALERT_MQ_QUEUE, (projectId, alertId, params) => processLogAlert(projectId, alertId, params));

consumer.use(PROCESS_SEND_WEBHOOK_MQ_QUEUE, (webhookId, payload) => processSendWebhook(webhookId, payload));

consumer.start()
