// shared/logger, shared/cache and the mq-producer all open websockets to the
// other services on require, so they are replaced with factory mocks.
jest.mock("../shared/logger", () => ({
    logger: {
        error: jest.fn(),
        info: jest.fn(),
        critical: jest.fn(),
        warn: jest.fn(),
        custom: jest.fn(),
    },
}));

jest.mock("../shared/cache", () => ({
    getWebhookFromCache: jest.fn(),
    updateWebhookCache: jest.fn(),
}));

jest.mock("../shared/provider/mq-producer", () => ({
    submitRemoveCache: jest.fn(),
    submitProcessLogAlert: jest.fn(),
    submitProcessSendWebhook: jest.fn(),
    submitCreateLog: jest.fn(),
}));

jest.mock("axios", () => jest.fn());

const axios = require("axios");
const { compressAndEncrypt } = require("common/function");
const {
    NONE_WEBHOOK_AUTH_TYPE,
    BEARER_WEBHOOK_AUTH_TYPE,
    BASIC_WEBHOOK_AUTH_TYPE,
    API_KEY_WEBHOOK_AUTH_TYPE,
} = require("common/constant");
const { getWebhookFromCache } = require("../shared/cache");
const { processSendWebhook } = require("../internal/service/webhook");
const { useCryptoEnv } = require("./helper/crypto-env");

const WEBHOOK_ID = "6512f0aa11bb22cc33dd44ee";

/** Seal a connection blob and park it in the cache mock. */
const givenWebhook = async (connection) => {
    getWebhookFromCache.mockResolvedValue({
        id: WEBHOOK_ID,
        connection: await compressAndEncrypt({
            url: "https://hooks.example.com/endpoint",
            method: "POST",
            headers: {},
            body_template: {},
            timeout: 10000,
            auth: { type: NONE_WEBHOOK_AUTH_TYPE },
            ...connection,
        }),
    });
};

const sentRequest = () => axios.mock.calls[0][0];

beforeEach(() => {
    useCryptoEnv();
    jest.clearAllMocks();
    axios.mockResolvedValue({ status: 200, statusText: "OK", data: { ok: true }, headers: {} });
});

describe("processSendWebhook guards", () => {
    it("returns null and sends nothing for a malformed webhook id", async () => {
        await expect(processSendWebhook("not-an-object-id", {})).resolves.toBeNull();
        expect(getWebhookFromCache).not.toHaveBeenCalled();
        expect(axios).not.toHaveBeenCalled();
    });

    it("returns null and sends nothing when the webhook is not cached", async () => {
        getWebhookFromCache.mockResolvedValue(null);
        await expect(processSendWebhook(WEBHOOK_ID, {})).resolves.toBeNull();
        expect(axios).not.toHaveBeenCalled();
    });
});

describe("processSendWebhook request shape", () => {
    it("sends the configured url, method and timeout", async () => {
        await givenWebhook({
            url: "https://hooks.example.com/alerts",
            method: "PUT",
            timeout: 2500,
        });

        await processSendWebhook(WEBHOOK_ID, {});

        expect(sentRequest()).toMatchObject({
            url: "https://hooks.example.com/alerts",
            method: "PUT",
            timeout: 2500,
        });
    });

    it("renders mustache variables in headers and body from the payload", async () => {
        await givenWebhook({
            headers: { "X-Project": "{{context.projectId}}" },
            body_template: { text: "{{data.message}} for {{context.projectId}}" },
        });

        await processSendWebhook(WEBHOOK_ID, {
            context: { projectId: "storefront" },
            data: { message: "boom" },
        });

        expect(sentRequest().headers).toMatchObject({ "X-Project": "storefront" });
        expect(JSON.parse(sentRequest().data)).toEqual({ text: "boom for storefront" });
    });

    it("serializes an object body as JSON", async () => {
        await givenWebhook({
            headers: { "Content-Type": "application/json" },
            body_template: { level: "{{level}}" },
        });

        await processSendWebhook(WEBHOOK_ID, { level: "ERROR" });

        expect(sentRequest().data).toBe('{"level":"ERROR"}');
    });

    it("passes a string body through untouched and defaults its content type", async () => {
        await givenWebhook({ body_template: "level={{level}}" });

        await processSendWebhook(WEBHOOK_ID, { level: "ERROR" });

        expect(sentRequest().data).toBe("level=ERROR");
        expect(sentRequest().headers["Content-Type"]).toBe("application/json");
    });

    it("omits the body on a GET", async () => {
        await givenWebhook({ method: "GET", body_template: { a: 1 } });

        await processSendWebhook(WEBHOOK_ID, {});

        expect(sentRequest().data).toBeUndefined();
    });

    it("falls back to a 10s timeout", async () => {
        await givenWebhook({ timeout: undefined });

        await processSendWebhook(WEBHOOK_ID, {});

        expect(sentRequest().timeout).toBe(10000);
    });
});

describe("processSendWebhook auth", () => {
    it("sends no Authorization header for NONE", async () => {
        await givenWebhook({ auth: { type: NONE_WEBHOOK_AUTH_TYPE } });

        await processSendWebhook(WEBHOOK_ID, {});

        expect(sentRequest().headers.Authorization).toBeUndefined();
    });

    it("sends a bearer token", async () => {
        await givenWebhook({
            auth: { type: BEARER_WEBHOOK_AUTH_TYPE, token: "xoxb-secret" },
        });

        await processSendWebhook(WEBHOOK_ID, {});

        expect(sentRequest().headers.Authorization).toBe("Bearer xoxb-secret");
    });

    it("sends base64 basic credentials", async () => {
        await givenWebhook({
            auth: { type: BASIC_WEBHOOK_AUTH_TYPE, username: "ada", password: "hunter2" },
        });

        await processSendWebhook(WEBHOOK_ID, {});

        expect(sentRequest().headers.Authorization).toBe(
            `Basic ${Buffer.from("ada:hunter2").toString("base64")}`
        );
    });

    it("sends an api key as a header by default", async () => {
        await givenWebhook({
            auth: {
                type: API_KEY_WEBHOOK_AUTH_TYPE,
                key_name: "X-API-Key",
                key_value: "k-123",
            },
        });

        await processSendWebhook(WEBHOOK_ID, {});

        expect(sentRequest().headers["X-API-Key"]).toBe("k-123");
        expect(sentRequest().url).toBe("https://hooks.example.com/endpoint");
    });

    it("appends an api key to the query string when configured", async () => {
        await givenWebhook({
            url: "https://hooks.example.com/endpoint?team=core",
            auth: {
                type: API_KEY_WEBHOOK_AUTH_TYPE,
                key_name: "api_key",
                key_value: "k-123",
                key_location: "query",
            },
        });

        await processSendWebhook(WEBHOOK_ID, {});

        expect(sentRequest().url).toBe("https://hooks.example.com/endpoint?team=core&api_key=k-123");
        expect(sentRequest().headers.api_key).toBeUndefined();
    });

    it("overrides a mustache-rendered Authorization header with the configured auth", async () => {
        await givenWebhook({
            headers: { Authorization: "{{stale}}" },
            auth: { type: BEARER_WEBHOOK_AUTH_TYPE, token: "xoxb-secret" },
        });

        await processSendWebhook(WEBHOOK_ID, { stale: "Bearer old" });

        expect(sentRequest().headers.Authorization).toBe("Bearer xoxb-secret");
    });
});

describe("processSendWebhook result", () => {
    it("reports success for a 2xx", async () => {
        await givenWebhook({});
        axios.mockResolvedValue({ status: 204, statusText: "No Content", data: "", headers: {} });

        await expect(processSendWebhook(WEBHOOK_ID, {})).resolves.toMatchObject({
            success: true,
            status: 204,
            statusText: "No Content",
        });
    });

    it("reports failure for a 4xx/5xx without throwing", async () => {
        await givenWebhook({});
        axios.mockResolvedValue({
            status: 500,
            statusText: "Internal Server Error",
            data: "boom",
            headers: {},
        });

        await expect(processSendWebhook(WEBHOOK_ID, {})).resolves.toMatchObject({
            success: false,
            status: 500,
            data: "boom",
        });
    });

    it("reports failure when the request itself throws", async () => {
        await givenWebhook({});
        axios.mockRejectedValue(new Error("ECONNREFUSED"));
        const consoleError = jest.spyOn(console, "error").mockImplementation(() => { });

        await expect(processSendWebhook(WEBHOOK_ID, {})).resolves.toMatchObject({
            success: false,
            status: 500,
            statusText: "Internal Error",
            error: "ECONNREFUSED",
        });

        consoleError.mockRestore();
    });

    it("maps an aborted request to 408", async () => {
        await givenWebhook({});
        const aborted = new Error("timeout of 10000ms exceeded");
        aborted.name = "AbortError";
        axios.mockRejectedValue(aborted);
        const consoleError = jest.spyOn(console, "error").mockImplementation(() => { });

        await expect(processSendWebhook(WEBHOOK_ID, {})).resolves.toMatchObject({
            success: false,
            status: 408,
            statusText: "Request Timeout",
        });

        consoleError.mockRestore();
    });
});
