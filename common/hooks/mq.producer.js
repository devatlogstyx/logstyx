//@ts-check

const {
    UNKNOWN_ERR_CODE,
    MQ_NOT_READY_ERR_MESSAGE,
} = require("./../constant");

const { HttpError } = require("../function");

/**
 * @typedef {Object} MQProducerOptions
 * @property {typeof import("amqplib")} amqp
 * @property {{ error?: Function, critical?: Function }} log
 * @property {string[]} [exchanges]
 * @property {string[]} [queues]
 */

/**
 * @param {MQProducerOptions} options
 */
function useMQProducer({ amqp, log, exchanges = [], queues = [] }) {
    let connection = null;
    let channel = null;
    let isReconnecting = false;

    const connect = async () => {
        if (isReconnecting) return;
        isReconnecting = true;
        const AMQP_HOST = process?.env?.AMQP_HOST

        try {
            connection = await amqp.connect(AMQP_HOST || "");
            channel = await connection.createChannel();

            connection.on("close", (err) => {
                log?.error?.(err);
                setTimeout(connect, 5000);
            });

            connection.on("error", (err) => {
                log?.critical?.(err);
                setTimeout(connect, 5000);
            });

            isReconnecting = false;
        } catch (err) {
            log?.critical?.(err);
            setTimeout(() => {
                isReconnecting = false;
                connect();
            }, 5000);
        }
    };

    connect();

    const ensureReady = (retry = 0) => {
        if (!channel) {
            if (retry > 3) {
                console.error(MQ_NOT_READY_ERR_MESSAGE);
            }
            return new Promise((resolve) => {
                setTimeout(() => resolve(ensureReady(retry + 1)), 1000);
            });
        }
        return Promise.resolve(channel);
    };

    return (target, isExchange = false, routingKey = "") => {
        return async (payload = {}) => {
            try {
                const ch = await ensureReady();
                const buffer = Buffer.from(JSON.stringify(payload));

                if (isExchange) {
                    const ok = ch.publish(target, routingKey, buffer);
                    if (!ok) {
                        await new Promise(resolve => ch.once('drain', resolve));
                    }
                } else {
                    const ok = ch.sendToQueue(target, buffer);
                    if (!ok) {
                        await new Promise(resolve => ch.once('drain', resolve));
                    }
                }
            } catch (e) {
                log?.error?.(e)
            }
        };
    };

}

module.exports = { useMQProducer };
