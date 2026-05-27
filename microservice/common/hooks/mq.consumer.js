//@ts-check

const {
    DEAD_LETTER_QUEUE_LOG_LEVEL,
    SUBMIT_MESSAGE_QUEUE_AGENDA_JOB,
    SUBMIT_MESSAGE_FANOUT_AGENDA_JOB,
} = require("./../constant");

const { CREATE_AGENDA_JOB_MQ_QUEUE } = require("./../routes/mq-queue/utility.service");

const { JSONParseX, createSlug, decryptSecret } = require("../function");
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
    const AMQP_HOST = (process.env.ENC_AMQP_HOST && decryptSecret(process.env.ENC_AMQP_HOST))
        || process.env.AMQP_HOST
        || 'amqp://rabbitmq:5672'

    const use = (queue, fn, options = {}) => {
        if (typeof fn === "function") {
            consumers.push({ queue, fn, options });
        }
    };

    const setupQueue = async (channel, queue, isFanout = false) => {
        if (isFanout) {
            await channel.assertExchange(queue, "fanout", { durable: true });
            const q = await channel.assertQueue("", { exclusive: true });
            await channel.bindQueue(q.queue, queue, "");
            return q.queue;
        }

        await channel.assertQueue(queue, { durable: true });
        return queue;
    };

    /**
     * Schedule a retry via Agenda. Returns false (and logs discard) if retries are exhausted.
     */
    const handleRequeue = ({ params, channel, options, queue }) => {
        const maxRetry = options?.maxRetry ?? 3;
        const retryCount = (params?.retryCount ?? 0) + 1;

        if (retryCount > maxRetry) {
            log?.send?.(DEAD_LETTER_QUEUE_LOG_LEVEL, {
                title: `Discard ${options?.isFanout ? "Fanout" : "Queue"} - ${queue}`,
                message: `Discarding message after ${maxRetry} attempts`,
                context: { payload: params },
            });
            return;
        }

        const in5Minutes = 60 * 5;
        const delay = Math.min(Math.pow(2, retryCount) * 5, in5Minutes);
        const scheduledAt = new Date(Date.now() + delay * 1000);
        const uid = stableId(params?.originalId ?? params);

        const agendaParams = {
            originalId: uid,
            scheduledAt,
            name: options?.isFanout
                ? SUBMIT_MESSAGE_FANOUT_AGENDA_JOB
                : SUBMIT_MESSAGE_QUEUE_AGENDA_JOB,
            params: {
                uniqueId: `retry-${options?.isFanout ? "fanout" : "queue"}-${createSlug(queue)}-${uid}-r${retryCount}-m${maxRetry}`,
                queue,
                payload: { ...params, retryCount },
            },
        };

        const buf = Buffer.from(JSON.stringify(agendaParams));
        channel.sendToQueue(CREATE_AGENDA_JOB_MQ_QUEUE, buf, { persistent: true });

        log?.send?.(DEAD_LETTER_QUEUE_LOG_LEVEL, {
            title: `Retry ${options?.isFanout ? "Fanout" : "Queue"} - ${queue}`,
            message: `Retrying message (attempt ${retryCount}/${maxRetry}) in ${delay}s`,
            context: { payload: params },
        });
    };

    const startConsumers = async () => {
        for (const { queue, fn, options } of consumers) {
            try {
                const channel = await connection.createChannel();
                await channel.prefetch(options.prefetch ?? defaultPrefetch);

                const queueName = await setupQueue(
                    channel,
                    queue,
                    options?.isFanout === true
                );

                channel.consume(
                    queueName,
                    async (msg) => {
                        if (!msg) return;

                        let params;
                        try {
                            params = await JSONParseX(msg.content.toString());
                        } catch (err) {
                            log?.error?.(err);
                            channel.ack(msg); // malformed — discard
                            return;
                        }

                        // Ack before async work so the message isn't held
                        // while fn() runs (which could be slow).
                        channel.ack(msg);

                        try {
                            await fn(params);
                        } catch (err) {
                            log?.error?.(err);
                            handleRequeue({ params, channel, options, queue });
                        }
                    },
                    { noAck: options?.noAck ?? false }
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

    const reconnect = async () => {
        if (connection) {
            try {
                await connection.close();
            } catch (e) {
                if (!e?.message?.includes("Connection closed")) {
                    log?.critical?.(e);
                }
            }
        }
        connection = null;
        setTimeout(connect, 5000);
    };

    return { use, start: connect };
}

module.exports = { useMQConsumer };