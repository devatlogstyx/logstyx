//@ts-check

const { DEAD_LETTER_QUEUE_LOG_LEVEL } = require("../constant/error");
const { SUBMIT_MESSAGE_QUEUE_AGENDA_JOB, SUBMIT_MESSAGE_FANOUT_AGENDA_JOB } = require("../constant");

const { CREATE_AGENDA_JOB_MQ_QUEUE } = require("./../routes/mq-queue/utility.service")

const { JSONParseX, createSlug, decryptSecret,  } = require("./../function");
const crypto = require("crypto");

function stableId(payload = {}) {
    return crypto.createHash("sha1").update(JSON.stringify(payload)).digest("hex");
}

/**
 * @param {{
 *   amqp: typeof import("amqplib"),
 *   log?: any,
 *   prefetch?: number,
 * }} options
 */
function useMQConsumer({ amqp, log, prefetch: defaultPrefetch = 5 }) {
    let connection = null;
    let isReconnecting = false;
    const consumers = [];
    const AMQP_HOST = decryptSecret(process?.env?.ENC_AMQP_HOST)

    const use = (queue, fn, options = {}) => {
        if (typeof fn === "function") {
            consumers.push({ queue, fn, options, });
        }
    };

    const setupQueueWithDLQ = async (channel, queue, isFanout = false) => {
        const dlxName = `${queue}.dlx`;
        const dlqName = `${queue}.dlq`;

        // DLX + DLQ setup with safety limits
        await channel.assertExchange(dlxName, "fanout", { durable: true });
        await channel.assertQueue(dlqName, {
            durable: true,
            arguments: {
                "x-message-ttl": 7 * 24 * 60 * 60 * 1000, // 7 days
                "x-max-length": 10000                     // cap at 10k
            }
        });
        await channel.bindQueue(dlqName, dlxName, "");

        if (isFanout) {
            await channel.assertExchange(queue, "fanout", { durable: true });
            const q = await channel.assertQueue("", {
                exclusive: true,
                arguments: { "x-dead-letter-exchange": dlxName },
            });
            await channel.bindQueue(q.queue, queue, "");
            return { main: q.queue, dlq: dlqName };
        } else {
            await channel.assertQueue(queue, {
                durable: true,
                arguments: { "x-dead-letter-exchange": dlxName },
            });
            return { main: queue, dlq: dlqName };
        }
    };

    const handleRequeue = async ({
        params,
        channel,
        options,
        queue
    }) => {

        const retryCount = params?.retryCount
        const maxRetry = (options?.maxRetry || 3)
        const in5Minutes = 60 * 5
        const delay = Math.min(Math.pow(2, retryCount) * 5, in5Minutes);

        const scheduledAt = new Date(new Date().getTime() + (delay * 1000))
        const uid = stableId(params.originalId || params);

        const agendaParams = {
            originalId: uid,
            scheduledAt,
            name: options?.isFanout ? SUBMIT_MESSAGE_FANOUT_AGENDA_JOB : SUBMIT_MESSAGE_QUEUE_AGENDA_JOB,
            params: {
                uniqueId: `dlq-${options?.isFanout ? "fanout" : "queue"}-${createSlug(queue)}-${uid}-r${retryCount}-m${maxRetry}`,
                queue,
                payload: params
            }
        };

        const buf = Buffer.from(JSON.stringify(agendaParams));
        channel.sendToQueue(CREATE_AGENDA_JOB_MQ_QUEUE, buf, { persistent: true });

        log?.custom?.(DEAD_LETTER_QUEUE_LOG_LEVEL, {
            title: `Retry ${options?.isFanout ? "Fanout" : "Queue"} - ${queue}`,
            message: `Retrying message (attempt ${retryCount}/${maxRetry})`,
            context: {
                payload: params,
            }
        });

    }

    const startConsumers = async () => {
        for (const { queue, fn, options } of consumers) {
            try {
                const channel = await connection.createChannel();
                const consumerPrefetch = options.prefetch ?? defaultPrefetch;
                await channel.prefetch(consumerPrefetch);

                const { main, dlq } = await setupQueueWithDLQ(
                    channel,
                    queue,
                    options?.isFanout === true
                );

                // main consumer
                channel.consume(
                    main,
                    async (msg) => {
                        if (!msg) return;
                        try {
                            const params = await JSONParseX(msg.content.toString());
                            await fn(params);
                            channel.ack(msg);
                        } catch (err) {
                            log?.error?.(err);
                            channel.reject(msg, false); // route to DLQ
                        }
                    },
                    { noAck: options?.noAck ?? false }
                );

                // DLQ drainage consumer (lightweight)
                channel.consume(
                    dlq,
                    async (msg) => {
                        if (!msg) return;
                        const maxRetry = (options?.maxRetry || 3)
                        try {
                            const params = await JSONParseX(msg.content.toString());
                            const retryCount = (params?.retryCount || 0) + 1;

                            if (retryCount <= maxRetry) {
                                params.retryCount = retryCount;
                                handleRequeue({
                                    params,
                                    channel,
                                    options,
                                    queue
                                })?.catch(log?.error)

                            } else {
                                log?.custom?.(DEAD_LETTER_QUEUE_LOG_LEVEL, {
                                    title: `Discard ${options?.isFanout ? "Fanout" : "Queue"} - ${queue}`,
                                    message: `Discarding message after ${maxRetry} attempts`,
                                    context: {
                                        payload: JSON.parse(msg.content.toString()),
                                    }
                                });
                            }

                            channel.ack(msg);
                        } catch (err) {
                            log?.error?.(err);
                            channel.ack(msg);
                        }
                    },
                    { noAck: false }
                );
            } catch (e) {
                log?.critical?.(e);
            }
        }
    };

    const connect = async () => {
        if (isReconnecting) return;
        isReconnecting = true;

        try {
            connection = await amqp.connect(AMQP_HOST);

            connection.on("close", (e) => {
                log?.error?.(e);
                setTimeout(reconnect, 5000);
            });

            connection.on("error", (e) => {
                log?.critical?.(e);
                setTimeout(reconnect, 5000);
            });

            await startConsumers();
            isReconnecting = false;
        } catch (err) {
            log?.critical?.(err);
            setTimeout(() => {
                isReconnecting = false;
                connect();
            }, 5000);
        }
    };

    const reconnect = () => {
        try {
            if (connection) connection.close();
        } catch (e) {
            log?.critical?.(e);
        }
        setTimeout(connect, 5000);
    };

    return { use, start: connect };
}

module.exports = { useMQConsumer };
