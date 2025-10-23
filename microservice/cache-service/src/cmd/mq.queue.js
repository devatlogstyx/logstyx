#!/usr/bin/env node

// @ts-check
var amqp = require("amqplib");

const { useMQConsumer } = require("common/hooks");

const { CACHE_CREATE_MQ_QUEUE, CACHE_REMOVE_MQ_QUEUE } = require("common/routes/mq-queue");

const { createCache, removeCache } = require("./../internal/service/cache");
const { logger: log } = require("./../shared/logger")

const consumer = useMQConsumer({
    amqp,
    log
})

consumer.use(CACHE_CREATE_MQ_QUEUE, ({ key, id, data, ttl }) => createCache(key, id, data, ttl));
consumer.use(CACHE_REMOVE_MQ_QUEUE, ({ key, id }) => removeCache(key, id));

consumer.start()
