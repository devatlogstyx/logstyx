const {
    sanitizeEmail,
    redactObject,
    sanitizeObject,
    createSlug,
    JSONParseX,
    sanitizeForHTML,
    parseSortBy,
    getNestedValue,
    extractMustacheVars,
    evaluateCondition,
    parseMustacheTemplate,
    isObject,
    isArray,
} = require("../function/string");

describe("sanitizeEmail", () => {
    it("lowercases the address", () => {
        expect(sanitizeEmail("Foo@Example.COM")).toBe("foo@example.com");
    });

    it("strips the +tag from the local part", () => {
        expect(sanitizeEmail("foo+newsletter@example.com")).toBe("foo@example.com");
    });
});

describe("redactObject", () => {
    it("redacts sensitive keys by default", () => {
        expect(redactObject({ email: "a@b.com", password: "hunter2", fullname: "Ada" })).toEqual({
            email: "[REDACTED]",
            password: "[REDACTED]",
            fullname: "Ada",
        });
    });

    it("redacts nested values and preserves array shape", () => {
        expect(redactObject({ users: [{ token: "abc", id: 1 }] })).toEqual({
            users: [{ token: "[REDACTED]", id: 1 }],
        });
    });

    it("matches keys case-insensitively", () => {
        expect(redactObject({ Password: "hunter2" })).toEqual({ Password: "[REDACTED]" });
    });

    it("honours a custom key list", () => {
        expect(redactObject({ email: "a@b.com", secret: "s" }, ["secret"])).toEqual({
            email: "a@b.com",
            secret: "[REDACTED]",
        });
    });

    it("returns non-objects untouched", () => {
        expect(redactObject("plain")).toBe("plain");
        expect(redactObject(null)).toBeNull();
    });
});

describe("sanitizeObject", () => {
    it("drops undefined, null and empty-string values", () => {
        expect(sanitizeObject({ a: 1, b: undefined, c: null, d: "" })).toEqual({ a: 1 });
    });

    it("drops empty arrays and empty plain objects", () => {
        expect(sanitizeObject({ a: [], b: {}, c: [1], d: { x: 1 } })).toEqual({
            c: [1],
            d: { x: 1 },
        });
    });

    it("keeps falsy values that are not empty", () => {
        expect(sanitizeObject({ zero: 0, no: false })).toEqual({ zero: 0, no: false });
    });

    it("keeps non-plain objects even when they have no own keys", () => {
        const date = new Date("2026-01-01T00:00:00.000Z");
        expect(sanitizeObject({ date })).toEqual({ date });
    });
});

describe("createSlug", () => {
    it("lowercases and hyphenates", () => {
        expect(createSlug("Hello World")).toBe("hello-world");
    });

    it("strips diacritics", () => {
        expect(createSlug("Café Crème")).toBe("cafe-creme");
    });

    it("turns brackets and plus signs into separators", () => {
        expect(createSlug("Logs (v2) [beta]")).toBe("logs-v2-beta");
    });

    it("collapses repeated separators", () => {
        expect(createSlug("a   b")).toBe("a-b");
    });

    it("drops other non-word characters", () => {
        expect(createSlug("hello!@#world")).toBe("helloworld");
    });
});

describe("JSONParseX", () => {
    it("resolves valid JSON", async () => {
        await expect(JSONParseX('{"a":1}')).resolves.toEqual({ a: 1 });
    });

    it("rejects invalid JSON instead of throwing synchronously", async () => {
        await expect(JSONParseX("{oops")).rejects.toBeInstanceOf(SyntaxError);
    });
});

describe("sanitizeForHTML", () => {
    // The real striptags is injected by the caller; a spy keeps the assertion
    // about the traversal rather than about striptags itself.
    const fakeStriptags = (value) => value.replace(/<[^>]*>/g, "");

    it("sanitizes strings nested in objects and arrays", () => {
        const input = { title: "<b>hi</b>", tags: ["<i>a</i>", "b"], count: 3 };
        expect(sanitizeForHTML(input, fakeStriptags)).toEqual({
            title: "hi",
            tags: ["a", "b"],
            count: 3,
        });
    });

    it("passes the allowed-tag set to striptags", () => {
        const spy = jest.fn(() => "clean");
        sanitizeForHTML("<b>dirty</b>", spy);
        expect(spy).toHaveBeenCalledWith("<b>dirty</b>", {
            allowedTags: expect.any(Set),
        });
    });

    it("guards against circular references", () => {
        const node = { name: "root" };
        node.self = node;
        expect(sanitizeForHTML(node, fakeStriptags)).toEqual({
            name: "root",
            self: "[circular]",
        });
    });

    it("leaves non-string primitives alone", () => {
        expect(sanitizeForHTML(42, fakeStriptags)).toBe(42);
        expect(sanitizeForHTML(null, fakeStriptags)).toBeNull();
    });
});

describe("parseSortBy", () => {
    it("maps desc to -1 and everything else to 1", () => {
        expect(parseSortBy("createdAt:desc,title:asc,level")).toEqual({
            createdAt: -1,
            title: 1,
            level: 1,
        });
    });
});

describe("getNestedValue", () => {
    it("walks a dotted path", () => {
        expect(getNestedValue({ a: { b: { c: 7 } } }, "a.b.c")).toBe(7);
    });

    it("returns undefined for a missing branch instead of throwing", () => {
        expect(getNestedValue({ a: {} }, "a.b.c")).toBeUndefined();
    });
});

describe("extractMustacheVars", () => {
    it("collects trimmed, de-duplicated variable names", () => {
        expect(extractMustacheVars("{{a}} {{ b.c }} {{a}}")).toEqual(["a", "b.c"]);
    });

    it("returns an empty array for empty input", () => {
        expect(extractMustacheVars("")).toEqual([]);
        expect(extractMustacheVars(undefined)).toEqual([]);
    });
});

describe("evaluateCondition", () => {
    const log = { level: "ERROR", context: { retries: 3, tags: ["db", "slow"] } };

    it("compares numerically for gt/gte/lt/lte", () => {
        expect(evaluateCondition(log, { field: "context.retries", operator: "gt", value: "2" })).toBe(true);
        expect(evaluateCondition(log, { field: "context.retries", operator: "gte", value: 3 })).toBe(true);
        expect(evaluateCondition(log, { field: "context.retries", operator: "lt", value: 3 })).toBe(false);
        expect(evaluateCondition(log, { field: "context.retries", operator: "lte", value: 3 })).toBe(true);
    });

    it("uses strict equality for eq", () => {
        expect(evaluateCondition(log, { field: "level", operator: "eq", value: "ERROR" })).toBe(true);
        expect(evaluateCondition(log, { field: "context.retries", operator: "eq", value: "3" })).toBe(false);
    });

    it("uses loose inequality for ne", () => {
        expect(evaluateCondition(log, { field: "level", operator: "ne", value: "INFO" })).toBe(true);
        expect(evaluateCondition(log, { field: "context.retries", operator: "ne", value: "3" })).toBe(false);
    });

    it("does case-insensitive substring matching for contains on strings", () => {
        expect(evaluateCondition(log, { field: "level", operator: "contains", value: "err" })).toBe(true);
    });

    it("does membership matching for contains on arrays", () => {
        expect(evaluateCondition(log, { field: "context.tags", operator: "contains", value: "db" })).toBe(true);
        expect(evaluateCondition(log, { field: "context.tags", operator: "contains", value: "cpu" })).toBe(false);
    });

    it("handles in / nin", () => {
        expect(evaluateCondition(log, { field: "level", operator: "in", value: ["ERROR", "FATAL"] })).toBe(true);
        expect(evaluateCondition(log, { field: "level", operator: "nin", value: ["INFO"] })).toBe(true);
    });

    it("returns false when in / nin are given a non-array", () => {
        expect(evaluateCondition(log, { field: "level", operator: "in", value: "ERROR" })).toBe(false);
        expect(evaluateCondition(log, { field: "level", operator: "nin", value: "ERROR" })).toBe(false);
    });

    it("returns false when the field is missing", () => {
        expect(evaluateCondition(log, { field: "nope", operator: "eq", value: undefined })).toBe(false);
    });

    it("returns false for an unknown operator", () => {
        expect(evaluateCondition(log, { field: "level", operator: "regex", value: ".*" })).toBe(false);
    });
});

describe("parseMustacheTemplate", () => {
    const data = { name: "Ada", ctx: { id: 42 } };

    it("interpolates into nested strings", () => {
        const template = {
            text: "Hi {{name}} ({{ ctx.id }})",
            items: ["{{name}}"],
            keep: 5,
        };
        expect(parseMustacheTemplate(template, data)).toEqual({
            text: "Hi Ada (42)",
            items: ["Ada"],
            keep: 5,
        });
    });

    it("substitutes an empty string for missing variables", () => {
        expect(parseMustacheTemplate("[{{missing}}]", data)).toBe("[]");
    });

    it("returns non-string leaves unchanged", () => {
        expect(parseMustacheTemplate(7, data)).toBe(7);
        expect(parseMustacheTemplate(null, data)).toBeNull();
    });
});

describe("isObject / isArray", () => {
    it("treats arrays and null as non-objects", () => {
        expect(isObject({})).toBe(true);
        expect(isObject([])).toBe(false);
        expect(isObject(null)).toBe(false);
    });

    it("detects arrays", () => {
        expect(isArray([])).toBe(true);
        expect(isArray({})).toBe(false);
    });
});
