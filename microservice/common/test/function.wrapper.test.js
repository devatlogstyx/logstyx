const { asyncHandler } = require("../function/wrapper");

describe("asyncHandler", () => {
    it("resolves through to the wrapped handler", async () => {
        const handler = asyncHandler(async (a, b) => a + b);
        await expect(handler(1, 2)).resolves.toBe(3);
    });

    it("routes a rejection to the trailing callback (express next)", async () => {
        const next = jest.fn();
        const boom = new Error("boom");
        const handler = asyncHandler(async () => {
            throw boom;
        });

        await handler({}, {}, next);

        expect(next).toHaveBeenCalledWith(boom);
    });

    it("does not catch a synchronous throw", () => {
        const next = jest.fn();
        const handler = asyncHandler(() => {
            throw new Error("sync boom");
        });

        // fn(...args) is evaluated before Promise.resolve, so a sync throw
        // escapes the .catch(). Only async handlers are covered.
        expect(() => handler({}, {}, next)).toThrow("sync boom");
        expect(next).not.toHaveBeenCalled();
    });

    it("falls back to console.error when the last argument is not a function", async () => {
        const spy = jest.spyOn(console, "error").mockImplementation(() => { });
        const boom = new Error("boom");
        const handler = asyncHandler(async () => {
            throw boom;
        });

        await handler({ id: 1 });

        expect(spy).toHaveBeenCalledWith(boom);
        spy.mockRestore();
    });
});
