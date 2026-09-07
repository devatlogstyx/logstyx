const { HttpResponse } = require("../function/response");
const { HttpError } = require("../function/error");
const {
    SUCCESS_ERR_CODE,
    INVALID_INPUT_ERR_CODE,
    UNKNOWN_ERR_MESSAGE,
} = require("../constant");

const fakeRes = () => {
    const res = {
        statusCode: undefined,
        body: undefined,
        ended: false,
        status(code) {
            res.statusCode = code;
            return res;
        },
        json(payload) {
            res.body = payload;
            return res;
        },
        end(payload) {
            res.ended = true;
            res.body = payload;
            return res;
        },
    };
    return res;
};

describe("HttpResponse.json", () => {
    it("answers 200 with the payload", () => {
        const res = fakeRes();
        HttpResponse(res).json({ id: "abc" });
        expect(res.statusCode).toBe(SUCCESS_ERR_CODE);
        expect(res.body).toEqual({ id: "abc" });
    });
});

describe("HttpResponse.end", () => {
    it("answers 200 without a JSON body", () => {
        const res = fakeRes();
        HttpResponse(res).end();
        expect(res.statusCode).toBe(SUCCESS_ERR_CODE);
        expect(res.ended).toBe(true);
    });
});

describe("HttpResponse.error", () => {
    it("uses the status carried by an HttpError", () => {
        const res = fakeRes();
        HttpResponse(res).error(HttpError(404, "Not Found"));
        expect(res.statusCode).toBe(404);
        expect(res.body).toEqual({ error: 404, message: "Not Found" });
    });

    it("defaults to 400 when the error has no status", () => {
        const res = fakeRes();
        HttpResponse(res).error(new Error("boom"));
        expect(res.statusCode).toBe(INVALID_INPUT_ERR_CODE);
    });

    it("does not leak an unflagged error message to the client", () => {
        const res = fakeRes();
        HttpResponse(res).error(new Error("connect ECONNREFUSED 10.0.0.5:27017"));
        expect(res.body.message).toBe(UNKNOWN_ERR_MESSAGE);
    });
});
