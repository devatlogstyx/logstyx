const { HttpError, parseError, normalizeError } = require("../function/error");
const {
    UNKNOWN_ERR_CODE,
    UNKNOWN_ERR_MESSAGE,
    NOT_FOUND_ERR_MESSAGE,
} = require("../constant");

describe("HttpError", () => {
    it("builds an Error carrying the status code and message", () => {
        const err = HttpError(404, NOT_FOUND_ERR_MESSAGE);
        expect(err).toBeInstanceOf(Error);
        expect(err.error).toBe(404);
        expect(err.message).toBe(NOT_FOUND_ERR_MESSAGE);
        expect(err.showError).toBe(true);
    });

    it("coerces a status below 200 to 500", () => {
        expect(HttpError(150, "nope").error).toBe(500);
    });

    it("coerces a non-numeric status to 500", () => {
        expect(HttpError("not-a-status", "nope").error).toBe(500);
    });

    it("unwraps the first message of a validator error bag", () => {
        const validatorErrors = {
            title: { message: "The title field is mandatory." },
            bucket: { message: "The bucket field is mandatory." },
        };
        const err = HttpError(400, validatorErrors);
        expect(err.error).toBe(400);
        expect(err.message).toBe("The title field is mandatory.");
    });

    it("passes an already-shaped error object straight through", () => {
        const err = HttpError({ error: 409, message: "Conflict" });
        expect(err.error).toBe(409);
        expect(err.message).toBe("Conflict");
        // Rebuilt errors are not marked showError, so parseError hides the detail.
        expect(err.showError).toBe(false);
    });

    it("falls back to the unknown-error defaults", () => {
        const err = HttpError(undefined, undefined);
        expect(err.error).toBe(500);
        expect(err.message).toBe(UNKNOWN_ERR_MESSAGE);
    });
});

describe("parseError", () => {
    it("exposes the message when showError is set", () => {
        expect(parseError(HttpError(400, "Bad Input"))).toEqual({
            error: 400,
            message: "Bad Input",
        });
    });

    it("hides the message when showError is not set", () => {
        const leaky = new Error("connect ECONNREFUSED 10.0.0.5:27017");
        expect(parseError(leaky)).toEqual({
            error: "Error",
            message: UNKNOWN_ERR_MESSAGE,
        });
    });

    it("prefers an upstream response body over the local message", () => {
        expect(
            parseError({
                showError: true,
                error: 502,
                message: "Request failed",
                response: { data: { message: "upstream exploded" } },
            })
        ).toEqual({ error: 502, message: "upstream exploded" });
    });

    it("falls back to the unknown error code when there is nothing to read", () => {
        expect(parseError(null)).toEqual({
            error: UNKNOWN_ERR_CODE,
            message: UNKNOWN_ERR_MESSAGE,
        });
    });

    it("names the constructor when the payload is a plain object", () => {
        expect(parseError({})).toEqual({
            error: "Object",
            message: UNKNOWN_ERR_MESSAGE,
        });
    });
});

describe("normalizeError", () => {
    it("keeps name, message and stack for an Error", () => {
        const normalized = normalizeError(new TypeError("bad type"));
        expect(normalized.title).toBe("TypeError");
        expect(normalized.message).toBe("bad type");
        expect(typeof normalized.stack).toBe("string");
    });

    it("treats a string as the title", () => {
        expect(normalizeError("something broke")).toEqual({
            title: "something broke",
            message: "",
        });
    });

    it("uses an existing title/message pair", () => {
        expect(normalizeError({ title: "MQ", message: "not ready" })).toEqual({
            title: "MQ",
            message: "not ready",
        });
    });

    it("serializes an unrecognised payload into the message", () => {
        expect(normalizeError({ code: 7 })).toEqual({
            title: "",
            message: '{"code":7}',
        });
    });
});
