#!/usr/bin/env node

// @ts-check
var amqp = require("amqplib");

const { useMQConsumer } = require("common/hooks");

const {
    CREATE_AGENDA_JOB_MQ_QUEUE,
    CANCEL_AGENDA_JOB_MQ_QUEUE,
} = require("common/routes/mq-queue");

const { createAgendaJob, cancelAgendaJob } = require("../internal/service/agenda");
const { logger } = require("../shared/logger");
const { sendEmailNotification } = require("../internal/service/mailer");
const { getIO } = require("./socket.io");
const { pushToCloudfront } = require("../shared/provider/aws.cloudfront");

const consumer = useMQConsumer({
    amqp,
    log: logger,
})

consumer.use(CREATE_AGENDA_JOB_MQ_QUEUE, ({ scheduledAt, name, params }) => createAgendaJob({ scheduledAt, name, params }));
consumer.use(CANCEL_AGENDA_JOB_MQ_QUEUE, (params) => cancelAgendaJob(params));

consumer.start()
