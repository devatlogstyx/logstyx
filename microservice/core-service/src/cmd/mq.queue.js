#!/usr/bin/env node

// @ts-check
var amqp = require("amqplib");

const { useMQConsumer } = require("common/hooks");

const { WRITE_LOG_MQ_QUEUE, CREATE_LOG_MQ_QUEUE, CREATE_PROJECT_MQ_QUEUE, ADD_USER_TO_PROJECT_MQ_QUEUE, ON_USER_REMOVE_MQ_EXCHANGE, EXECUTE_PROBE_WORKER_MQ_QUEUE } = require("common/routes/mq-queue");

const { logger: log } = require("./../shared/logger");
const { processWriteLog, processCreateSelfLog, createLog } = require("../internal/service/logger");
const { createProject, addUserToProject, processRemoveUserFromAllProject } = require("../internal/service/project");
const { processExecuteProbeWorker } = require("../internal/service/probe");

const consumer = useMQConsumer({
    amqp,
    log
})

consumer.use(WRITE_LOG_MQ_QUEUE, processWriteLog);
consumer.use(CREATE_LOG_MQ_QUEUE, processCreateSelfLog);
consumer.use(CREATE_PROJECT_MQ_QUEUE, createProject);

consumer.use(ADD_USER_TO_PROJECT_MQ_QUEUE, ({ userId, projectId }) => addUserToProject(userId, projectId));

consumer.use(ON_USER_REMOVE_MQ_EXCHANGE, ({ userId }) => processRemoveUserFromAllProject(userId), { isFanout: true });
consumer.use(EXECUTE_PROBE_WORKER_MQ_QUEUE, ({ probeId }) => processExecuteProbeWorker(probeId, createLog));
consumer.start()
