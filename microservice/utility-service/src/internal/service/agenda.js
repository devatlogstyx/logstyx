//@ts-check
const {
    SUBMIT_MESSAGE_QUEUE_AGENDA_JOB,
    SUBMIT_MESSAGE_FANOUT_AGENDA_JOB
} = require("common/constant")
const {
    submitIntoQueue,
    submitIntoFanout
} = require("./../../shared/provider/mq-producer")


const Agenda = require("agenda");
const { logger } = require("../../shared/logger");
const { decryptSecret } = require("common/function");


const MONGO_DB_SERVER = decryptSecret(process?.env?.ENC_MONGODB_HOST)
const agenda = new Agenda({
    db: {
        address: `${MONGO_DB_SERVER}/UtilityService`,
        collection: "agendajobs"
    }
});

// Define the job processor with concurrency limits
agenda.define(
    SUBMIT_MESSAGE_QUEUE_AGENDA_JOB,
    { concurrency: 5, lockLimit: 10 },
    async (job) => {
        const { queue, payload } = job.attrs.data;
        const submitMessage = submitIntoQueue(queue);
        try {
            await submitMessage(payload);
        } catch (err) {
            logger.error(err)
        }
    }
);

agenda.define(
    SUBMIT_MESSAGE_FANOUT_AGENDA_JOB,
    { concurrency: 5, lockLimit: 10 },
    async (job) => {
        const { queue, payload } = job.attrs.data;
        const submitMessage = submitIntoFanout(queue);
        try {
            await submitMessage(payload);
        } catch (err) {
            logger.error(err)
        }
    }
);

// Start Agenda
const agendaReady = (async () => {
    await agenda.start();
    console.log("Agenda started and job defined.");
})();

// Create job
/**
 * @param {{ scheduledAt: string | Date, name: string, params: any }} job
 */
exports.createAgendaJob = async ({ scheduledAt, name, params }) => {
    await agendaReady;
    const date = new Date(scheduledAt);
    if (isNaN(date.getTime())) {
        throw new Error(`Invalid scheduledAt: ${scheduledAt}`);
    }

    if (params?.uniqueId) {
        await agenda.cancel({
            name,
            "data.uniqueId": params?.uniqueId
        });
    }

    return await agenda.schedule(date, name, params);
};

// Cancel job
/**
 * @param {any} params
 */
exports.cancelAgendaJob = async (params) => {
    await agendaReady;
    return await agenda.cancel(params);
};